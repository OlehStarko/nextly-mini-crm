import { session, signOutAll } from '../store/session.js';
import { t, getLang, setLang } from '../utils/i18n.js';

export async function render(root) {
  const user = session()?.user;
  const displayName = user?.displayName || user?.email || t('Користувач');
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
        <button type="button" class="btn-cl btn-cl--ghost settings-user-logout" id="settingsLogout">${t('Вийти')}</button>
      </div>
    </section>
  ` : '';

  root.innerHTML = `
    ${userCard}
    <section>
      <div class="card">
        <div class="h3">${t('Основні налаштування')}</div>
        <div class="grid">
          <div>
            <label>${t('Мова інтерфейсу')}</label>
            <select id="lang">
              <option value="uk">${t('Українська')}</option>
              <option value="en">${t('English')}</option>
            </select>
          </div>
          <div>
            <label>${t('Валюта')}</label>
            <select id="currency">
              <option value="UAH">${t('₴ Гривня')}</option>
              <option value="USD">${t('$ Долар')}</option>
              <option value="EUR">${t('€ Євро')}</option>
            </select>
          </div>
        </div>
        <div style="margin-top:8px;" class="muted">${t('Зберігаються локально для поточного браузера.')}</div>
      </div>
    </section>
  `;

  const langEl = root.querySelector('#lang');
  const curEl  = root.querySelector('#currency');
  if (langEl) langEl.value = getLang();
  if (curEl) curEl.value = localStorage.getItem('ui.currency') || 'UAH';
  langEl?.addEventListener('change', () => setLang(langEl.value));
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
