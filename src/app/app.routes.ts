import { Routes } from '@angular/router';

export const routes: Routes = [
  // Redirige raíz a login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Login — sin shell
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
  },

  // Páginas legales públicas — sin shell
  {
    path: 'privacidad',
    loadComponent: () =>
      import('./components/privacidad/privacidad.component').then(m => m.PrivacidadComponent),
  },
  {
    path: 'terminos',
    loadComponent: () =>
      import('./components/terminos/terminos.component').then(m => m.TerminosComponent),
  },

  // Vista imprimible de la documentación — sin shell (para que "Guardar como PDF"
  // no incluya el sidebar/header de la app).
  {
    path: 'documentacion/imprimir',
    loadComponent: () =>
      import('./components/documentacion/doc-imprimir.component').then(m => m.DocImprimirComponent),
  },

  // Área autenticada — shell con sidebar como layout padre
  {
    path: '',
    loadComponent: () =>
      import('./components/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'subir',
        loadComponent: () =>
          import('./components/subir/subir.component').then(m => m.SubirComponent),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./components/clientes/clientes.component').then(m => m.ClientesComponent),
      },
      {
        path: 'certificados',
        loadComponent: () =>
          import('./components/certificados/certificados.component').then(m => m.CertificadosComponent),
      },
      {
        path: 'timbrados',
        loadComponent: () =>
          import('./components/timbrados/timbrados.component').then(m => m.TimbradosComponent),
      },
      {
        path: 'cuentas-por-cobrar',
        loadComponent: () =>
          import('./components/cuentas-por-cobrar/cuentas-por-cobrar.component').then(m => m.CuentasPorCobrarComponent),
      },
      {
        path: 'cambiar-password',
        loadComponent: () =>
          import('./components/cambiar-password/cambiar-password.component').then(m => m.CambiarPasswordComponent),
      },
      {
        path: 'documentacion',
        loadComponent: () =>
          import('./components/documentacion/documentacion.component').then(m => m.DocumentacionComponent),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./components/documentacion/doc-inicio.component').then(m => m.DocInicioComponent),
          },
          {
            path: 'primeros-pasos',
            loadComponent: () =>
              import('./components/documentacion/doc-primeros-pasos.component').then(m => m.DocPrimerosPasosComponent),
          },
          {
            path: 'ingreso',
            loadComponent: () =>
              import('./components/documentacion/doc-ingreso.component').then(m => m.DocIngresoComponent),
          },
          {
            path: 'egreso',
            loadComponent: () =>
              import('./components/documentacion/doc-egreso.component').then(m => m.DocEgresoComponent),
          },
          {
            path: 'pago',
            loadComponent: () =>
              import('./components/documentacion/doc-pago.component').then(m => m.DocPagoComponent),
          },
          {
            path: 'traslado',
            loadComponent: () =>
              import('./components/documentacion/doc-traslado.component').then(m => m.DocTrasladoComponent),
          },
          {
            path: 'nomina',
            loadComponent: () =>
              import('./components/documentacion/doc-nomina.component').then(m => m.DocNominaComponent),
          },
          {
            path: 'preguntas-frecuentes',
            loadComponent: () =>
              import('./components/documentacion/doc-faq.component').then(m => m.DocFaqComponent),
          },
          {
            path: 'glosario',
            loadComponent: () =>
              import('./components/documentacion/doc-glosario.component').then(m => m.DocGlosarioComponent),
          },
        ],
      },
      { path: '', redirectTo: 'subir', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
