import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LucideAngularModule, Wallet, RefreshCw, Funnel, Plus, Eye, X } from 'lucide-angular';
import { CuentasPorCobrarComponent } from './cuentas-por-cobrar.component';
import { CuentaPorCobrarDto, CuentaPorCobrarDetalleDto } from '../../models/cxc.models';
import { Cliente } from '../../models/cliente.models';
import { environment } from '../../../environments/environment';

const API = environment.apiBaseUrl;

const CLIENTES: Cliente[] = [
  { id: 'r-1', rfc: 'AAA010101AAA', nombre: 'ACME SA DE CV', domicilioFiscal: '64000',
    regimenFiscal: '601', usoCfdiDefault: 'G01', isActive: true },
];

const CUENTAS: CuentaPorCobrarDto[] = [
  { id: 'c-1', timbradoId: 't-1', receptorId: 'r-1', nombreReceptor: 'ACME SA DE CV', rfcReceptor: 'AAA010101AAA',
    serie: 'A', folio: '101', uuid: '11111111-aaaa-bbbb-cccc-000000000001', fechaEmision: '2026-09-01T12:00:00Z',
    total: 1000, saldoPendiente: 600, numParcialidades: 1, estado: 'Pendiente' },
  { id: 'c-2', timbradoId: 't-2', receptorId: 'r-1', nombreReceptor: 'ACME SA DE CV', rfcReceptor: 'AAA010101AAA',
    serie: null, folio: null, uuid: null, fechaEmision: '2026-08-15T12:00:00Z',
    total: 500, saldoPendiente: 0, numParcialidades: 2, estado: 'Liquidada' },
];

const DETALLE: CuentaPorCobrarDetalleDto = {
  ...CUENTAS[0],
  abonos: [
    { id: 'a-1', numParcialidad: 1, fechaPago: '2026-09-10T12:00:00Z', monto: 400, formaPago: '03',
      uuidRep: '99999999-aaaa-bbbb-cccc-000000000009' },
  ],
};

describe('CuentasPorCobrarComponent', () => {
  let fixture: ComponentFixture<CuentasPorCobrarComponent>;
  let component: CuentasPorCobrarComponent;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuentasPorCobrarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(LucideAngularModule.pick({ Wallet, RefreshCw, Funnel, Plus, Eye, X })),
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(CuentasPorCobrarComponent);
    component = fixture.componentInstance;
    http      = TestBed.inject(HttpTestingController);
    el        = fixture.nativeElement;
  });

  afterEach(() => http.verify());

  /** Dispara ngOnInit y responde las cargas iniciales (listado + clientes). */
  function init(cuentas: CuentaPorCobrarDto[] = CUENTAS): void {
    fixture.detectChanges();
    http.expectOne(`${API}/api/cxc`).flush(cuentas);
    http.expectOne(`${API}/api/clientes`).flush(CLIENTES);
    fixture.detectChanges();
  }

  function abrirDetalle(detalle: CuentaPorCobrarDetalleDto = DETALLE): void {
    component.verDetalle(CUENTAS[0]);
    http.expectOne(`${API}/api/cxc/c-1`).flush(detalle);
    fixture.detectChanges();
  }

  function rows(): HTMLTableRowElement[] {
    return Array.from(el.querySelectorAll<HTMLTableRowElement>('table tbody tr'));
  }

  // ── Listado ────────────────────────────────────────────────────────────────

  it('muestra el listado con las columnas de la cuenta', () => {
    init();

    expect(rows().length).toBe(2);
    const texto = rows()[0].textContent ?? '';
    expect(texto).toContain('ACME SA DE CV');
    expect(texto).toContain('A-101');
    expect(texto).toContain('11111111');
    expect(texto).toContain(component.formatDate(CUENTAS[0].fechaEmision));
    expect(texto).toContain(component.formatCurrency(1000));
    expect(texto).toContain(component.formatCurrency(600));
    expect(texto).toContain('Pendiente');
    expect(rows()[1].textContent).toContain('Liquidada');
  });

  it('muestra el estado vacío cuando no hay cuentas', () => {
    init([]);

    expect(el.querySelector('#cxc-vacio')).not.toBeNull();
    expect(el.querySelector('table')).toBeNull();
  });

  it('muestra el error normalizado si falla la carga del listado', () => {
    fixture.detectChanges();
    http.expectOne(`${API}/api/cxc`).flush(
      { error: 'Configure su licencia antes de consultar.' },
      { status: 400, statusText: 'Bad Request' },
    );
    http.expectOne(`${API}/api/clientes`).flush(CLIENTES);
    fixture.detectChanges();

    expect(el.querySelector('#cxc-error')?.textContent).toContain('Configure su licencia antes de consultar.');
  });

  it('filtra por receptor y estado', () => {
    init();

    const receptor = el.querySelector<HTMLSelectElement>('#filtro-receptor')!;
    const estado   = el.querySelector<HTMLSelectElement>('#filtro-estado')!;
    expect(receptor.options.length).toBe(2);   // Todos + ACME

    receptor.value = 'r-1';
    receptor.dispatchEvent(new Event('change'));
    estado.value = 'Pendiente';
    estado.dispatchEvent(new Event('change'));
    el.querySelector<HTMLButtonElement>('#btn-filtrar')!.click();

    http.expectOne(`${API}/api/cxc?receptorId=r-1&estado=Pendiente`).flush([CUENTAS[0]]);
    fixture.detectChanges();

    expect(rows().length).toBe(1);
  });

  // ── Detalle ────────────────────────────────────────────────────────────────

  it('muestra el detalle con la lista de abonos', () => {
    init();

    rows()[0].querySelector<HTMLButtonElement>('button')!.click();
    http.expectOne(`${API}/api/cxc/c-1`).flush(DETALLE);
    fixture.detectChanges();

    const detalle = el.querySelector('#cxc-detalle')!;
    const abonos  = detalle.querySelectorAll('table tbody tr');
    expect(abonos.length).toBe(1);
    expect(abonos[0].textContent).toContain(component.formatDate('2026-09-10T12:00:00Z'));
    expect(abonos[0].textContent).toContain(component.formatCurrency(400));
    expect(abonos[0].textContent).toContain('03 - Transferencia electrónica');
    expect(abonos[0].textContent).toContain('99999999');
  });

  it('indica cuando la factura aún no tiene abonos', () => {
    init();
    abrirDetalle({ ...DETALLE, abonos: [] });

    expect(el.querySelector('#abonos-vacio')).not.toBeNull();
  });

  it('no permite registrar abonos en una cuenta liquidada', () => {
    init();
    abrirDetalle({ ...DETALLE, saldoPendiente: 0, estado: 'Liquidada' });

    expect(el.querySelector('#btn-abrir-abono')).toBeNull();
  });

  // ── Registrar abono ────────────────────────────────────────────────────────

  function llenarAbono(monto: string): void {
    el.querySelector<HTMLButtonElement>('#btn-abrir-abono')!.click();
    fixture.detectChanges();

    const fecha = el.querySelector<HTMLInputElement>('#abono-fecha')!;
    fecha.value = '2026-10-01';
    fecha.dispatchEvent(new Event('input'));
    const input = el.querySelector<HTMLInputElement>('#abono-monto')!;
    input.value = monto;
    input.dispatchEvent(new Event('input'));
    const forma = el.querySelector<HTMLSelectElement>('#abono-forma-pago')!;
    forma.value = '01';
    forma.dispatchEvent(new Event('change'));

    el.querySelector<HTMLButtonElement>('#btn-guardar-abono')!.click();
    fixture.detectChanges();
  }

  it('registra un abono y actualiza saldo, estado y listado', () => {
    init();
    abrirDetalle();
    llenarAbono('600');

    const req = http.expectOne(`${API}/api/cxc/c-1/abonos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.monto).toBe(600);
    expect(req.request.body.formaPago).toBe('01');
    expect(req.request.body.fechaPago).toBe(new Date('2026-10-01T12:00:00').toISOString());

    req.flush({
      ...DETALLE,
      saldoPendiente: 0,
      numParcialidades: 2,
      estado: 'Liquidada',
      abonos: [
        ...DETALLE.abonos,
        { id: 'a-2', numParcialidad: 2, fechaPago: '2026-10-01T18:00:00Z', monto: 600, formaPago: '01', uuidRep: null },
      ],
    } as CuentaPorCobrarDetalleDto);
    fixture.detectChanges();

    expect(el.querySelector('#form-abono')).toBeNull();
    expect(el.querySelector('#abono-ok')).not.toBeNull();
    expect(el.querySelector('#detalle-saldo')?.textContent).toContain(component.formatCurrency(0));
    expect(el.querySelectorAll('#cxc-detalle table tbody tr').length).toBe(2);
    expect(rows()[0].textContent).toContain('Liquidada');
    expect(component.cuentas()[0].saldoPendiente).toBe(0);
  });

  it('valida el monto contra el saldo pendiente sin llamar a la API', () => {
    init();
    abrirDetalle();
    llenarAbono('600.01');

    http.expectNone(`${API}/api/cxc/c-1/abonos`);
    expect(el.querySelector('#abono-error')?.textContent).toContain('saldo pendiente');
  });

  it('muestra los errores de la API normalizados (ModelState)', () => {
    init();
    abrirDetalle();
    llenarAbono('100');

    http.expectOne(`${API}/api/cxc/c-1/abonos`).flush(
      { Message: 'La solicitud no es válida.', ModelState: { 'request.Monto': ['El monto excede el saldo.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    const error = el.querySelector('#abono-error')!;
    expect(error.textContent).toContain('La solicitud no es válida.');
    expect(error.textContent).toContain('Monto: El monto excede el saldo.');
    expect(el.querySelector('#form-abono')).not.toBeNull();
    expect(component.saving()).toBeFalse();
  });
});
