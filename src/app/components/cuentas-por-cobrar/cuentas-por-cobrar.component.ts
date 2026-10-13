import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CxcService } from '../../services/cxc.service';
import { ClienteService } from '../../services/cliente.service';
import {
  AbonoForm,
  CuentaPorCobrarDto,
  CuentaPorCobrarDetalleDto,
  EstadoCuentaPorCobrar,
  ESTADOS_CXC,
  FORMAS_PAGO_ABONO,
} from '../../models/cxc.models';
import { formatHttpError, parseHttpError, ParsedError } from '../../utils/http-error.utils';

@Component({
  selector: 'app-cuentas-por-cobrar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './cuentas-por-cobrar.component.html',
})
export class CuentasPorCobrarComponent implements OnInit {
  private readonly cxcService     = inject(CxcService);
  private readonly clienteService = inject(ClienteService);

  readonly estados    = ESTADOS_CXC;
  readonly formasPago = FORMAS_PAGO_ABONO;
  readonly clientes   = this.clienteService.clientes;

  cuentas     = signal<CuentaPorCobrarDto[]>([]);
  loading     = signal(true);
  error       = signal<string | null>(null);

  filterReceptor = signal<string>('');
  filterEstado   = signal<string>('');

  // ── Detalle ────────────────────────────────────────────────────────────────
  selectedId     = signal<string | null>(null);
  detalle        = signal<CuentaPorCobrarDetalleDto | null>(null);
  loadingDetalle = signal(false);
  detalleError   = signal<string | null>(null);

  // ── Registrar abono ────────────────────────────────────────────────────────
  showAbonoForm = signal(false);
  saving        = signal(false);
  abonoError    = signal<ParsedError | null>(null);
  abonoOk       = signal(false);

  form = signal<AbonoForm>({ fechaPago: this.hoy(), monto: '', formaPago: '03' });

  ngOnInit(): void {
    this.loadCuentas();
    this.clienteService.list().subscribe({
      error: () => { /* non-critical, el filtro por receptor queda vacío */ },
    });
  }

  loadCuentas(force = false): void {
    this.loading.set(true);
    this.error.set(null);

    const receptorId = this.filterReceptor() || undefined;
    const estado     = (this.filterEstado() || undefined) as EstadoCuentaPorCobrar | undefined;

    this.cxcService.list(receptorId, estado, force).subscribe({
      next: (list) => {
        this.cuentas.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(formatHttpError(err, 'Error al cargar las cuentas por cobrar.'));
        this.loading.set(false);
      },
    });
  }

  clearFilters(): void {
    this.filterReceptor.set('');
    this.filterEstado.set('');
    this.loadCuentas();
  }

  // ── Detalle ────────────────────────────────────────────────────────────────

  verDetalle(c: CuentaPorCobrarDto, force = false): void {
    this.selectedId.set(c.id);
    this.detalle.set(null);
    this.detalleError.set(null);
    this.loadingDetalle.set(true);
    this.closeAbonoForm();
    this.abonoOk.set(false);

    // Bajo lg el detalle queda debajo del listado — lo acerca al viewport.
    setTimeout(() => document.getElementById('cxc-detalle')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));

    this.cxcService.getById(c.id, force).subscribe({
      next: (d) => {
        // Ignora respuestas de una selección anterior.
        if (this.selectedId() !== d.id) return;
        this.detalle.set(d);
        this.loadingDetalle.set(false);
      },
      error: (err) => {
        if (this.selectedId() !== c.id) return;
        this.detalleError.set(formatHttpError(err, 'Error al cargar el detalle de la factura.'));
        this.loadingDetalle.set(false);
      },
    });
  }

  cerrarDetalle(): void {
    if (this.saving()) return;
    this.selectedId.set(null);
    this.detalle.set(null);
    this.detalleError.set(null);
    this.loadingDetalle.set(false);
    this.closeAbonoForm();
    this.abonoOk.set(false);
  }

  // ── Registrar abono ────────────────────────────────────────────────────────

  openAbonoForm(): void {
    this.form.set({ fechaPago: this.hoy(), monto: '', formaPago: '03' });
    this.abonoError.set(null);
    this.abonoOk.set(false);
    this.showAbonoForm.set(true);
  }

  closeAbonoForm(): void {
    if (this.saving()) return;
    this.showAbonoForm.set(false);
    this.abonoError.set(null);
  }

  registrarAbono(): void {
    const d = this.detalle();
    if (!d || this.saving()) return;

    const f     = this.form();
    const monto = parseFloat(f.monto);

    if (!f.fechaPago || !f.formaPago || !f.monto) {
      this.abonoError.set({ message: 'Completa fecha de pago, monto y forma de pago.', details: [] });
      return;
    }
    // Comparación lexicográfica: ambas fechas van en yyyy-MM-dd.
    if (f.fechaPago > this.hoy()) {
      this.abonoError.set({ message: 'La fecha de pago no puede ser futura.', details: [] });
      return;
    }
    if (f.fechaPago < this.fechaMinAbono(d)) {
      this.abonoError.set({
        message: `La fecha de pago no puede ser anterior a la emisión de la factura (${this.formatDate(d.fechaEmision)}).`,
        details: [],
      });
      return;
    }
    // El REP se timbra con importes a dos decimales.
    if (!/^\d+(\.\d{1,2})?$/.test(f.monto.trim())) {
      this.abonoError.set({ message: 'Captura un monto válido con máximo dos decimales.', details: [] });
      return;
    }
    if (monto <= 0) {
      this.abonoError.set({ message: 'El monto debe ser mayor a cero.', details: [] });
      return;
    }
    // En centavos para no depender de la precisión de punto flotante.
    if (Math.round(monto * 100) > Math.round(d.saldoPendiente * 100)) {
      this.abonoError.set({
        message: `El monto no puede exceder el saldo pendiente (${this.formatCurrency(d.saldoPendiente)}).`,
        details: [],
      });
      return;
    }

    this.saving.set(true);
    this.abonoError.set(null);

    this.cxcService.registrarAbono(d.id, {
      fechaPago: `${f.fechaPago}T12:00:00`,
      monto,
      formaPago: f.formaPago,
    }).subscribe({
      next: (updated) => {
        const { abonos, ...cuenta } = updated;
        this.cuentas.update(list => list.map(x => x.id === updated.id ? cuenta : x));
        this.detalle.set(updated);
        this.saving.set(false);
        this.showAbonoForm.set(false);
        this.abonoOk.set(true);
      },
      error: (err) => {
        this.abonoError.set(parseHttpError(err, 'Error al registrar el abono.'));
        this.saving.set(false);
      },
    });
  }

  updateField(field: keyof AbonoForm, event: Event): void {
    this.form.update(f => ({ ...f, [field]: (event.target as HTMLInputElement).value }));
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  formatCurrency(val: number | null): string {
    if (val === null || val === undefined) return '—';
    return val.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-MX', { dateStyle: 'short' });
    } catch { return iso; }
  }

  serieFolio(c: CuentaPorCobrarDto): string {
    return [c.serie, c.folio].filter(Boolean).join('-') || '—';
  }

  estadoBadgeCls(e: EstadoCuentaPorCobrar | null): string {
    switch (e) {
      case 'Pendiente': return 'bg-amber-100 text-amber-700';
      case 'Liquidada': return 'bg-emerald-100 text-emerald-700';
      default:          return 'bg-slate-100 text-slate-500';
    }
  }

  formaPagoLabel(clave: string): string {
    const fp = this.formasPago.find(x => x.clave === clave);
    return fp ? `${fp.clave} — ${fp.desc}` : clave;
  }

  onReceptorInput(e: Event) { this.filterReceptor.set((e.target as HTMLSelectElement).value); }
  onEstadoInput(e: Event)   { this.filterEstado.set((e.target as HTMLSelectElement).value);   }

  /** Fecha local de hoy en yyyy-MM-dd — tope máximo de la fecha de pago. */
  hoy(): string { return this.toFechaLocal(new Date()); }

  /** Fecha local de emisión en yyyy-MM-dd — tope mínimo de la fecha de pago. */
  fechaMinAbono(c: CuentaPorCobrarDto): string { return this.toFechaLocal(new Date(c.fechaEmision)); }

  private toFechaLocal(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}
