import { Component, signal, computed, inject, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TimbradoService } from '../../services/timbrado.service';
import { TimbradoUsoDto } from '../../models/timbrado.models';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, LucideAngularModule],
  templateUrl: './shell.component.html',
})
export class ShellComponent implements OnInit {
  private readonly timbradoService = inject(TimbradoService);

  sidebarOpen  = signal(true);
  userMenuOpen = signal(false);
  mobileOpen   = signal(false);
  uso          = signal<TimbradoUsoDto | null>(null);

  readonly navItems: NavItem[] = [
    { label: 'Subir Factura',  route: '/subir',         icon: 'upload'       },
    { label: 'Clientes',       route: '/clientes',      icon: 'users'        },
    { label: 'Certificados',   route: '/certificados',  icon: 'shield-check' },
    { label: 'Timbrados',      route: '/timbrados',     icon: 'receipt-text' },
    { label: 'Cuentas por cobrar', route: '/cuentas-por-cobrar', icon: 'wallet' },
  ];

  userName = computed(() => {
    try {
      const u = JSON.parse(localStorage.getItem('timbrapp_user') ?? '{}');
      return u.nombre ?? u.email ?? 'Usuario';
    } catch { return 'Usuario'; }
  });

  userInitials = computed(() => {
    const parts = this.userName().split(' ');
    return parts.slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();
  });

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.timbradoService.getUso().subscribe({
      next: (u) => this.uso.set(u),
      error: () => { /* non-critical */ },
    });
  }

  usoPorcentaje(): number {
    const u = this.uso();
    if (!u || u.esPlanIlimitado || u.incluidos === 0) return 0;
    return Math.min(100, Math.round((u.realizados / u.incluidos) * 100));
  }

  toggleSidebar()  { this.sidebarOpen.update(v => !v); }
  toggleUserMenu() { this.userMenuOpen.update(v => !v); }

  logout(): void {
    localStorage.removeItem('timbrapp_user');
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('#user-menu-btn') && !target.closest('#user-menu')) {
      this.userMenuOpen.set(false);
    }
  }
}
