import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  CuentaPorCobrarDto,
  CuentaPorCobrarDetalleDto,
  EstadoCuentaPorCobrar,
  RegistrarAbonoRequest,
} from '../models/cxc.models';
import { KeyedCachedResource } from '../utils/cached-resource';

/**
 * Wraps the CxC (cuentas por cobrar) endpoints:
 *   GET  /api/cxc                → list with optional ?receptorId=&estado= filters
 *   GET  /api/cxc/{id}           → detalle de la cuenta con su lista de abonos
 *   POST /api/cxc/{id}/abonos    → registra un abono, devuelve el detalle actualizado
 *
 * Lists are cached per filter combination and details per id (TTL 3 min).
 * After registrarAbono(), all list buckets are invalidated (saldo / estado
 * cambian) along with the detail bucket of that cuenta.
 */
@Injectable({ providedIn: 'root' })
export class CxcService {
  private readonly api = inject(ApiService);

  private readonly _listCache    = new KeyedCachedResource<CuentaPorCobrarDto[]>(3 * 60 * 1000);
  private readonly _detalleCache = new KeyedCachedResource<CuentaPorCobrarDetalleDto>(3 * 60 * 1000);

  /**
   * Returns the cuentas por cobrar for the given filters.
   * Returns cache if fresh (TTL 3 min); set `force = true` to bypass.
   */
  list(receptorId?: string, estado?: EstadoCuentaPorCobrar, force = false): Observable<CuentaPorCobrarDto[]> {
    const key = `${receptorId ?? ''}|${estado ?? ''}`;
    const params: string[] = [];
    if (receptorId) params.push(`receptorId=${receptorId}`);
    if (estado)     params.push(`estado=${estado}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this._listCache.load(key, () => this.api.get<CuentaPorCobrarDto[]>(`/api/cxc${qs}`), force);
  }

  /** Detalle con abonos. Returns cache if fresh (TTL 3 min). */
  getById(id: string, force = false): Observable<CuentaPorCobrarDetalleDto> {
    return this._detalleCache.load(id, () => this.api.get<CuentaPorCobrarDetalleDto>(`/api/cxc/${id}`), force);
  }

  registrarAbono(id: string, request: RegistrarAbonoRequest): Observable<CuentaPorCobrarDetalleDto> {
    return this.api.post<CuentaPorCobrarDetalleDto>(`/api/cxc/${id}/abonos`, request).pipe(
      tap(() => {
        // Un abono cambia saldo y posiblemente estado → afecta todos los filtros.
        this._listCache.invalidateAll();
        this._detalleCache.invalidate(id);
      })
    );
  }
}
