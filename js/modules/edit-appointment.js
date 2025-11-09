import { clientsList, servicesList, apptCreate, apptUpdate, apptListRange } from '../store/repository.cloud.js';
import { fb } from '../db/firebase.js';

export async function render(root, params = {}) {
  const rawId = params.id;
  const isEdit = !!(rawId && rawId !== 'new');
  const apptId = isEdit ? rawId : null;
  const returnHash = sessionStorage.getItem('editReturn') || '#/dashboard';

  root.innerHTML = `
    <section class="page page--edit-appt">
      <div class="card edit-appt">
        <header class="edit-appt__head">
          <h1>${isEdit ? 'Редагувати запис' : 'Новий запис'}</h1>
          <button class="btn-cl btn-cl--ghost" id="editApptBack" type="button">← Назад</button>
        </header>
        <form id="apptForm" class="edit-appt__form">
          <label>Клієнт
            <select id="apptClient" required></select>
          </label>
          <label>Послуга
            <select id="apptService" required></select>
          </label>
          <label id="customServiceWrap" style="display:none;">
            <span>Назва послуги</span>
            <input id="apptCustomTitle" type="text" placeholder="Напр., Консультація" />
          </label>
          <label>Дата
            <input id="apptDate" type="date" required />
          </label>
          <label>Час
            <input id="apptTime" type="time" required />
          </label>
          <label>Ціна, ₴
            <input id="apptPrice" type="number" min="0" step="1" />
          </label>
          <label>Статус
            <select id="apptStatus">
              <option value="scheduled">Заплановано</option>
              <option value="done">Виконано</option>
              <option value="canceled">Скасовано</option>
            </select>
          </label>
          <label class="toggle-field edit-appt__toggle">
            <input id="apptPaid" class="toggle-input" type="checkbox"> Оплачено
          </label>
          <div class="edit-appt__actions">
            <button type="button" class="btn-cl btn-cl--ghost" id="apptCancel">Скасувати</button>
            <button type="submit" class="btn-cl btn-cl--primary">Зберегти</button>
          </div>
        </form>
      </div>
    </section>
  `;

  const goBack = () => {
    sessionStorage.removeItem('editReturn');
    location.hash = returnHash;
  };
  document.getElementById('editApptBack')?.addEventListener('click', goBack);
  document.getElementById('apptCancel')?.addEventListener('click', goBack);

  try {
    const [clients, services] = await Promise.all([clientsList(), servicesList(false)]);
    const appt = isEdit ? await fetchAppointment(apptId) : null;
    initForm({ root, clients, services, appt, isEdit, apptId, goBack });
  } catch (err) {
    console.error(err);
    root.querySelector('.edit-appt')?.insertAdjacentHTML('beforeend', `<p class="error">Не вдалося завантажити дані.</p>`);
  }
}

async function fetchAppointment(id) {
  if (!id) return null;
  const { auth, db, doc, getDoc } = await fb();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('auth');
  const ref = doc(db, `users/${uid}/appointments`, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('notfound');
  return { id: snap.id, ...snap.data() };
}

function initForm({ root, clients, services, appt, isEdit, apptId, goBack }) {
  const form = document.getElementById('apptForm');
  const clientSel = document.getElementById('apptClient');
  const serviceSel = document.getElementById('apptService');
  const customWrap = document.getElementById('customServiceWrap');
  const customInput = document.getElementById('apptCustomTitle');
  const dateInput = document.getElementById('apptDate');
  const timeInput = document.getElementById('apptTime');
  const priceInput = document.getElementById('apptPrice');
  const statusSel = document.getElementById('apptStatus');
  const paidInput = document.getElementById('apptPaid');

  const clientsMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const servicesMap = Object.fromEntries(services.map(s => [s.id, s]));

  clientSel.innerHTML = clients.length
    ? clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}${c.phone ? ' · ' + escapeHtml(c.phone) : ''}</option>`).join('')
    : '<option value="">Спочатку додайте клієнта</option>';

  serviceSel.innerHTML = ['<option value="">— Виберіть —</option>']
    .concat(services.map(s => `<option value="${s.id}" data-price="${s.priceDefault||0}" data-duration="${s.durationMin||60}">${escapeHtml(s.title)}</option>`))
    .concat(['<option value="custom">Інша послуга…</option>'])
    .join('');

  if (clients.length === 0) clientSel.disabled = true;

  const defaultDate = new Date();
  dateInput.value = appt ? (appt.date || toDateInput(new Date(appt.startAt))) : toDateInput(defaultDate);
  timeInput.value = appt ? (appt.time || toTimeInput(new Date(appt.startAt))) : toTimeInput(defaultDate);
  priceInput.value = appt ? (appt.price || 0) : '';
  statusSel.value = appt ? (appt.status || 'scheduled') : 'scheduled';
  paidInput.checked = !!appt?.paid;

  if (appt && appt.clientId) {
    clientSel.value = appt.clientId;
  }

  if (appt && appt.serviceId) {
    serviceSel.value = appt.serviceId;
    customWrap.style.display = 'none';
  } else if (appt && appt.title) {
    serviceSel.value = 'custom';
    customWrap.style.display = 'block';
    customInput.value = appt.title;
  }

  serviceSel.addEventListener('change', () => {
    if (serviceSel.value === 'custom') {
      customWrap.style.display = 'block';
    } else {
      customWrap.style.display = 'none';
      customInput.value = '';
      const svc = servicesMap[serviceSel.value];
      if (svc && Number(svc.priceDefault) > 0) {
        priceInput.value = Number(svc.priceDefault);
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = clientSel.value;
    if (!clientId) { alert('Оберіть клієнта'); return; }

    const svcVal = serviceSel.value;
    let serviceId = null;
    let title = '';
    if (svcVal === 'custom') {
      title = customInput.value.trim();
      if (!title) { alert('Вкажіть назву послуги'); return; }
    } else if (svcVal) {
      serviceId = svcVal;
      title = servicesMap[serviceId]?.title || '';
    } else {
      alert('Оберіть послугу');
      return;
    }

    const dateStr = dateInput.value;
    const timeStr = timeInput.value;
    if (!dateStr || !timeStr) { alert('Вкажіть дату та час'); return; }
    const startAt = buildTimestamp(dateStr, timeStr);
    const durationMin = servicesMap[serviceId]?.durationMin || 60;
    const endAt = startAt + durationMin * 60000;

    const price = Number(priceInput.value || 0) || 0;
    const status = statusSel.value || 'scheduled';
    const paid = !!paidInput.checked;

    const dayStart = new Date(startAt); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(startAt); dayEnd.setHours(23,59,59,999);
    const dayList = await apptListRange(dayStart.getTime(), dayEnd.getTime());
    const conflicts = dayList.filter(a => {
      if (isEdit && a.id === apptId) return false;
      const aEnd = typeof a.endAt === 'number' ? a.endAt : (a.startAt + 60*60*1000);
      return overlaps(a.startAt, aEnd, startAt, endAt);
    });
    if (conflicts.length) {
      const proceed = window.confirm(`На цей час вже є ${conflicts.length} запис(ів). Продовжити?`);
      if (!proceed) return;
    }

    const payload = {
      clientId,
      serviceId: serviceId || null,
      title: title || 'Послуга',
      startAt,
      endAt,
      price,
      status,
      paid,
      date: dateStr,
      time: timeStr,
      ts: startAt,
      notes: ''
    };

    if (isEdit && apptId) {
      await apptUpdate(apptId, payload);
    } else {
      await apptCreate(payload);
    }

    goBack();
  });
}

function toDateInput(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function toTimeInput(date) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function buildTimestamp(dateStr, timeStr) {
  const [hh, mm] = timeStr.split(':').map(Number);
  const d = new Date(dateStr);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d.getTime();
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
