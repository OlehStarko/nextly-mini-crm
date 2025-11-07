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
// створюємо "слот" для юзер-блоку всередині <nav id="nav">, якщо його ще нема
function ensureDrawerUserSlot() {
  const nav = document.getElementById('nav');
  if (!nav) return null;

  let slot = nav.querySelector('#drawerUser');
  if (!slot) {
    slot = document.createElement('div');
    slot.id = 'drawerUser';
    slot.className = 'drawer-user';
    // вставляємо на початок меню
    nav.prepend(slot);
  }
  return slot;
}

// малюємо користувача у бургері
function renderDrawerUser() {
  const box = document.getElementById('drawerUser');
  if (!box) return;

  const u = session().user;
  if (!u) { box.hidden = true; box.innerHTML = ''; return; }

  const initials = (u.displayName || u.email || 'U')
    .split(/\s+/).map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();

  box.innerHTML = `
    <div class="du-ava" aria-hidden="true">${initials}</div>
    <div class="du-meta">
      <div class="du-name">${u.displayName || u.email || 'Користувач'}</div>
      <button class="du-logout" id="drawerLogout" type="button">Вийти</button>
    </div>
  `;
  box.hidden = false;

  box.querySelector('#drawerLogout')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOutAll();
    location.hash = '/auth';
  }, { once: true });
}

// ініціалізація
renderDrawerUser();
onSession(renderDrawerUser);

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

  // Елементи хедера
  const userInfo = document.getElementById('userInfo'); // права зона з іменем/виходом
  const footer   = document.querySelector('.footer');
  const navEl    = document.getElementById('nav');      // центральне меню
  const burger   = document.getElementById('burger');
  const scrim    = document.getElementById('scrim');

  // Хелпер: закрити бургер/оф-канвас, якщо відкритий
  const closeBurger = () => {
    navEl?.classList.remove('open');
    burger?.classList.remove('is-open');
    scrim?.classList.remove('show');
    document.body.classList.remove('nav-open');
    burger?.setAttribute('aria-expanded', 'false');
  };

  // Хелпер: підсвітити активний пункт меню
  const setActiveNavLink = () => {
    if (!navEl) return;
    const current = (location.hash || '#/dashboard').replace('#', '') || '/dashboard';
    navEl.querySelectorAll('a').forEach(a => {
      const isActive = a.getAttribute('href') === `#${current}`;
      a.classList.toggle('active', isActive);
    });
  };

  // --- 🔹 Вигляд для авторизованих ---
  if (isAuthed) {
    if (navEl) navEl.style.display = ''; // даємо стилям керувати

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
renderDrawerUser();
      userInfo.querySelector('#logout')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await signOutAll(); } catch (_) {}
        location.hash = '/auth';
        setTimeout(router, 0);
      });
    }

    

  // --- 🔹 Вигляд для неавторизованих ---
  } else {
    if (navEl) navEl.style.display = 'none';
    if (userInfo) userInfo.innerHTML = '';
    if (footer) footer.textContent = 'Nextly — авторизуйтесь, щоб працювати із даними';
  }

  // після рендера: підсвічуємо активний пункт і закриваємо бургер (якщо був відкритий)
  setActiveNavLink();
  closeBurger();
}

// Повертає правильну розмітку футера
function buildFooterHTML() {
  return `
    <div class="footer-content">
      <div class="footer-left">© 2025 Mini CRM. Усі права захищені.</div>
     
    </div>`;
}

// 1) Разове «виправлення», якщо вже затирали
(function fixFooterOnce() {
  const f = document.getElementById('appFooter');
  if (!f) return;
  if (!f.querySelector('.footer-content')) {
    f.innerHTML = buildFooterHTML();
  }
})();

// 2) Захист від подальших перезаписів (якщо якийсь скрипт знову спробує)
(function protectFooter() {
  const f = document.getElementById('appFooter');
  if (!f) return;
  const obs = new MutationObserver(() => {
    if (!f.querySelector('.footer-content')) {
      f.innerHTML = buildFooterHTML();
    }
  });
  obs.observe(f, { childList: true, subtree: false });
})();
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
  const nav    = document.getElementById('nav');        // <nav class="nav-center" id="nav">
  const scrim  = document.getElementById('scrim');      // <div id="scrim" class="mobile-scrim">

  function setNavOpen(open) {
    burger.classList.toggle('is-open', open);
    nav.classList.toggle('open', open);     // CSS: .nav-center.open { ... }
    scrim?.classList.toggle('show', open);  // CSS: .mobile-scrim.show { ... }
    document.body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', String(open));
  }

  // Клік по бургеру — toggle
  burger?.addEventListener('click', () => {
    setNavOpen(!nav.classList.contains('open'));
  });

  // Клік по затемненню — закрити
  scrim?.addEventListener('click', () => setNavOpen(false));

  // Клік по будь-якому пункту меню — закрити і дати перейти
  nav?.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a) setNavOpen(false);
  });

  // Будь-яка зміна маршруту (#/...) — меню закриваємо
  window.addEventListener('hashchange', () => setNavOpen(false));
});

let t; window.addEventListener('resize', () => {
  document.documentElement.classList.add('resizing');
  clearTimeout(t); t = setTimeout(()=>document.documentElement.classList.remove('resizing'), 250);
});

// Прибрати випадковий "низовий" блок, якщо він не є нашим <footer>
function removeLegacyLegalBlock() {
  const candidate = document.body.lastElementChild;
  if (
    candidate &&
    candidate.tagName !== 'FOOTER' &&
    /Політика конфіденційності|Умови користування|Контакти/i.test(candidate.textContent || '')
  ) {
    candidate.remove();
  }
}
document.addEventListener('DOMContentLoaded', removeLegacyLegalBlock);
// на SPA ще корисно після кожного роут-рендера
setTimeout(removeLegacyLegalBlock, 0);

(function fixMobileVH(){
  function setVH() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  }
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);
  setVH();
})();

// iOS keyboard/visualViewport fix
(function keyboardSafeViewport(){
  const set = () => {
    const vv = window.visualViewport;
    const vh = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--vvh', vh + 'px');

    // клавіатура відкрита, якщо візуальна висота істотно менша
    const open = vv && vh < window.innerHeight - 80;
    document.documentElement.classList.toggle('html-kb-open', !!open);
  };
  if ('visualViewport' in window) {
    visualViewport.addEventListener('resize', set);
    visualViewport.addEventListener('scroll', set);
  }
  window.addEventListener('orientationchange', set);
  set();
})();

// ініціалізація
renderDrawerUser();
onSession(renderDrawerUser); // перерендер при зміні auth
