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
    canActivate: [
      authGuard,
      permissionGuard('projects.read'),
      permissionGuard('tasks.read'),
      permissionGuard('carrier-contracts.read'),
      permissionGuard('revenue.read'),
    ],
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
      import('./features/tasks/tasks.page').then((module) => module.TasksPage),
  },
  {
    path: 'data-quality',
    canActivate: [
      authGuard,
      permissionGuard('projects.read'),
      permissionGuard('tasks.read'),
    ],
    loadComponent: () =>
      import('./features/data-quality/data-quality.page').then(
        (module) => module.DataQualityPage,
      ),
  },
  {
    path: 'carrier-contracts',
    canActivate: [
      authGuard,
      permissionGuard('projects.read'),
      permissionGuard('carrier-contracts.read'),
    ],
    loadComponent: () =>
      import('./features/carrier-contracts/carrier-contracts.page').then(
        (module) => module.CarrierContractsPage,
      ),
  },
  {
    path: 'revenue',
    canActivate: [
      authGuard,
      permissionGuard('projects.read'),
      permissionGuard('revenue.read'),
    ],
    loadComponent: () =>
      import('./features/revenue/revenue.page').then(
        (module) => module.RevenuePage,
      ),
  },
  {
    path: 'payback',
    canActivate: [
      authGuard,
      permissionGuard('projects.read'),
      permissionGuard('revenue.read'),
    ],
    loadComponent: () =>
      import('./features/payback/payback.page').then(
        (module) => module.PaybackPage,
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
