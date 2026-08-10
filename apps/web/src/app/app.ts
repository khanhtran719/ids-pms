import { Component, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthSessionService } from './core/auth-session.service';
import { AuthSessionStore } from './core/auth-session.store';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthSessionStore);

  protected logout(): void {
    this.session.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }
}
