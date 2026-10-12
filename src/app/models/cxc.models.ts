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
  fechaPago: string;             // ISO-8601
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

export const FORMAS_PAGO_ABONO: { clave: string; descripcion: string }[] = [
  { clave: '01', descripcion: '01 - Efectivo' },
  { clave: '02', descripcion: '02 - Cheque nominativo' },
  { clave: '03', descripcion: '03 - Transferencia electrónica' },
  { clave: '04', descripcion: '04 - Tarjeta de crédito' },
  { clave: '28', descripcion: '28 - Tarjeta de débito' },
];
