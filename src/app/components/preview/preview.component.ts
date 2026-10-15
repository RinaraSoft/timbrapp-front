import { Component, effect, input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExtractResult, CfdiFields, Concepto, DoctoRelacionadoPago } from '../../models/cfdi.models';
import { Cliente, USOS_CFDI } from '../../models/cliente.models';
import { LicenciaDto, LicenciaService } from '../../services/licencia.service';
import { ConceptosTableComponent } from '../conceptos-table/conceptos-table.component';
import { ConceptosEditModalComponent } from '../conceptos-edit-modal/conceptos-edit-modal.component';
import { ColumnDef } from '../../models/table-column.models';
import { FORMAS_PAGO } from '../../models/forma-pago.models';

/** Column set for tipoDeComprobante I/E — reused by ConceptosTableComponent. */
const CONCEPTO_COLUMNS: ColumnDef[] = [
  { key: 'descripcion', header: 'Descripción', type: 'text', sortable: true, searchable: true,
    width: '220px', placeholder: 'Descripción', subKey: 'claveProdServ', subPlaceholder: 'Clave SAT' },
  { key: 'cantidad', header: 'Cant.', type: 'number', sortable: true, align: 'center', width: '70px', step: 0.001 },
  { key: 'unidad', header: 'Unidad', type: 'text', sortable: true, align: 'center', width: '90px',
    placeholder: 'Unid.', subKey: 'claveUnidad', subPlaceholder: 'Clave' },
  { key: 'valorUnitario', header: 'P. Unit.', type: 'currency', sortable: true, align: 'right', width: '100px' },
  { key: 'importe', header: 'Importe', type: 'currency', sortable: true, align: 'right', width: '100px' },
];

/** Column set for tipoDeComprobante P — documentos relacionados del complemento de pago. */
const DOCTO_PAGO_COLUMNS: ColumnDef[] = [
  { key: 'uuid', header: 'UUID', type: 'text', sortable: true, searchable: true, width: '220px', placeholder: 'UUID del CFDI' },
  { key: 'serie', header: 'Serie', type: 'text', sortable: true, searchable: true, width: '70px' },
  { key: 'folio', header: 'Folio', type: 'text', sortable: true, searchable: true, width: '70px' },
  { key: 'numParcialidad', header: 'Parcialidad', type: 'number', sortable: true, align: 'center', width: '90px' },
  { key: 'impSaldoAnt', header: 'Saldo ant.', type: 'currency', sortable: true, align: 'right', width: '100px' },
  { key: 'impPagado', header: 'Pagado', type: 'currency', sortable: true, align: 'right', width: '100px' },
  { key: 'impSaldoInsoluto', header: 'Saldo insoluto', type: 'currency', sortable: true, align: 'right', width: '110px' },
];

type IvaRate = '16' | '8' | '0';

const TIPOS_RELACION = [
  { clave: '01', desc: 'Nota de crédito de los documentos relacionados' },
  { clave: '02', desc: 'Nota de débito de los documentos relacionados' },
  { clave: '03', desc: 'Devolución de mercancía sobre facturas o traslados previos' },
  { clave: '04', desc: 'Sustitución de los CFDI previos' },
  { clave: '05', desc: 'Traslados de mercancías facturados previamente' },
  { clave: '06', desc: 'Factura generada por los traslados previos' },
  { clave: '07', desc: 'CFDI por aplicación de anticipo' },
];

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, ConceptosTableComponent, ConceptosEditModalComponent],
  templateUrl: './preview.component.html',
})
export class PreviewComponent implements OnInit {
  private readonly licenciaService = inject(LicenciaService);

  result  = input.required<ExtractResult>();
  cliente = input<Cliente | null>(null);

  licencia          = signal<LicenciaDto | null>(null);
  conceptosModalOpen = signal(false);
  pagoModalOpen       = signal(false);
  /** Open by default when a result carries warnings — closable/reopenable via the floating badge. */
  warningsOpen      = signal(true);
  ivaRate           = signal<IvaRate>('16');
  isrRatePct        = signal<string>('');
  usoCfdiOverride   = signal<string>('G01');

  draft: CfdiFields | null = null;

  readonly usosCfdi     = USOS_CFDI;
  readonly formasPago   = FORMAS_PAGO;
  readonly tiposRelacion = TIPOS_RELACION;
  readonly conceptoColumns   = CONCEPTO_COLUMNS;
  readonly doctoPagoColumns  = DOCTO_PAGO_COLUMNS;

  constructor() {
    effect(() => {
      const fields = this.result().cfdiFields;
      if (fields) {
        this.draft = structuredClone(fields);
        this.draft.fecha = this.normalizeFecha(fields.fecha);
      } else {
        this.draft = null;
      }
      this.conceptosModalOpen.set(false);
      this.pagoModalOpen.set(false);
      this.warningsOpen.set(true);
      if (fields) this.initRatesFromFields(fields);
    });

    effect(() => {
      const c = this.cliente();
      if (c) this.usoCfdiOverride.set(c.usoCfdiDefault);
    });
  }

  ngOnInit(): void {
    this.licenciaService.getLicencia().subscribe(l => {
      this.licencia.set(l)
      this.draft!.lugarExpedicion = this.licencia()!.domicilioFiscal
    });
  }

  private initRatesFromFields(fields: CfdiFields): void {
    const subtotal = parseFloat(fields.subTotal ?? '0');
    if (subtotal <= 0) return;

    const iva = parseFloat(fields.totalImpuestosTrasladados ?? '0');
    const ivaRatio = iva / subtotal;
    if (Math.abs(ivaRatio - 0.08) < 0.01) this.ivaRate.set('8');
    else if (ivaRatio < 0.01)             this.ivaRate.set('0');
    else                                   this.ivaRate.set('16');

    const isr = parseFloat(fields.totalImpuestosRetenidos ?? '0');
    this.isrRatePct.set(
      isr > 0 ? ((isr / subtotal) * 100).toFixed(4).replace(/\.?0+$/, '') : ''
    );
  }

  onFechaChange(date: string): void {
    if (!this.draft) return;
    this.draft.fecha = this.normalizeFecha(date);
  }

  private normalizeFecha(raw: string | null | undefined): string {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const time = `T${hh}:${mm}:${ss}`;

    if (!raw) return `${this.todayLocal()}${time}`;

    const datePart = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return `${datePart}${time}`;
    return `${this.todayLocal()}${time}`;
  }

  private todayLocal(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ── Conceptos edit (modal) ───────────────────────────────────────────────
  // The main screen only ever shows a read-only ConceptosTableComponent; all
  // editing happens on a working copy inside ConceptosEditModalComponent, which
  // is only applied to `draft` when the user confirms.

  blankConcepto = (): Concepto => ({
    claveProdServ: null, noIdentificacion: null, cantidad: 1,
    claveUnidad: null, unidad: null, descripcion: null,
    valorUnitario: 0, importe: 0, descuento: null,
  });

  openConceptosModal(): void { this.conceptosModalOpen.set(true); }
  closeConceptosModal(): void { this.conceptosModalOpen.set(false); }

  confirmConceptosModal(rows: Concepto[]): void {
    if (!this.draft) return;
    this.draft.conceptos = rows;
    this.recalcTotals();
    this.conceptosModalOpen.set(false);
  }

  /** Live importe recompute while editing inside the modal — mutates the row
   * object in place (same reference the modal's working copy holds), so the
   * modal's table reflects it immediately without touching `draft` before Confirm. */
  onConceptosModalCellChange(event: { row: Concepto; key: string }): void {
    if (event.key === 'cantidad' || event.key === 'valorUnitario') {
      event.row.importe = parseFloat(((event.row.cantidad ?? 0) * (event.row.valorUnitario ?? 0)).toFixed(2));
    }
  }

  setIvaRate(rate: IvaRate): void {
    this.ivaRate.set(rate);
    if (this.draft) this.recalcTotals();
  }

  onIsrInput(event: Event): void {
    this.isrRatePct.set((event.target as HTMLInputElement).value);
    if (this.draft) this.recalcTotals();
  }

  private recalcTotals(): void {
    if (!this.draft) return;
    const subtotal = this.draft.conceptos.reduce((s, c) => s + (c.importe ?? 0), 0);
    this.draft.subTotal = subtotal.toFixed(2);

    const ivaMul = ({ '16': 0.16, '8': 0.08, '0': 0 } as Record<IvaRate, number>)[this.ivaRate()];
    const iva    = parseFloat((subtotal * ivaMul).toFixed(2));
    this.draft.totalImpuestosTrasladados = ivaMul > 0 ? iva.toFixed(2) : null;

    // Populate the structured IVA entry so the backend reads the correct rate at timbrado time.
    // (Mirrors the same pattern used for impuestosRetenidos / ISR.)
    this.draft.impuestosTrasladados = ivaMul > 0
      ? [{
          base:       subtotal.toFixed(2),
          impuesto:   '002',
          tipoFactor: 'Tasa',
          tasaOCuota: ivaMul.toFixed(6),
          importe:    iva.toFixed(2),
        }]
      : [];

    const isrPct = parseFloat(this.isrRatePct());
    const isr    = !isNaN(isrPct) && isrPct > 0
      ? parseFloat((subtotal * isrPct / 100).toFixed(2))
      : 0;
    this.draft.totalImpuestosRetenidos = isr > 0 ? isr.toFixed(2) : null;

    // Populate the structured ISR entry that the backend reads at timbrado time.
    // CfdiBuilderService reads isrRate from impuestosRetenidos[impuesto=="001"].tasaOCuota;
    // without this, ISR is silently dropped from the stamped CFDI total.
    this.draft.impuestosRetenidos = isr > 0
      ? [{
          base:       subtotal.toFixed(2),
          impuesto:   '001',
          tipoFactor: 'Tasa',
          tasaOCuota: (isrPct / 100).toFixed(6),
          importe:    isr.toFixed(2),
        }]
      : (this.draft.impuestosRetenidos ?? []).filter(r => r.impuesto !== '001');

    this.draft.total = (subtotal + iva - isr).toFixed(2);
  }

  /** Called by SubirComponent at timbrar time to get latest edited state. */
  getCurrentFields(): CfdiFields | null {
    if (!this.draft) return null;
    return { ...this.draft, usoCfdi: this.usoCfdiOverride() };
  }

  // ── Tipo de comprobante (I/E/T/N/P) ──────────────────────────────────────

  onTipoChange(tipo: string): void {
    if (!this.draft) return;
    this.draft.tipoDeComprobante = tipo;

    if (tipo === 'P' && !this.draft.pago) {
      this.draft.pago = {
        fechaPago: this.todayLocal(),
        formaDePagoP: '03',
        monto: 0,
        numOperacion: null,
        doctosRelacionados: [],
      };
    }
  }

  // ── Egreso — CFDI relacionados ───────────────────────────────────────────

  relacionadosText(): string {
    return (this.draft?.cfdiRelacionados ?? []).join(', ');
  }

  onRelacionadosChange(value: string): void {
    if (!this.draft) return;
    const uuids = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    this.draft.cfdiRelacionados = uuids.length > 0 ? uuids : null;
  }

  // ── Pago — complemento REP (modal) ───────────────────────────────────────

  blankDoctoRelacionado = (): DoctoRelacionadoPago => ({
    uuid: null, serie: null, folio: null, moneda: 'MXN', numParcialidad: '1',
    impSaldoAnt: 0, impPagado: 0, impSaldoInsoluto: 0, metodoPagoDR: 'PPD', objetoImpDR: '02',
  });

  openPagoModal(): void { this.pagoModalOpen.set(true); }
  closePagoModal(): void { this.pagoModalOpen.set(false); }

  confirmPagoModal(rows: DoctoRelacionadoPago[]): void {
    if (!this.draft?.pago) return;
    this.draft.pago.doctosRelacionados = rows;
    this.pagoModalOpen.set(false);
  }

  // ── Display helpers ───────────────────────────────────────────────────────

  formatCurrency(val: string | number | null): string {
    if (val === null || val === undefined || val === '') return '—';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return String(val);
    return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  ivaLabel(): string {
    const map: Record<IvaRate, string> = {
      '16': 'IVA (16%)',
      '8':  'IVA Fronterizo (8%)',
      '0':  'Sin IVA (0%)',
    };
    return map[this.ivaRate()];
  }
}
