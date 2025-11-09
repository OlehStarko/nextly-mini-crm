import { serviceUpsert, serviceGet } from '../store/repository.cloud.js';
import { t } from '../utils/i18n.js';

export async function render(root, params = {}) {
  const mode = params.mode === 'edit' ? 'edit' : 'new';
  const serviceId = mode === 'edit' ? params.id : null;
  const returnHash = sessionStorage.getItem('serviceReturn') || '#/services';

  const titleText = mode === 'edit' ? t('Редагувати послугу') : t('Нова послуга');
  const submitText = mode === 'edit' ? t('Зберегти') : t('Створити');

  root.innerHTML = `
    <section class="page page--service-form">
      <div class="card service-form">
        <header class="edit-appt__head">
          <h1>${titleText}</h1>
          <button class="btn-cl btn-cl--ghost" id="serviceFormBack" type="button">${t('← Назад')}</button>
        </header>
        <form id="serviceForm" class="edit-appt__form">
          <label>${t('Назва')}
            <input id="serviceTitle" type="text" placeholder="${t('Напр., Стрижка')}" required />
          </label>
          <label>${t('Ціна, ₴')}
            <input id="servicePrice" type="number" min="0" step="1" placeholder="0" />
          </label>
          <label>${t('Тривалість, хв')}
            <input id="serviceDuration" type="number" min="5" step="5" placeholder="60" />
          </label>
          <label class="toggle-field service-form__toggle">
            <input id="serviceActive" class="toggle-input" type="checkbox" checked />
            <span>${t('Активна (видима у виборі послуг)')}</span>
          </label>
          <div class="edit-appt__actions">
            <button type="button" class="btn-cl btn-cl--ghost" id="serviceCancel">${t('Скасувати')}</button>
            <button type="submit" class="btn-cl btn-cl--primary">${submitText}</button>
          </div>
        </form>
      </div>
    </section>
  `;

  const goBack = () => {
    sessionStorage.removeItem('serviceReturn');
    location.hash = returnHash;
  };
  document.getElementById('serviceFormBack')?.addEventListener('click', goBack);
  document.getElementById('serviceCancel')?.addEventListener('click', goBack);

  const titleEl = document.getElementById('serviceTitle');
  const priceEl = document.getElementById('servicePrice');
  const durationEl = document.getElementById('serviceDuration');
  const activeEl = document.getElementById('serviceActive');

  if (mode === 'edit' && serviceId) {
    try {
      const svc = await serviceGet(serviceId);
      if (!svc) throw new Error('notfound');
      titleEl.value = svc.title || '';
      priceEl.value = Number(svc.priceDefault || 0);
      durationEl.value = Number(svc.durationMin || 60);
      activeEl.checked = svc.isActive !== false;
    } catch (err) {
      console.error(err);
      document.querySelector('.service-form')?.insertAdjacentHTML('beforeend', `<p class="error">${t('Не вдалося завантажити послугу.')}</p>`);
    }
  }

  document.getElementById('serviceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleEl.value.trim();
    const priceDefault = Number(priceEl.value || 0) || 0;
    const durationMin = Number(durationEl.value || 0) || 0;
    const isActive = !!activeEl.checked;

    if (!title) { alert(t('Вкажіть назву послуги')); titleEl.focus(); return; }
    if (durationMin < 5) { alert(t('Тривалість повинна бути ≥ 5 хв')); durationEl.focus(); return; }

    await serviceUpsert({
      id: serviceId || null,
      title,
      priceDefault,
      durationMin,
      isActive,
    });
    goBack();
  });
}
