// public/js/modules/services.js
import { servicesList, serviceUpsert, serviceRemove } from '../store/repository.cloud.js';

export async function render(root) {
  // moved CSS to external file


  root.innerHTML = `
    <section class="section" data-page="services">
      <div class="card">
        <div class="toolbar">
          <div class="left">
            <div class="h3" style="margin:0;">Послуги</div>
            <span id="svcCount" class="badge">0 шт.</span>
          </div>
          <div class="right">
            <input id="svcSearch" class="search" type="text" placeholder="Пошук послуг…" />
            <button class="btn" id="svcRefresh">Оновити</button>
            <button class="btn primary" id="svcNew">+ Додати</button>
          </div>
        </div>
        <div style="overflow:auto;">
          <table>
            <thead>
              <tr>
                <th style="min-width:220px;">Назва</th>
                <th style="width:140px;">Ціна за замовч.</th>
                <th style="width:140px;">Тривалість, хв</th>
                <th style="width:120px;">Активна</th>
                <th style="width:160px; text-align:right;">Дії</th>
              </tr>
            </thead>
            <tbody id="svcBody"></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Modal: service -->
    <div class="modal" id="svcModal" aria-hidden="true">
      <div class="modal__backdrop" data-close="1"></div>
      <div class="modal__dialog">
        <div class="modal__header">
          <div class="modal__title" id="svcModalTitle">Нова послуга</div>
          <button type="button" class="modal__close" data-close="1">✕</button>
        </div>
        <form id="svcForm" class="modal__body">
          <input type="hidden" id="svcId" />
          <div>
            <label>Назва</label>
            <input id="svcTitle" type="text" placeholder="Наприклад: Стрижка" required />
          </div>
          <div class="grid">
            <div>
              <label>Ціна за замовч., грн</label>
              <input id="svcPrice" type="number" min="0" step="1" placeholder="0" />
            </div>
            <div>
              <label>Тривалість, хв</label>
              <input id="svcDuration" type="number" min="10" step="5" placeholder="60" />
            </div>
          </div>
          <div class="switch">
            <input id="svcActive" type="checkbox" checked />
            <label for="svcActive">Активна (видима у виборі послуг)</label>
          </div>
          <div class="modal__actions">
            <button type="button" class="modal__close" data-close="1">Скасувати</button>
            <button type="submit" class="btn primary">Зберегти</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const svcBody = root.querySelector('#svcBody');
  const svcCount = root.querySelector('#svcCount');
  const searchInput = root.querySelector('#svcSearch');

  // modal helpers
  const modal = root.querySelector('#svcModal');
  const form  = root.querySelector('#svcForm');

  function openModal(){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function closeModal(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; form.reset(); root.querySelector('#svcId').value=''; root.querySelector('#svcActive').checked=true; }
  modal.addEventListener('click', (e)=>{ if(e.target && e.target.hasAttribute('data-close')) closeModal(); });
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && modal.classList.contains('open')) closeModal(); });

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
        <td>${escapeHtml(s.title || '')}</td>
        <td>${Number(s.priceDefault || 0)}</td>
        <td>${Number(s.durationMin || 60)}</td>
        <td>
          <label class="switch">
            <input type="checkbox" data-active="${s.id}" ${s.isActive !== false ? 'checked' : ''} />
            <span>${s.isActive !== false ? 'Так' : 'Ні'}</span>
          </label>
        </td>
        <td class="actions">
          <button class="btn" data-edit="${s.id}">Редагувати</button>
          <button class="btn" data-del="${s.id}">Видалити</button>
        </td>
      </tr>
    `;
  }

  // toolbar actions
  root.addEventListener('click', async (e) => {
    if (e.target.id === 'svcNew') {
      root.querySelector('#svcModalTitle').textContent = 'Нова послуга';
      openModal();
      return;
    }
    if (e.target.id === 'svcRefresh') {
      await loadServices();
      return;
    }

    // inline edit/delete
    const editId = e.target?.dataset?.edit;
    if (editId) {
      const list = await servicesList(false);
      const s = list.find(x => x.id === editId);
      if (!s) return;
      root.querySelector('#svcModalTitle').textContent = 'Редагування послуги';
      root.querySelector('#svcId').value = s.id;
      root.querySelector('#svcTitle').value = s.title || '';
      root.querySelector('#svcPrice').value = Number(s.priceDefault || 0);
      root.querySelector('#svcDuration').value = Number(s.durationMin || 60);
      root.querySelector('#svcActive').checked = (s.isActive !== false);
      openModal();
      return;
    }
    const delId = e.target?.dataset?.del;
    if (delId) {
      if (confirm('Видалити послугу? Існуючі записи залишаться з назвою/ціною на момент створення.')) {
        await serviceRemove(delId);
        await loadServices();
      }
      return;
    }
  });

  // toggle active inline
  root.addEventListener('change', async (e) => {
    const id = e.target?.dataset?.active;
    if (id) {
      const isActive = !!e.target.checked;
      await serviceUpsert({ id, isActive });
      // необов'язково перевантажувати весь список: просто підправимо текст
      const span = e.target.parentElement?.querySelector('span');
      if (span) span.textContent = isActive ? 'Так' : 'Ні';
    }
  });

  // live search
  searchInput.addEventListener('input', () => loadServices());

  // submit form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = root.querySelector('#svcId').value || '';
    const title = (root.querySelector('#svcTitle').value || '').trim();
    const priceDefault = Number(root.querySelector('#svcPrice').value || 0) || 0;
    const durationMin  = Number(root.querySelector('#svcDuration').value || 60) || 60;
    const isActive     = !!root.querySelector('#svcActive').checked;

    if (!title) { alert('Вкажіть назву послуги'); return; }
    if (durationMin < 5) { alert('Тривалість повинна бути ≥ 5 хв'); return; }

    await serviceUpsert({ id: id || null, title, priceDefault, durationMin, isActive });
    closeModal();
    await loadServices();
  });

  await loadServices();
}

/* utils */
function injectOnce(id, css){
  if (document.getElementById(id)) return;
  const s = document.createElement('style'); s.id = id; s.textContent = css;
  document.head.appendChild(s);
}
function escapeHtml(str){
  return String(str||'')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
