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
import * as Products from './modules/products.js';
import * as ServiceForm from './modules/service-form.js';
import * as ProductForm from './modules/product-form.js';
import * as EditAppointment from './modules/edit-appointment.js';
import * as ClientForm from './modules/client-form.js';
import * as ClientHistory from './modules/client-history.js';
import { initSession, onSession, session, signOutAll } from './store/session.js';
import { initI18n, onLangChange, t, applyTranslations } from './utils/i18n.js';

initI18n();

const routes = {
  '/dashboard': Dashboard.render,
  '/clients': Clients.render,
  '/appointments': Appointments.render,
  '/services': Services.render,      // ← додано
  '/products': Products.render,
  '/reports': Reports.render,
  '/settings': Settings.render,
  '/privacy': Privacy.render,
  '/terms': Terms.render,
  '/contact': Contact.render,
  '/auth': Auth.render,
};

function updateNavLabels() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const labels = new Map([
    ['#/dashboard', t('Головна')],
    ['#/clients', t('Клієнти')],
    ['#/appointments', t('Записи')],
    ['#/services', t('Послуги')],
    ['#/products', t('Товари')],
    ['#/reports', t('Фінанси')],
    ['#/settings', t('Налаштування')],
  ]);
  labels.forEach((label, href) => {
    const link = nav.querySelector(`a[href="${href}"]`);
    if (link) link.textContent = label;
  });
}

function updateFooterText() {
  const footerLeft = document.querySelector('.footer-left');
  if (footerLeft) footerLeft.textContent = t('© 2025 Mini CRM. Усі права захищені.');
}

function updateStaticUiText() {
  updateNavLabels();
  updateFooterText();
}
// малюємо користувача у бургері (тепер блок не використовується, тож просто очищаємо)
function renderDrawerUser() {
  const box = document.getElementById('drawerUser');
  box?.remove();
}

// ініціалізація
renderDrawerUser();
onSession(renderDrawerUser);
updateStaticUiText();
onLangChange(() => {
  updateStaticUiText();
  router();
});

function router() {
  const root = document.getElementById('app');
  const s = session();
  const isAuthed = !!s.user;
  const raw = location.hash.replace('#', '');
  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  };

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

  let params = {};
  let view = routes[raw];

  if (!view) {
    const editMatch = raw.match(/^\/edit-appointment(?:\/([^/]+))?$/);
    if (editMatch) {
      view = EditAppointment.render;
      params.id = editMatch[1] ? decodeURIComponent(editMatch[1]) : null;
    }
  }

  if (!view) {
    const clientFormMatch = raw.match(/^\/clients\/(new|edit)\/?([^/]*)$/);
    if (clientFormMatch) {
      view = ClientForm.render;
      params.mode = clientFormMatch[1];
      params.id = clientFormMatch[2] ? decodeURIComponent(clientFormMatch[2]) : null;
    }
  }

  if (!view) {
    const serviceFormMatch = raw.match(/^\/services\/(new|edit)\/?([^/]*)$/);
    if (serviceFormMatch) {
      view = ServiceForm.render;
      params.mode = serviceFormMatch[1];
      params.id = serviceFormMatch[2] ? decodeURIComponent(serviceFormMatch[2]) : null;
    }
  }
  if (!view) {
    const productFormMatch = raw.match(/^\/products\/(new|edit)\/?([^/]*)$/);
    if (productFormMatch) {
      view = ProductForm.render;
      params.mode = productFormMatch[1];
      params.id = productFormMatch[2] ? decodeURIComponent(productFormMatch[2]) : null;
    }
  }

  if (!view) {
    const historyMatch = raw.match(/^\/clients\/history\/([^/]+)$/);
    if (historyMatch) {
      view = ClientHistory.render;
      params.id = decodeURIComponent(historyMatch[1]);
    }
  }

  if (!view) view = routes['/dashboard'];
  view(root, params);
  requestAnimationFrame(scrollToTop);

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

    const displayName = s.user.displayName || s.user.email || t('Користувач');
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
          <a href="#" id="logout">${t('Вийти')}</a>
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
    if (footer) footer.textContent = t('Nextly — авторизуйтесь, щоб працювати із даними');
  }

  // після рендера: підсвічуємо активний пункт і закриваємо бургер (якщо був відкритий)
  setActiveNavLink();
  closeBurger();
  updateStaticUiText();
  applyTranslations(document.body);
}

// Повертає правильну розмітку футера
function buildFooterHTML() {
  return `
    <div class="footer-content">
      <div class="footer-left">${t('© 2025 Mini CRM. Усі права захищені.')}</div>
     
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

let resizeTimer;
window.addEventListener('resize', () => {
  document.documentElement.classList.add('resizing');
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => document.documentElement.classList.remove('resizing'), 250);
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
