import { session, signOutAll } from '../store/session.js';

export async function render(root) {
  const user = session()?.user;
  const displayName = user?.displayName || user?.email || 'Користувач';
  const email = user?.email && user?.email !== displayName ? user.email : '';
  const initials = (displayName || '')
    .split(/\s+/)
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const userCard = user ? `
    <section class="settings-user-mobile">
      <div class="settings-user-card">
        <div class="settings-user-meta">
          <div class="avatar" aria-hidden="true">${initials || 'U'}</div>
          <div>
            <div class="settings-user-name">${displayName}</div>
            ${email ? `<div class="settings-user-email">${email}</div>` : ''}
          </div>
        </div>
        <button type="button" class="settings-user-logout" id="settingsLogout">Вийти</button>
      </div>
    </section>
  ` : '';

  root.innerHTML = `
    ${userCard}
    <section>
      <div class="card">
        <div class="h3">Основні налаштування</div>
        <div class="grid">
          <div>
            <label>Мова інтерфейсу</label>
            <select id="lang">
              <option value="uk">Українська</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label>Валюта</label>
            <select id="currency">
              <option value="UAH">₴ Гривня</option>
              <option value="USD">$ Долар</option>
              <option value="EUR">€ Євро</option>
            </select>
          </div>
        </div>
        <div style="margin-top:8px;" class="muted">Зберігаються локально для поточного браузера.</div>
      </div>
    </section>
  `;

  const langEl = root.querySelector('#lang');
  const curEl  = root.querySelector('#currency');
  if (langEl) langEl.value = localStorage.getItem('ui.lang') || 'uk';
  if (curEl) curEl.value = localStorage.getItem('ui.currency') || 'UAH';
  langEl?.addEventListener('change', () => localStorage.setItem('ui.lang', langEl.value));
  curEl?.addEventListener('change',  () => localStorage.setItem('ui.currency', curEl.value));

  const logoutBtn = root.querySelector('#settingsLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOutAll();
      } catch (_) {}
      location.hash = '/auth';
    });
  }
}

