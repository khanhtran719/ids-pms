import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UnauthorizedPage } from './unauthorized.page';

describe('UnauthorizedPage', () => {
  it('explains the denial and offers a dashboard route', async () => {
    await TestBed.configureTestingModule({
      imports: [UnauthorizedPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(UnauthorizedPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('403');
    expect(fixture.nativeElement.textContent).toContain('chưa được cấp quyền');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe(
      '/dashboard',
    );
  });
});
