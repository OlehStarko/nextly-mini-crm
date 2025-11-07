// public/js/modules/dashboard.js
import { fb } from '../db/firebase.js';

// підключаємо стилі сторінки (один активний лінк)
usePageCss('/css/pages/dashboard.css');

export async function render(root) {
  document.documentElement.classList.remove('is-auth');

  // ---------- РОЗМІТКА ----------
  root.innerHTML = `
    <section class="page page--dashboard">
      <div id="stats"></div>

      <section class="calendar-strip" id="calendarStrip">
        <div class="calendar-strip__head">
          <div class="calendar-strip__title">Місяць</div>

          <div class="calendar-strip__nav">
            <button class="calendar-strip__btn" id="calPrev" aria-label="Попередній місяць">
              <svg viewBox="0 0 24 24" class="cal-icon" fill="none">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13.2578 8.4707L9.73779 12.0007L13.2578 15.5307" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="calendar-strip__btn" id="calToday" aria-label="Сьогодні">
              <svg viewBox="0 0 24 24" class="cal-icon" fill="none">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="calendar-strip__btn" id="calNext" aria-label="Наступний місяць">
              <svg viewBox="0 0 24 24" class="cal-icon" fill="none">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10.7422 15.5307L14.2622 12.0007L10.7422 8.4707" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="calendar-strip__days" id="calDays"></div>
      </section>

      <div class="card">
        <div class="h3" id="dayTitle">Записи на сьогодні</div>
        <div id="todayList" class="list"></div>
      </div>
    </section>
  `;

  // ---------- FIREBASE ДАНІ ----------
  const { auth, db, collection, getDocs, doc, updateDoc } = await fb();
  const uid = auth.currentUser?.uid;
  if (!uid) {
    root.querySelector('#stats')?.replaceWith(document.createElement('div'));
    const list = root.querySelector('#todayList');
    if (list) list.innerHTML = '<small>Авторизуйтесь…</small>';
    return;
  }

  // ---------- HELPERS (дати/утиліти) ----------
  const atStartOfDay = d => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const sameDay = (a,b) =>
    a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const monthLabel = d => d.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  const dowShort = d => d.toLocaleDateString('uk-UA', { weekday: 'short' });
  const titleForDate = d => sameDay(d, atStartOfDay(new Date()))
    ? 'Записи на сьогодні'
    : `Записи на ${d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}`;
  const lockPageScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const x = window.scrollX || document.documentElement.scrollLeft || 0;
    return () => window.scrollTo({ top: y, left: x, behavior: 'auto' });
  };
  const centerDayHorizontally = (container, el, behavior = 'smooth') => {
    if (!container || !el) return;
    const c = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const delta = (r.left - c.left) - (c.width - r.width) / 2;
    container.scrollBy({ left: delta, behavior });
  };
  const positionTodaySecondFromLeft = (daysWrap, behavior = 'auto') => {
    if (!daysWrap) return;
    const isNarrow = window.matchMedia('(max-width: 768px)').matches;
    if (!isNarrow) return;
    const todayEl = daysWrap.querySelector('.cal-day--today');
    if (!todayEl) return;
    const desiredLeft = todayEl.offsetLeft - daysWrap.clientWidth * 0.25;
    const maxLeft = Math.max(0, daysWrap.scrollWidth - daysWrap.clientWidth);
    const left = Math.min(maxLeft, Math.max(0, desiredLeft));
    requestAnimationFrame(() => daysWrap.scrollTo({ left, behavior }));
  };
  const applyRovingTabindex = (daysWrap) => {
    const btns = [...daysWrap.querySelectorAll('.cal-day')];
    btns.forEach(b => b.setAttribute('tabindex', '-1'));
    const active = daysWrap.querySelector('.cal-day--active') || btns[0];
    if (active) active.setAttribute('tabindex', '0');
  };

  // ---------- РЕНДЕР КАЛЕНДАР-СТРІЧКИ ----------
  function renderCalendarStrip(rootEl, currentMonthDate, allAppointments, onPickDate, selectedDate){
    const head = rootEl.querySelector('.calendar-strip__head .calendar-strip__title');
    const daysWrap = rootEl.querySelector('.calendar-strip__days');
    if (!head || !daysWrap) return;

    head.textContent = monthLabel(currentMonthDate);

    const byDayCount = new Map();
    allAppointments.forEach(a => {
      const d = new Date(a.ts || a.date || a.start || a.time);
      const key = ymd(atStartOfDay(d));
      byDayCount.set(key, (byDayCount.get(key) || 0) + 1);
    });

    daysWrap.innerHTML = '';
    const y = currentMonthDate.getFullYear();
    const m = currentMonthDate.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++){
      const d = new Date(y, m, day);
      const key = ymd(d);
      const count = byDayCount.get(key) || 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      if (sameDay(d, new Date())) btn.classList.add('cal-day--today');
      if (selectedDate && sameDay(d, selectedDate)) btn.classList.add('cal-day--active');

      btn.dataset.date = d.toISOString();
      btn.innerHTML = `
        <span class="cal-day__dow">${dowShort(d)}</span>
        <span class="cal-day__num">${day}</span>
        ${count ? `<span class="cal-day__count">${count}</span>` : ''}
      `;
      daysWrap.appendChild(btn);
    }

    applyRovingTabindex(daysWrap);

    const target =
      daysWrap.querySelector('.cal-day--active') ||
      daysWrap.querySelector('.cal-day--today');

    requestAnimationFrame(() => {
      scrollDayIntoView(target, daysWrap, 'auto');
      try { target?.focus({ preventScroll: true }); } catch (_) {}
    });

    // делегування на пік дня
    daysWrap.onclick = (e) => {
      const btn = e.target.closest('.cal-day');
      if (!btn) return;
      onPickDate(atStartOfDay(new Date(btn.dataset.date)));
    };
  }

  // ---------- ЗАВАНТАЖЕННЯ ДАНИХ ----------
  const clientsSnap = await getDocs(collection(db, 'users', uid, 'clients'));
  const clients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const clientsById = Object.fromEntries(clients.map(c => [c.id, c]));

  const servicesSnap = await getDocs(collection(db, 'users', uid, 'services'));
  const services = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  async function pickApptCollection() {
    const candidates = [
      ['users', uid, 'appointments'],
      ['users', uid, 'records'],
      ['users', uid, 'bookings'],
      ['users', uid, 'entries'],
      ['appointments'],
    ];
    for (const p of candidates) {
      try {
        const snap = await getDocs(collection(db, ...p));
        if (snap.size > 0) return { path: p, snap };
      } catch (_) {}
    }
    const defPath = ['users', uid, 'appointments'];
    const defSnap = await getDocs(collection(db, ...defPath));
    return { path: defPath, snap: defSnap };
  }

  const picked = await pickApptCollection();

  const appointments = picked.snap.docs
    .map(d => {
      const a = normalizeAppt({ id: d.id, ...d.data() });
      const cli = a.clientId ? clientsById[a.clientId] : null;
      a.clientName =
        (cli?.name) ||
        ([cli?.firstName, cli?.lastName].filter(Boolean).join(' ').trim()) ||
        (cli?.fullName) || (cli?.phone) || '';
      return a;
    })
    .sort((a, b) => (a.ts || 0) - (b.ts || 0));

  const appointmentsById = Object.fromEntries(appointments.map(a => [a.id, a]));

  // ---------- KPI ----------
  const todayStart = new Date().setHours(0,0,0,0);
  const todayEnd   = new Date().setHours(23,59,59,999);
  const todayAll   = appointments.filter(a => (a.ts >= todayStart && a.ts <= todayEnd));
  const totalToday = sumBy(todayAll, a => toNumber(a.price));
  const paidToday  = sumBy(todayAll.filter(a => !!a.paid), a => toNumber(a.price));

  const kpis = [
    { label: 'Клієнтів',          value: clients.length,                 icon: iconUsers()    },
    { label: 'Записів сьогодні',  value: todayAll.length,                icon: iconCalendar() },
    { label: 'Сума',              value: `${formatMoney(totalToday)} ₴`, icon: iconCurrency() },
    { label: 'Оплачено',          value: `${formatMoney(paidToday)} ₴`,  icon: iconCheck()    },
  ];
  const statsWrap = root.querySelector('#stats');
  if (statsWrap) {
    statsWrap.outerHTML = `
      <div id="stats" class="kpi-wrap">
        ${kpis.map(k => `
          <div class="kpi-pill">
            <div class="kpi-left">
              <div class="kpi-ico">${k.icon}</div>
              <div class="kpi-label">${k.label}</div>
            </div>
            <div class="kpi-value">${k.value}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ---------- СТЕЙТ КАЛЕНДАРЯ ----------
  const savedYMD   = localStorage.getItem('dashSelectedDate');
  const today      = atStartOfDay(new Date());
  const savedDate  = parseYMD(savedYMD);
  let selectedDate = (savedDate && sameDay(savedDate, today)) ? savedDate : today;
  let currentMonth = atStartOfDay(new Date(selectedDate));

  const calEl      = document.getElementById('calendarStrip');
  const prevBtn    = document.getElementById('calPrev');
  const nextBtn    = document.getElementById('calNext');
  const todayBtn   = document.getElementById('calToday');
  const dayTitle   = document.getElementById('dayTitle');
  const daysWrapEl = document.getElementById('calDays');

  function onPickDate(d){
    const restoreScroll = lockPageScroll();
    selectedDate = atStartOfDay(d);
    localStorage.setItem('dashSelectedDate', ymd(selectedDate));
    if (dayTitle) dayTitle.textContent = titleForDate(selectedDate);

    renderCalendarStrip(calEl, currentMonth, appointments, onPickDate, selectedDate);
    renderListForSelectedDay();

    restoreScroll();

    const active = daysWrapEl?.querySelector('.cal-day--active');
    if (active) {
      try { active.focus({ preventScroll: true }); } catch(_) {}
      scrollDayIntoView(active, daysWrapEl, 'smooth');
    }
  }

  // Горизонтальний скрол колесиком
  if (daysWrapEl && !daysWrapEl.__wheel) {
    daysWrapEl.addEventListener('wheel', (e) => {
      const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (horiz !== 0) {
        e.preventDefault();
        daysWrapEl.scrollLeft += horiz;
      }
    }, { passive: false });
    daysWrapEl.__wheel = true;
  }

  // Список за обраний день
  function renderListForSelectedDay(){
    const items = appointments.filter(a=>{
      const dt = new Date(a.ts || a.date || a.start || a.time);
      return sameDay(atStartOfDay(dt), selectedDate);
    });

    const list = document.getElementById('todayList');
    if (!list) return;

    const sum = formatMoney(sumBy(items, a => toNumber(a.price)));
    if (dayTitle) {
      const base = titleForDate(selectedDate);
      dayTitle.textContent = items.length ? `${base} — ${items.length} шт · ${sum} ₴` : base;
    }

    list.innerHTML = items.length
      ? items.map(r => rowHTML(r, { soft:false })).join('')
      : `<div style="padding:8px 0;color:#6b7280"><small>На цю дату записів немає</small></div>`;
  }

  // Делегування на кнопку “Редагувати”
  const listEl = document.getElementById('todayList');
  if (listEl && !listEl.__editBound) {
    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-edit-appt');
      if (!btn) return;
      const id = btn.dataset.id || btn.closest('[data-id]')?.dataset.id;
      if (!id) return;
      const appt = appointmentsById[id];
      if (appt) openEditModal(appt);
    });
    listEl.__editBound = true;
  }

  // Кнопки навігації місяцем
  prevBtn?.addEventListener('click', ()=>{
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1, 1);
    renderCalendarStrip(calEl, currentMonth, appointments, onPickDate, selectedDate);
  });
  nextBtn?.addEventListener('click', ()=>{
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1);
    renderCalendarStrip(calEl, currentMonth, appointments, onPickDate, selectedDate);
  });
  todayBtn?.addEventListener('click', ()=>{
    selectedDate = atStartOfDay(new Date());
    currentMonth = atStartOfDay(new Date());
    localStorage.setItem('dashSelectedDate', ymd(selectedDate));
    if (dayTitle) dayTitle.textContent = titleForDate(selectedDate);
    renderCalendarStrip(calEl, currentMonth, appointments, onPickDate, selectedDate);
    renderListForSelectedDay();
  });

  // первинний рендер
  renderCalendarStrip(calEl, currentMonth, appointments, onPickDate, selectedDate);
  if (dayTitle) dayTitle.textContent = titleForDate(selectedDate);
  renderListForSelectedDay();

  // після першого рендера — якщо сьогодні, зробимо другим зліва; інакше — центр
  const firstActive = document.querySelector('#calDays .cal-day--active');
  if (sameDay(selectedDate, new Date())) {
    positionTodaySecondFromLeft(document.getElementById('calDays'), 'auto');
  } else if (firstActive) {
    centerDayHorizontally(document.getElementById('calDays'), firstActive, 'auto');
  }

  // === МОДАЛКА РЕДАГУВАННЯ ===================================================
  function ensureEditModal() {
    if (document.getElementById('editApptModal')) return;
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="modal" id="editApptModal" role="dialog" aria-modal="true">
        <div class="modal__backdrop"></div>
        <div class="modal__dialog">
          <div class="modal__header">
            <div class="modal__title">Редагувати запис</div>
            <button class="modal__close" id="editApptClose" type="button" aria-label="Закрити">
              <img src="icons/close.svg" alt="" width="32" height="32">
            </button>
          </div>
          <div class="modal__body">
            <input type="hidden" id="edit-appt-id">
            <label>Клієнт
              <select id="editClientSel"></select>
            </label>
            <label>Послуга
              <select id="editServiceSel"></select>
            </label>
            <label>Дата <input id="editDate" type="date"></label>
            <label>Час  <input id="editTime" type="time"></label>
            <label>Ціна <input id="editPrice" type="number" min="0" step="1"></label>
            <label>Статус
              <select id="editStatus">
                <option value="scheduled">Заплановано</option>
                <option value="done">Виконано</option>
                <option value="canceled">Скасовано</option>
              </select>
            </label>
            <label><input id="editPaid" type="checkbox"> Оплачено</label>
          </div>
          <div class="modal__actions">
            <button class="btn-primary" id="editApptSave" type="button">Зберегти</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  // iOS-safe блокування скролу сторінки під модалкою
  function lockBodyScroll() {
    const y = window.scrollY || 0;
    document.body.dataset.scrollY = String(y);
    document.body.style.position = 'fixed';
    document.body.style.top = `-${y}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.classList.add('modal-open');
  }
  function unlockBodyScroll() {
    const y = Number(document.body.dataset.scrollY || 0);
    document.body.classList.remove('modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    delete document.body.dataset.scrollY;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }

  let editingAppt = null;

  function openEditModal(appt) {
    ensureEditModal();
    editingAppt = appt;

    const d = new Date(appt.ts);
    const modal = document.getElementById('editApptModal');

    // заповнення полів
    document.getElementById('edit-appt-id').value = appt.id;

    const clientSel  = document.getElementById('editClientSel');
    const serviceSel = document.getElementById('editServiceSel');

    const _clients  = Array.isArray(clients)  ? clients  : [];
    const _services = Array.isArray(services) ? services : [];

    const nameFromClient = (c) =>
      (c?.name) ||
      ([c?.firstName, c?.lastName].filter(Boolean).join(' ').trim()) ||
      (c?.fullName) || (c?.phone) || '';

    const clientOptions = [''].concat(_clients.map(nameFromClient).filter(Boolean));
    clientSel.innerHTML = clientOptions
      .map(n => `<option value="${n}" ${n === (appt.clientName || '') ? 'selected' : ''}>${n}</option>`)
      .join('');

    const serviceOptions = [''].concat(_services.map(s => s.title).filter(Boolean));
    serviceSel.innerHTML = serviceOptions
      .map(t => `<option value="${t}" ${t === (appt.title || appt.service || appt.serviceTitle || '') ? 'selected' : ''}>${t}</option>`)
      .join('');

    serviceSel.onchange = () => {
      const t = serviceSel.value;
      const svc = _services.find(s => s.title === t);
      if (svc && Number(svc.priceDefault) > 0) {
        document.getElementById('editPrice').value = Number(svc.priceDefault);
      }
    };

    document.getElementById('editDate').value    = d.toISOString().slice(0,10);
    document.getElementById('editTime').value    = d.toTimeString().slice(0,5);
    document.getElementById('editPrice').value   = appt.price || '';
    document.getElementById('editStatus').value  = appt.status || 'scheduled';
    document.getElementById('editPaid').checked  = !!appt.paid;

    // показати модалку
    modal.classList.add('open');

    // важливо для Safari: не фокусимо поля (особливо <select>), щоб не відкривався список сам
    try { document.activeElement?.blur(); } catch(_) {}
    const tempUnfocus = [];
    modal.querySelectorAll('select').forEach(sel => {
      if (!sel.hasAttribute('data-prev-tabindex')) {
        sel.setAttribute('data-prev-tabindex', sel.getAttribute('tabindex') ?? '');
      }
      sel.setAttribute('tabindex', '-1');
      tempUnfocus.push(sel);
    });
    setTimeout(() => {
      tempUnfocus.forEach(sel => {
        const prev = sel.getAttribute('data-prev-tabindex');
        if (prev === '') sel.removeAttribute('tabindex');
        else sel.setAttribute('tabindex', prev);
        sel.removeAttribute('data-prev-tabindex');
      });
    }, 200);

    lockBodyScroll();
  }

  function closeEditModal(){
    const modal = document.getElementById('editApptModal');
    if (!modal) return;
    try { document.activeElement?.blur(); } catch(_) {}
    modal.classList.remove('open');
    unlockBodyScroll();
    editingAppt = null;
  }

  (function wireEditModal(){
    ensureEditModal();
    const modal = document.getElementById('editApptModal');
    if (!modal) return;

    // клік по фону
    const scrim = modal.querySelector('.modal__backdrop');
    scrim?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeEditModal();
    });

    // клік по ✕ — блокуємо «клік крізь» у Safari
    const x = document.getElementById('editApptClose');
    if (x && !x.__wired) {
      x.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { document.activeElement?.blur(); } catch(_) {}
        closeEditModal();
        setTimeout(() => { void document.body.offsetHeight; }, 120);
      });
      x.__wired = true;
    }

    document.getElementById('editApptSave')?.addEventListener('click', saveEditedAppt);
  })();

  async function saveEditedAppt() {
    const id = document.getElementById('edit-appt-id')?.value;
    if (!id) { alert('Не знайдено ID запису. Спробуйте ще раз.'); return; }

    const clientEl  = document.getElementById('editClientSel')  || document.getElementById('editClient');
    const serviceEl = document.getElementById('editServiceSel') || document.getElementById('editService');

    const clientVal = (clientEl?.value || '').trim();
    const titleVal  = (serviceEl?.value || '').trim();

    const dateVal   = (document.getElementById('editDate')?.value || '').trim();
    const timeVal   = (document.getElementById('editTime')?.value || '').trim();
    const priceVal  = Number(document.getElementById('editPrice')?.value) || 0;
    const statusVal = (document.getElementById('editStatus')?.value) || 'scheduled';
    const paidVal   = !!document.getElementById('editPaid')?.checked;

    if (!dateVal || !timeVal) { alert('Заповніть дату і час'); return; }

    const ts = Number(new Date(`${dateVal}T${timeVal}`));

    try {
      const ref = doc(db, ...picked.path, id);
      await updateDoc(ref, {
        ts, title: titleVal, price: priceVal,
        status: statusVal, paid: paidVal, clientName: clientVal,
      });

      const a = appointmentsById[id];
      if (a) {
        a.ts = ts; a.title = titleVal; a.price = priceVal;
        a.status = statusVal; a.paid = paidVal; a.clientName = clientVal;
      }

      closeEditModal();
      renderListForSelectedDay();
    } catch (err) {
      console.error('Update failed:', err);
      alert('Помилка збереження у Firestore');
    }
  }
}

/* ---------------- helpers (поза render) ---------------- */

// підключити/замінити css сторінки
function usePageCss(href) {
  document.querySelectorAll('link[data-page-style]').forEach(l => l.remove());
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.pageStyle = 'true';
  document.head.appendChild(link);
}

// розбір YYYY-MM-DD
function parseYMD(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setHours(0, 0, 0, 0);
  return d;
}

// прокрутити день у видиму область
function scrollDayIntoView(dayEl, wrap, behavior = 'auto') {
  if (!wrap || !dayEl) return;
  const isDesktop = matchMedia('(min-width: 900px)').matches;
  const ratio = isDesktop ? 0.5 : 0.25; // 0.5 = центр, 0.25 = другий зліва
  const desired = dayEl.offsetLeft - (wrap.clientWidth - dayEl.offsetWidth) * ratio;
  const max = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
  const left = Math.max(0, Math.min(desired, max));
  wrap.scrollTo({ left, behavior });
}

// нормалізація запису
function normalizeAppt(a) {
  if (typeof a.ts === 'string' && /^\d+$/.test(a.ts)) a.ts = Number(a.ts);
  if (a.ts && typeof a.ts === 'object' && typeof a.ts.seconds === 'number') {
    a.ts = a.ts.seconds * 1000;
  }
  if (typeof a.ts === 'number' && a.ts > 0 && a.ts < 1e12) a.ts = a.ts * 1000;
  if (!a.ts) {
    if (a.date) {
      const dateStr = toYMDString(a.date);
      const [Y, M, D] = dateStr.split('-').map(Number);
      let hh = 0, mm = 0;
      if (a.time) [hh, mm] = a.time.split(':').map(Number);
      a.ts = new Date(Y, (M || 1) - 1, D || 1, hh || 0, mm || 0).getTime();
    } else {
      a.ts = Date.now();
    }
  }
  a.localDate = a.date ? toYMDString(a.date) : ymdFromTs(a.ts);
  return a;
}

function ymdFromTs(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toYMDString(str) {
  if (!str) return '';
  const s = String(str).trim().replace(/\s+/g, '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})$/);
  if (m) {
    const dd = String(m[1]).padStart(2, '0');
    const mm = String(m[2]).padStart(2, '0');
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return s;
}

function toNumber(v) {
  if (v == null) return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return isFinite(n) ? n : 0;
}

function sumBy(arr, sel) { return arr.reduce((s, x) => s + (sel(x) || 0), 0); }
function formatMoney(n) { return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(n || 0); }
function dateTimeStr(ts) {
  const d = new Date(ts);
  const dd = d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
  const tt = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  return `${dd} · ${tt}`;
}
function statusDot(status) {
  const map = { scheduled: 'scheduled', done: 'done', canceled: 'canceled' };
  return `<span class="status-dot ${map[status] || 'scheduled'}"></span>`
}
function paidBadge(paid, soft=false) {
  if (soft) return `<span class="badge ${paid ? 'paid-soft' : 'unpaid-soft'}">${paid ? 'Оплачено' : 'Не оплачено'}</span>`;
  return `<span class="badge ${paid ? 'paid' : 'unpaid'}">${paid ? 'Оплачено' : 'Не оплачено'}</span>`;
}
function rowHTML(r, { soft }) {
  const title = (r.title?.trim()) || (r.service?.trim()) || (r.serviceTitle?.trim()) || 'Без назви';
  const price = r.price ? formatMoney(r.price) : '';
  return `
    <div class="row" data-id="${r.id}">
      <div class="row-left">
        <div>${statusDot(r.status)}</div>
        <div class="row-left-info">
          <div class="title_name"><strong>${title}</strong><strong> / </strong><strong class="client">${r.clientName || ''}</strong></div>
          <small>${dateTimeStr(r.ts)}</small>
          <div class="badge_price">
            <div>${price ? `<b class="num">${price}</b><span class="cur"> ₴</span>` : ''}</div>
            <div class="badge_m">${paidBadge(!!r.paid, soft)}</div>
          </div>
        </div>
      </div>

      <div class="row-right">
        <button class="btn-primary js-edit-appt" title="Редагувати" aria-label="Редагувати" data-id="${r.id}">
          Редагувати запис
        </button>
      </div>
    </div>
  `;
}

/* ---------- icons (inline SVG) безопасні однорядкові ---------- */
function iconUsers() {
  return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24.1858 28.827C23.0125 29.1737 21.6258 29.3337 19.9992 29.3337H11.9992C10.3725 29.3337 8.98583 29.1737 7.8125 28.827C8.10583 25.3603 11.6658 22.627 15.9992 22.627C20.3325 22.627 23.8925 25.3603 24.1858 28.827Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.9974 2.66602H11.9974C5.33073 2.66602 2.66406 5.33268 2.66406 11.9993V19.9993C2.66406 25.0393 4.18406 27.7993 7.81073 28.826C8.10406 25.3593 11.6641 22.626 15.9974 22.626C20.3307 22.626 23.8907 25.3593 24.1841 28.826C27.8107 27.7993 29.3307 25.0393 29.3307 19.9993V11.9993C29.3307 5.33268 26.6641 2.66602 19.9974 2.66602ZM15.9974 18.8927C13.3574 18.8927 11.2241 16.746 11.2241 14.106C11.2241 11.466 13.3574 9.33268 15.9974 9.33268C18.6374 9.33268 20.7707 11.466 20.7707 14.106C20.7707 16.746 18.6374 18.8927 15.9974 18.8927Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function iconCalendar() {
  return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.6641 16.2656H19.9974" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.6641 21.5996H16.5041" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.3307 7.99935H18.6641C21.3307 7.99935 21.3307 6.66602 21.3307 5.33268C21.3307 2.66602 19.9974 2.66602 18.6641 2.66602H13.3307C11.9974 2.66602 10.6641 2.66602 10.6641 5.33268C10.6641 7.99935 11.9974 7.99935 13.3307 7.99935Z" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M21.3333 5.35938C25.7733 5.59938 28 7.23937 28 13.3327V21.3327C28 26.666 26.6667 29.3327 20 29.3327H12C5.33333 29.3327 4 26.666 4 21.3327V13.3327C4 7.25271 6.22667 5.59938 10.6667 5.35938" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function iconCurrency() {
  return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5625 19.1071C11.5625 20.8271 12.8825 22.2138 14.5225 22.2138H17.8692C19.2958 22.2138 20.4558 21.0004 20.4558 19.5071C20.4558 17.8804 19.7492 17.3071 18.6958 16.9338L13.3225 15.0671C12.2692 14.6938 11.5625 14.1204 11.5625 12.4938C11.5625 11.0004 12.7225 9.78711 14.1492 9.78711H17.4958C19.1358 9.78711 20.4558 11.1738 20.4558 12.8938" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 8V24" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.9974 29.3327H11.9974C5.33073 29.3327 2.66406 26.666 2.66406 19.9993V11.9993C2.66406 5.33268 5.33073 2.66602 11.9974 2.66602H19.9974C26.6641 2.66602 29.3307 5.33268 29.3307 11.9993V19.9993C29.3307 26.666 26.6641 29.3327 19.9974 29.3327Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function iconCheck() {
  return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.0182 20.584H12.3516" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.6875 17.3301V23.9967" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.8839 3.35686L16.8439 3.4502L12.9772 12.4235H9.17719C8.27052 12.4235 7.40385 12.6102 6.61719 12.9435L8.95052 7.3702L9.00385 7.23686L9.09719 7.02353C9.12385 6.94353 9.15052 6.86353 9.19052 6.79686C10.9372 2.75686 12.9105 1.83686 16.8839 3.35686Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M24.0621 12.6908C23.4621 12.5041 22.8221 12.4241 22.1821 12.4241H12.9688L16.8354 3.45076L16.8754 3.35742C17.0754 3.42409 17.2621 3.51742 17.4621 3.59742L20.4088 4.83742C22.0488 5.51742 23.1954 6.22409 23.8887 7.07742C24.0221 7.23742 24.1287 7.38409 24.2221 7.55742C24.3421 7.74409 24.4354 7.93076 24.4888 8.13076C24.5421 8.25076 24.5821 8.37076 24.6088 8.47742C24.9688 9.59742 24.7554 10.9708 24.0621 12.6908Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M28.7008 18.9305V21.5305C28.7008 21.7972 28.6875 22.0638 28.6742 22.3305C28.4208 26.9838 25.8208 29.3305 20.8875 29.3305H10.4875C10.1675 29.3305 9.8475 29.3038 9.54083 29.2638C5.30083 28.9838 3.03417 26.7172 2.75417 22.4772C2.71417 22.1705 2.6875 21.8505 2.6875 21.5305V18.9305C2.6875 16.2505 4.31417 13.9438 6.63417 12.9438C7.43417 12.6105 8.2875 12.4238 9.19417 12.4238H22.2075C22.8608 12.4238 23.5008 12.5172 24.0875 12.6905C26.7408 13.5038 28.7008 15.9838 28.7008 18.9305Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* Після приховання клавіатури в Safari злегка «підштовхуємо» рефлоу */
document.addEventListener('focusout', () => {
  setTimeout(() => { void document.body.offsetHeight; }, 120);
}, true);

/* iOS/Safari: під час фокусу в модалці фіксуємо body, щоб не «їхав» лейаут.
   Використовуємо делегування, бо модалка створюється динамічно. */
document.addEventListener('focusin', (e) => {
  if (e.target.closest('#editApptModal.open')) {
    document.body.style.position = 'fixed';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
});

document.addEventListener('focusout', (e) => {
  if (e.target.closest('#editApptModal')) {
    // Відновлюємо тільки коли фокус пішов З МОДАЛКИ
    setTimeout(() => {
      const ae = document.activeElement;
      if (!ae || !ae.closest('#editApptModal')) {
        document.body.style.position = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
      }
    }, 0);
  }
});
