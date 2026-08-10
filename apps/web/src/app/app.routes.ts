import { Route } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/auth.guards';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.page').then((module) => module.LoginPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then(
        (module) => module.DashboardPage,
      ),
  },
  {
    path: 'projects',
    canActivate: [authGuard, permissionGuard('projects.read')],
    loadComponent: () =>
      import('./features/projects/projects.page').then(
        (module) => module.ProjectsPage,
      ),
  },
  {
    path: 'projects/:projectId',
    canActivate: [authGuard, permissionGuard('projects.read')],
    loadComponent: () =>
      import('./features/projects/project-detail.page').then(
        (module) => module.ProjectDetailPage,
      ),
  },
  {
    path: 'tasks',
    canActivate: [authGuard, permissionGuard('tasks.read')],
    loadComponent: () =>
      import('./features/tasks/tasks.page').then(
        (module) => module.TasksPage,
      ),
  },
  {
    path: 'users',
    canActivate: [authGuard, permissionGuard('users.read')],
    loadComponent: () =>
      import('./features/users/users.page').then((module) => module.UsersPage),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.page').then(
        (module) => module.ProfilePage,
      ),
  },
  {
    path: 'unauthorized',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/unauthorized.page').then(
        (module) => module.UnauthorizedPage,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
