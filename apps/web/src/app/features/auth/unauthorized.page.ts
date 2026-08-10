import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized-page',
  imports: [RouterLink],
  template: `
    <section class="empty-state" aria-labelledby="unauthorized-title">
      <span aria-hidden="true">403</span>
      <p>Quyền truy cập</p>
      <h1 id="unauthorized-title">Bạn chưa được cấp quyền cho khu vực này.</h1>
      <p>Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.</p>
      <a routerLink="/dashboard">Quay lại tổng quan</a>
    </section>
  `,
  styles: [
    `
      :host {
        display: grid;
        min-height: 65dvh;
        place-items: center;
      }
      .empty-state {
        max-width: 34rem;
        text-align: center;
      }
      .empty-state > span {
        display: inline-grid;
        min-width: 3rem;
        place-items: center;
        border-radius: 999px;
        padding: 0.45rem 0.7rem;
        color: #9a6620;
        background: #fff1d8;
        font-size: 0.75rem;
        font-weight: 800;
      }
      .empty-state > p:first-of-type {
        margin: 1.5rem 0 0.5rem;
        color: #148266;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        color: #1d2d29;
        font-size: clamp(1.8rem, 5vw, 3rem);
        letter-spacing: -0.045em;
      }
      h1 + p {
        color: #6f7b77;
        line-height: 1.6;
      }
      a {
        display: inline-block;
        margin-top: 0.75rem;
        border-radius: 0.5rem;
        padding: 0.7rem 1rem;
        color: #fff;
        background: #176e59;
        font-weight: 750;
        text-decoration: none;
      }
    `,
  ],
})
export class UnauthorizedPage {}
