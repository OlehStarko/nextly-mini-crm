import { clientGet, apptListRange } from '../store/repository.cloud.js';
import { t, formatDate, formatNumber } from '../utils/i18n.js';

export async function render(root, params = {}) {
  const clientId = params.id;
  const returnHash = sessionStorage.getItem('clientReturn') || '#/clients';

  if (!clientId) {
    root.innerHTML = `<section class="page page--client-history"><p>${t('Клієнт не знайдений.')}</p></section>`;
    return;
  }

  root.innerHTML = `
    <section class="page page--client-history">
      <div class="card client-history">
        <header class="edit-appt__head">
          <h1>${t('Історія відвідувань')}</h1>
          <button class="btn-cl btn-cl--ghost" id="historyBack" type="button">${t('← Назад')}</button>
        </header>
        <div id="historyContent">${t('Завантаження...')}</div>
      </div>
    </section>
  `;

  document.getElementById('historyBack')?.addEventListener('click', () => {
    sessionStorage.removeItem('clientReturn');
    location.hash = returnHash;
  });

  try {
    const content = await loadHistory(clientId);
    renderHistory(content);
  } catch (err) {
    console.error(err);
    document.getElementById('historyContent').innerHTML = `<p>${t('Не вдалося завантажити історію.')}</p>`;
  }
}

async function loadHistory(clientId) {
  const client = await clientGet(clientId);
  if (!client) throw new Error('notfound');
  const now = Date.now();
  const past = now - 5 * 365 * 24 * 60 * 60 * 1000;
  const all = await apptListRange(past, now);
  const visits = all
    .filter(a => a.clientId === clientId)
    .sort((a,b)=>(b.startAt || b.ts || 0) - (a.startAt || a.ts || 0));
  return { client, visits };
}

function renderHistory({ client, visits }) {
  const content = document.getElementById('historyContent');
  if (!content) return;

  if (!visits.length) {
    content.innerHTML = `<p>${escapeHtml(client.name || t('Клієнт'))} ${t('ще не має відвідувань.')}</p>`;
    return;
  }

  const paidCount = visits.filter(v => v.paid).length;
  const totalSum = visits.reduce((sum, v) => sum + Number(v.price || 0), 0);

  content.innerHTML = `
    <div class="client-history__summary">
      <div><strong>${escapeHtml(client.name || t('Клієнт'))}</strong></div>
      <div>${t('Всього візитів: {count}', { count: visits.length })}</div>
      <div>${t('Оплачено: {count}', { count: paidCount })}</div>
      <div>${t('Сума: {amount}', { amount: `${formatNumber(totalSum)} ₴` })}</div>
    </div>
    <ul class="list client-history__list">
      ${visits.map(v => `
        <li class="history-item">
          <div><strong>${formatDate(v.startAt || v.ts, { day:'2-digit', month:'2-digit', year:'numeric' })}</strong> · ${escapeHtml(v.title || t('Без назви'))}</div>
          <div style="opacity:.7;">${v.status || '—'}${v.paid ? ` · ${t('Оплачено')}` : ''}</div>
          <div style="font-size:13px;">${formatNumber(Number(v.price || 0))} ₴</div>
        </li>
      `).join('')}
    </ul>
  `;
}

function escapeHtml(str='') {
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
