import { Component, signal, inject, OnInit, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './core/services/auth';
import { BreakpointObserver, BreakpointState, Breakpoints } from '@angular/cdk/layout';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private breakpointObserver = inject(BreakpointObserver);
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('sidenav') sidenav!: MatSidenav;

  protected readonly title = signal('Inventory Manager');

  isScreenLarge$!: Observable<boolean>;
  isDrawerOpen$!: Observable<boolean>;

  userName = 'User';
  userRole = '';

  ngOnInit() {
    this.isScreenLarge$ = this.breakpointObserver
      .observe(Breakpoints.Large)
      .pipe(map((state: BreakpointState) => state.matches));

    this.isDrawerOpen$ = this.isScreenLarge$;

    this.authService.initAuth();
    this.loadUserInfo();

    // react to user signal changes so UI updates immediately after login/logout
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.userName = user?.email || user?.sub || 'User';
        this.userRole = user?.role || '';
      } else {
        const stored = this.authService.getCurrentUser();
        if (stored) {
          this.userName = stored?.email || stored?.sub || 'User';
          this.userRole = stored?.role || '';
        } else {
          this.userName = 'User';
          this.userRole = '';
        }
      }
    });
  }

  loadUserInfo() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = user?.email || user?.sub || 'User';
      this.userRole = user?.role || '';
    } else {
      this.userName = 'User';
      this.userRole = '';
    }
  }

  closeSidenavOnMobile() {
    if (!this.isScreenLarge$) {
      this.sidenav?.close();
    }
  }

  navigate(path: string) {
    this.router.navigate([`/${path}`]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
