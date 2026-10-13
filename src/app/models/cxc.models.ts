import { FORMAS_PAGO } from './forma-pago.models';

// Contrato provisional: el back aún no expone CxC. Pendiente de definir con
// producto el timbrado del REP al registrar un abono (automático o no, consumo
// de timbre, qué pasa si falla) y que solo entren facturas PPD vigentes; lo que
// se decida cambia AbonoDto y el response de registrarAbono.

// ── Enums (string) ───────────────────────────────────────────────────────────

/** Estado de la cuenta por cobrar — el backend lo serializa como string. */
export type EstadoCuentaPorCobrar = 'Pendiente' | 'Liquidada';

// ── Response ─────────────────────────────────────────────────────────────────

export interface CuentaPorCobrarDto {
  id:               string;
  timbradoId:       string;
  receptorId:       string;
  nombreReceptor:   string | null;
  rfcReceptor:      string | null;
  serie:            string | null;
  folio:            string | null;
  uuid:             string | null;
  fechaEmision:     string;        // ISO-8601
  total:            number;
  saldoPendiente:   number;
  numParcialidades: number;
  estado:           EstadoCuentaPorCobrar;
}

export interface AbonoDto {
  id:             string;
  numParcialidad: number;
  fechaPago:      string;        // ISO-8601
  monto:          number;
  /** Clave SAT c_FormaPago (ej. '03' = transferencia electrónica) */
  formaPago:      string;
  /** UUID del complemento de pago (REP), si ya se timbró */
  uuidRep:        string | null;
}

export interface CuentaPorCobrarDetalleDto extends CuentaPorCobrarDto {
  abonos: AbonoDto[];
}

// ── Request ─────────────────────────────────────────────────────────────────

export interface RegistrarAbonoRequest {
  /** Fecha local sin zona (yyyy-MM-ddTHH:mm:ss), como la usa el SAT — sin conversión a UTC */
  fechaPago: string;
  /** Importe a dos decimales */
  monto:     number;
  formaPago: string;
}

// ── Formulario / catálogos ───────────────────────────────────────────────────

export interface AbonoForm {
  fechaPago: string;             // yyyy-MM-dd (input type="date")
  monto:     string;
  formaPago: string;
}

export const ESTADOS_CXC: { clave: EstadoCuentaPorCobrar; descripcion: string }[] = [
  { clave: 'Pendiente', descripcion: 'Pendiente' },
  { clave: 'Liquidada', descripcion: 'Liquidada' },
];

/** Formas de pago válidas para un abono — '99' (por definir) no aplica a un pago ya recibido. */
export const FORMAS_PAGO_ABONO = FORMAS_PAGO.filter(fp => fp.clave !== '99');
