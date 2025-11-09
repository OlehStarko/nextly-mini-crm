// public/js/modules/services.js
import { servicesList, serviceUpsert, serviceRemove } from '../store/repository.cloud.js';
import { t } from '../utils/i18n.js';

export async function render(root) {
  root.innerHTML = `
    <section class="section services-page" data-page="services">
      <div class="card services-card">
        <div class="services-toolbar">
          <div class="services-toolbar__left">
            <div class="h3">Послуги</div>
            <span id="svcCount" class="badge">0 шт.</span>
          </div>
          <div class="services-toolbar__right">
            <div class="services-search">
              <input id="svcSearch" class="search" type="text" placeholder="Пошук послуг…" />
              <button class="btn-cl btn-cl--primary" id="svcNew">+ Додати</button>
            </div>
          </div>
        </div>
        <div class="services-table-wrap">
          <table class="services-table">
            <thead>
              <tr>
                <th class="col-title">Назва</th>
                <th class="col-price">Ціна за замовч.</th>
                <th class="col-duration">Тривалість, хв</th>
                <th class="col-active">Активна</th>
                <th class="col-actions">Дії</th>
              </tr>
            </thead>
            <tbody id="svcBody"></tbody>
          </table>
        </div>
      </div>
    </section>
  `;

  const svcBody = root.querySelector('#svcBody');
  const svcCount = root.querySelector('#svcCount');
  const searchInput = root.querySelector('#svcSearch');

  async function loadServices() {
    let list = await servicesList(false); // показуємо всі
    const q = (searchInput.value || '').trim().toLowerCase();
    if (q) list = list.filter(s => (s.title || '').toLowerCase().includes(q));
    svcCount.textContent = `${list.length} шт.`;
    svcBody.innerHTML = list.map(rowHTML).join('');
  }

  function rowHTML(s) {
    return `
      <tr data-id="${s.id}">
        <td class="col-title">${escapeHtml(s.title || '')}</td>
        <td class="col-price">${Number(s.priceDefault || 0)} ₴</td>
        <td class="col-duration">${Number(s.durationMin || 60)} хв</td>
        <td class="col-active">
          <label class="switch services-switch">
            <input type="checkbox" data-active="${s.id}" ${s.isActive !== false ? 'checked' : ''} />
            <span class="services-switch__state">${s.isActive !== false ? 'Так' : 'Ні'}</span>
          </label>
        </td>
        <td class="actions col-actions">
          <button class="btn-cl btn-cl--ghost" data-edit="${s.id}">Редагувати</button>
          <button class="btn-cl btn-cl--danger" data-del="${s.id}">Видалити</button>
        </td>
      </tr>
    `;
  }

  // toolbar actions
  const goToServiceForm = (mode, id) => {
    sessionStorage.setItem('serviceReturn', '#/services');
    if (mode === 'edit' && id) {
      location.hash = `#/services/edit/${id}`;
    } else {
      location.hash = '#/services/new';
    }
  };

  if (root.__servicesClickHandler) {
    root.removeEventListener('click', root.__servicesClickHandler);
  }
  const handleClick = async (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    if (target.id === 'svcNew') {
      goToServiceForm('new');
      return;
    }

    const editBtn = target.closest('[data-edit]');
    if (editBtn) {
      goToServiceForm('edit', editBtn.dataset.edit);
      return;
    }

    const delBtn = target.closest('[data-del]');
    if (delBtn) {
      const delId = delBtn.dataset.del;
      if (!delId) return;
      if (confirm(t('Видалити послугу? Існуючі записи залишаться з назвою/ціною на момент створення.'))) {
        await serviceRemove(delId);
        await loadServices();
      }
      return;
    }
  };
  root.addEventListener('click', handleClick);
  root.__servicesClickHandler = handleClick;

  // toggle active inline
  if (root.__servicesChangeHandler) {
    root.removeEventListener('change', root.__servicesChangeHandler);
  }
  const handleChange = async (e) => {
    const target = e.target instanceof HTMLInputElement ? e.target : null;
    const id = target?.dataset?.active;
    if (id) {
      const isActive = !!target.checked;
      await serviceUpsert({ id, isActive });
      const span = target.closest('.services-switch')?.querySelector('.services-switch__state');
      if (span) span.textContent = isActive ? 'Так' : 'Ні';
    }
  };
  root.addEventListener('change', handleChange);
  root.__servicesChangeHandler = handleChange;

  // live search
  searchInput.addEventListener('input', () => loadServices());

  await loadServices();
}

/* utils */
function escapeHtml(str){
  return String(str||'')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
