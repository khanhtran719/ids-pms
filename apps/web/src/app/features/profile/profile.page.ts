import { Component, inject } from '@angular/core';
import { AuthSessionStore } from '../../core/auth-session.store';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage {
  protected readonly auth = inject(AuthSessionStore);
}
