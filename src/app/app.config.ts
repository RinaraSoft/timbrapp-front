import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  LucideAngularModule,
  Upload,
  Users,
  ShieldCheck,
  ReceiptText,
  ChevronsLeft,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Settings,
  UserRound,
  KeyRound,
  BookOpen,
  Download,
  ArrowRight,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  Truck,
  UserCog,
  HelpCircle,
  ListChecks,
  Wallet,
  RefreshCw,
  Funnel,
  Plus,
  Eye,
} from 'lucide-angular';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    importProvidersFrom(
      LucideAngularModule.pick({
        Upload,
        Users,
        ShieldCheck,
        ReceiptText,
        ChevronsLeft,
        Menu,
        X,
        LogOut,
        ChevronDown,
        Settings,
        UserRound,
        KeyRound,
        BookOpen,
        Download,
        ArrowRight,
        ArrowUpCircle,
        ArrowDownCircle,
        CheckCircle2,
        Truck,
        UserCog,
        HelpCircle,
        ListChecks,
        Wallet,
        RefreshCw,
        Funnel,
        Plus,
        Eye,
      })
    ),
  ],
};
