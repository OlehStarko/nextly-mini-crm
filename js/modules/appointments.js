import { apptListRange, apptRemove, apptUpdate, clientsList } from '../store/repository.cloud.js';
import { t, formatDate as formatDateLocalized, formatTime as formatTimeLocalized, formatNumber } from '../utils/i18n.js';

export async function render(root) {
  root.innerHTML = `
    <section class="section appointments-page" data-page="appointments">
      <header class="grid">
        <div>
          <label>Базова дата</label>
          <input type="date" id="date" />
        </div>
        <div class="appointments-toolbar">
          <div class="btn-group" role="group" aria-label="Фільтр періоду">
            <button class="btn period" data-period="all">Усі</button>
            <button class="btn period" data-period="day">Сьогодні</button>
            <button class="btn period" data-period="week">Тиждень</button>
            <button class="btn period" data-period="month">Місяць</button>
          </div>
          <div id="statusFilters" class="status-filters">
            <label><input type="checkbox" class="sf" value="scheduled" checked /> Заплановано</label>
            <label><input type="checkbox" class="sf" value="done" checked /> Виконано</label>
            <label><input type="checkbox" class="sf" value="canceled" checked /> Скасовано</label>
          </div>
          <div id="clientFilterWrap" class="client-filter">
            <label for="clientFilter">Клієнт</label>
            <select id="clientFilter">
              <option value="">Усі клієнти</option>
            </select>
          </div>
          <button type="button" class="btn-cl btn-cl--primary" data-action="new-appt">+ Новий запис</button>
        </div>
      </header>
      <div id="content" style="margin-top:12px;"></div>
    </section>
  `;

  const dateEl = root.querySelector('#date');
  dateEl.valueAsDate = new Date();
  const contentEl = root.querySelector('#content');
  let currentPeriod = 'day';

  let clientsCache = [];
  let clientsById = {};

  async function refreshClientsCache() {
    clientsCache = await clientsList();
    clientsById = Object.fromEntries(clientsCache.map(c => [c.id, c]));
  }
  await refreshClientsCache();

  async function populateClientFilter() {
    const sel = root.querySelector('#clientFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="">Усі клієнти</option>' +
      clientsCache.map(c => `<option value="${c.id}">${escapeHtml(c.name)}${c.phone ? ' · ' + escapeHtml(c.phone) : ''}</option>`).join('');
  }
  await populateClientFilter();

  function clientLabelById(id) {
    const c = clientsById[id];
    if (!c) return '';
    return `${c.name || ''}${c.phone ? ' · ' + c.phone : ''}`.trim();
  }

  async function loadList() {
    const baseDate = dateEl.valueAsDate || new Date();
    const [startTs, endTs] = getRange(currentPeriod, baseDate);
    const list = await apptListRange(startTs, endTs);

    const allowed = selectedStatuses(root);
    let filtered = list.filter(a => allowed.has((a.status || '').toLowerCase()));

    const cid = selectedClientId(root);
    if (cid) filtered = filtered.filter(a => a.clientId === cid);

    const withClient = filtered.map(a => ({
      ...a,
      _clientLabel: clientLabelById(a.clientId)
    }));

    const total = withClient.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const clientLabel = cid ? t(' · Клієнт: {name}', { name: escapeHtml(root.querySelector('#clientFilter').selectedOptions[0].textContent) }) : '';
    const header = `
      <div class="appointments-summary">
        <span class="badge">${t('Записів: {count}', { count: withClient.length })}</span>
        <span class="badge">${t('Сума: {amount}', { amount: `${formatNumber(total)} ₴` })}</span>
        <span class="badge">${t('Період: {period}', { period: `${periodLabel(currentPeriod, baseDate)}${clientLabel}` })}</span>
      </div>`;

    contentEl.innerHTML = header + (withClient.length ? `<ul class="list">
      ${withClient.map(a => {
        const startTs = a.startAt || a.ts;
        const dateLabel = startTs ? formatDateLocalized(startTs, { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';
        const timeLabel = startTs ? formatTimeLocalized(startTs, { hour:'2-digit', minute:'2-digit' }) : '';
        return `
        <li class="appointment-item">
          <div class="appointment-item__main">
            <div class="appointment-item__identity">
              ${clientsById[a.clientId]?.avatar
                ? `<img src="${clientsById[a.clientId].avatar}" alt="" class="appointment-item__avatar">`
                : `<span class="avatar__fallback appointment-item__avatar">${initials(clientsById[a.clientId]?.name || '')}</span>`
              }
              <span class="status-dot ${statusClass(a.status)}" title="${a.status}"></span>
            </div>
            <div class="appointment-item__details">
              <div class="appointment-item__service">
                <strong>${dateLabel} ${timeLabel}</strong>
                — ${escapeHtml(a.title || t('Послуга'))}
              </div>
              ${a._clientLabel ? `<div class="appointment-item__client">${escapeHtml(a._clientLabel)}</div>` : ''}
              <div class="badge appointment-item__status">${statusLabel(a.status)}${a.paid ? ` · ${t('Оплачено')}` : ''}</div>
            </div>
          </div>
          <div class="appointment-item__actions">
            <label class="appointment-item__paid">
              <input type="checkbox" data-paid="${a.id}" ${a.paid ? 'checked' : ''} /> ${t('Оплачено')}
            </label>
            <div class="appointment-item__price">${formatNumber(a.price ?? 0)} ₴</div>
            <button class="btn-cl btn-cl--ghost" data-edit="${a.id}">${t('Редагувати')}</button>
            <button class="btn-cl btn-cl--danger" data-del="${a.id}">${t('Видалити')}</button>
          </div>
        </li>
      `;
      }).join('')}
    </ul>` : '<p>У цьому періоді записів немає.</p>');

    root.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('active', b.dataset.period === currentPeriod));
  }

  dateEl.addEventListener('change', loadList);

  const goToEditScreen = (id = null) => {
    sessionStorage.setItem('editReturn', '#/appointments');
    location.hash = id ? `/edit-appointment/${id}` : '/edit-appointment/new';
  };

  if (root.__appointmentsClickHandler) {
    root.removeEventListener('click', root.__appointmentsClickHandler);
  }
  const handleClick = async (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    const periodBtn = target.closest('[data-period]');
    if (periodBtn) {
      currentPeriod = periodBtn.dataset.period;
      loadList();
      return;
    }

    const newBtn = target.closest('[data-action="new-appt"]');
    if (newBtn) {
      goToEditScreen();
      return;
    }

    const editBtn = target.closest('[data-edit]');
    if (editBtn) {
      goToEditScreen(editBtn.dataset.edit);
      return;
    }

    const delId = e.target?.dataset?.del;
    if (delId && confirm(t('Видалити запис?'))) {
      await apptRemove(delId);
      loadList();
      return;
    }
  };
  root.addEventListener('click', handleClick);
  root.__appointmentsClickHandler = handleClick;

  if (root.__appointmentsChangeHandler) {
    root.removeEventListener('change', root.__appointmentsChangeHandler);
  }
  const handleChange = (e) => {
    if (e.target?.classList.contains('sf') || e.target?.id === 'clientFilter') {
      loadList();
      return;
    }

    if (e.target?.dataset?.paid) {
      const paidId = e.target.dataset.paid;
      apptUpdate(paidId, { paid: !!e.target.checked }).then(loadList);
    }
  };
  root.addEventListener('change', handleChange);
  root.__appointmentsChangeHandler = handleChange;

  await loadList();
}

function getRange(period, baseDate) {
  const d = new Date(baseDate);
  if (period === 'all') return [0, 8.64e15];
  if (period === 'day') {
    const s = new Date(d); s.setHours(0,0,0,0);
    const e = new Date(d); e.setHours(23,59,59,999);
    return [s.getTime(), e.getTime()];
  }
  if (period === 'week') {
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    return [monday.getTime(), sunday.getTime()];
  }
  const first = new Date(d.getFullYear(), d.getMonth(), 1, 0,0,0,0);
  const last  = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23,59,59,999);
  return [first.getTime(), last.getTime()];
}

function periodLabel(period, baseDate) {
  if (period === 'all') return 'Усі записи';
  if (period === 'day') return formatDateLocalized(baseDate, { day:'2-digit', month:'2-digit', year:'numeric' });
  if (period === 'week') {
    const [s, e] = getRange('week', baseDate);
    return `${formatDateLocalized(s, { day:'2-digit', month:'2-digit', year:'numeric' })} — ${formatDateLocalized(e, { day:'2-digit', month:'2-digit', year:'numeric' })}`;
  }
  const month = formatDateLocalized(baseDate, { month: 'long', year: 'numeric' });
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function selectedStatuses(root) {
  const boxes = root.querySelectorAll('#statusFilters .sf');
  const set = new Set();
  boxes.forEach(b => { if (b.checked) set.add(b.value); });
  if (set.size === 0) return new Set(['scheduled', 'done', 'canceled']);
  return set;
}

function selectedClientId(root) {
  const sel = root.querySelector('#clientFilter');
  return sel ? (sel.value || '') : '';
}

function initials(name='') {
  const parts = String(name).trim().split(/\s+/);
  const [a,b] = [parts[0]?.[0], parts[1]?.[0]];
  return `${(a||'').toUpperCase()}${(b||'').toUpperCase()}` || '•';
}

function statusClass(status){
  switch((status||'').toLowerCase()){
    case 'done': return 'status-done';
    case 'canceled': return 'status-canceled';
    default: return 'status-scheduled';
  }
}

function statusLabel(status){
  const map = {
    scheduled: t('Заплановано'),
    done: t('Виконано'),
    canceled: t('Скасовано'),
  };
  return map[(status||'').toLowerCase()] || status || '—';
}

function escapeHtml(str){
  return String(str||'').replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
