import * as Dashboard from './modules/dashboard.js';
import * as Clients from './modules/clients.js';
import * as Appointments from './modules/appointments.js';
import * as Reports from './modules/reports.js';
import * as Settings from './modules/settings.js';
import * as Auth from './modules/auth.js';
import * as Privacy from './modules/privacy.js';
import * as Terms from './modules/terms.js';
import * as Contact from './modules/contact.js';
import * as Services from './modules/services.js';
import { initSession, onSession, session, signOutAll } from './store/session.js';

const routes = {
  '/dashboard': Dashboard.render,
  '/clients': Clients.render,
  '/appointments': Appointments.render,
  '/services': Services.render,      // ← додано
  '/reports': Reports.render,
  '/settings': Settings.render,
  '/privacy': Privacy.render,
  '/terms': Terms.render,
  '/contact': Contact.render,
  '/auth': Auth.render,
};

function router() {
  const root = document.getElementById('app');
  const s = session();
  const isAuthed = !!s.user;
  const raw = location.hash.replace('#', '');

  // якщо користувач не увійшов
  if (!isAuthed && raw !== '/auth') {
    location.hash = '/auth';
    return;
  }

  // якщо користувач увійшов, але маршрут порожній або /auth
  if (isAuthed && (raw === '' || raw === '/' || raw === '/auth')) {
    location.hash = '/dashboard';
    return;
  }

  const view = routes[raw] || routes['/dashboard'];
  view(root);

  // зберігаємо останній маршрут
  if (session().user) {
    localStorage.setItem('lastRoute', location.hash.replace('#', ''));
  }

  // Отримуємо елементи (нові селектори)
  const userInfo = document.getElementById('userInfo');     // права зона з іменем/виходом
  const footer   = document.querySelector('.footer');
  const navEl    = document.getElementById('nav');           // центральне меню (оф-канвас на мобільному)

  // --- 🔹 Вигляд для авторизованих ---
  if (isAuthed) {
    // показуємо меню, якщо є
    if (navEl) navEl.style.display = ''; // даємо стилям керувати (flex у десктоп)

    const displayName = s.user.displayName || s.user.email || 'User';
    const initials = displayName
      .split(' ')
      .map(w => w[0]?.toUpperCase())
      .slice(0, 2)
      .join('');

    if (userInfo) {
      userInfo.innerHTML = `
        <div class="user-badge">
          <div class="avatar">${initials}</div>
          <span class="username">${displayName}</span>
          <a href="#" id="logout">Вийти</a>
        </div>
      `;

      // Обробник виходу
      userInfo.querySelector('#logout')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await signOutAll(); } catch (_) {}
        location.hash = '/auth';
        // підстрахуємо ререндер:
        setTimeout(router, 0);
      });
    }

    if (footer) {
      footer.innerHTML = `
        <a href="#/privacy">Політика конфіденційності</a> ·
        <a href="#/terms">Умови користування</a> ·
        <a href="#/contact">Контакти</a>
      `;
    }

  // --- 🔹 Вигляд для неавторизованих ---
  } else {
    if (navEl) navEl.style.display = 'none'; // ховаємо меню
    if (userInfo) userInfo.innerHTML = '';
    if (footer) footer.textContent = 'Nextly — авторизуйтесь, щоб працювати із даними';
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', async () => {
  await initSession();
  onSession(() => router());

  const last = localStorage.getItem('lastRoute');
  if (session().user && last && last !== '/auth') {
    location.hash = last; // повертає на останню вкладку
  } else if (session().user) {
    location.hash = '/dashboard'; // дефолт — Dashboard
  } else {
    location.hash = '/auth';
  }

  router();
});

document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const nav    = document.getElementById('nav');
  const scrim  = document.getElementById('scrim');

  if (!burger || !nav || !scrim) return;

  function openNav() {
    // вмикаємо анімацію лише для інтеракції
    nav.classList.add('animate');
    scrim.classList.add('animate');

    burger.classList.add('is-open');
    nav.classList.add('open');
    scrim.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-open');
  }

  function closeNav() {
    nav.classList.add('animate');
    scrim.classList.add('animate');

    burger.classList.remove('is-open');
    nav.classList.remove('open');
    scrim.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  function toggleNav() {
    const isOpen = nav.classList.contains('open');
    isOpen ? closeNav() : openNav();

    // забираємо .animate після завершення кадру, щоб при ресайзі не було анімацій
    requestAnimationFrame(() => {
      nav.classList.remove('animate');
      scrim.classList.remove('animate');
    });
  }

  burger.addEventListener('click', toggleNav);
  scrim.addEventListener('click', closeNav);
  nav.addEventListener('click', e => { if (e.target.tagName === 'A') closeNav(); });

  // 🔒 ресайз/брейкпоінт — завжди закрито і БЕЗ анімацій
  const mq = window.matchMedia('(max-width: 899px)');
  function syncOnBreakpoint() {
    // прибираємо ознаки відкритого меню
    burger.classList.remove('is-open');
    nav.classList.remove('open', 'animate');
    scrim.classList.remove('open', 'animate');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }
  mq.addEventListener ? mq.addEventListener('change', syncOnBreakpoint)
                      : mq.addListener(syncOnBreakpoint);
  window.addEventListener('resize', syncOnBreakpoint);
});

const burger = document.getElementById('burger');
const nav    = document.getElementById('nav');
const scrim  = document.getElementById('scrim');

function toggleNav(open){
  nav.classList.toggle('open', open);
  burger.classList.toggle('is-open', open);
  scrim.classList.toggle('show', open);
  document.body.classList.toggle('nav-open', open);
  burger.setAttribute('aria-expanded', String(open));
}

burger.addEventListener('click', () => {
  toggleNav(!nav.classList.contains('open'));
});
scrim.addEventListener('click', () => toggleNav(false));