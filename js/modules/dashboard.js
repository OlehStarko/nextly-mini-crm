// public/js/modules/dashboard.js
import { fb } from '../db/firebase.js';

export async function render(root) {
  // ---------- РОЗМІТКА ----------
  root.innerHTML = `
    <section>
      <div id="stats"></div>

      <section class="calendar-strip" id="calendarStrip">
        <div class="calendar-strip__head">
          <div class="calendar-strip__title">Місяць</div>

          <div class="calendar-strip__nav">
            <!-- Prev -->
            <button class="calendar-strip__btn" id="calPrev" aria-label="Попередній місяць">
              <svg viewBox="0 0 24 24" class="cal-icon" fill="none">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13.2578 8.4707L9.73779 12.0007L13.2578 15.5307"
                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>

            <!-- Today -->
            <button class="calendar-strip__btn" id="calToday" aria-label="Сьогодні">
              <svg viewBox="0 0 24 24" class="cal-icon" fill="none">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="2.5"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>

            <!-- Next -->
            <button class="calendar-strip__btn" id="calNext" aria-label="Наступний місяць">
              <svg viewBox="0 0 24 24" class="cal-icon" fill="none">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10.7422 15.5307L14.2622 12.0007L10.7422 8.4707"
                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
  const { auth, db, collection, getDocs } = await fb();
  const uid = auth.currentUser?.uid;
  if (!uid) {
    const stats = root.querySelector('#stats');
    const list = root.querySelector('#todayList');
    if (stats) stats.innerHTML = '';
    if (list) list.innerHTML = '<small>Авторизуйтесь…</small>';
    return;
  }

  // ---------- HELPERS (дати) ----------
  function atStartOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
  function sameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
  function ymd(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function monthLabel(d){ return d.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' }); }
  function dowShort(d){ return d.toLocaleDateString('uk-UA', { weekday: 'short' }); }
  function titleForDate(d){
    const today = atStartOfDay(new Date());
    if (sameDay(d, today)) return 'Записи на сьогодні';
    return `Записи на ${d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}`;
  }

  // ---------- РЕНДЕР КАЛЕНДАР-СТРІЧКИ ----------
  function renderCalendarStrip(rootEl, currentMonthDate, allAppointments, onPickDate, selectedDate){
    const head = rootEl.querySelector('.calendar-strip__head .calendar-strip__title');
    const daysWrap = rootEl.querySelector('.calendar-strip__days');
    if (!head || !daysWrap) return;

    head.textContent = monthLabel(currentMonthDate);

    // підрахунок кількості записів на день
    const byDayCount = new Map();
    allAppointments.forEach(a=>{
      const d = new Date(a.ts || a.date || a.start || a.time);
      const key = ymd(atStartOfDay(d));
      byDayCount.set(key, (byDayCount.get(key)||0)+1);
    });

    // Будуємо дні
    daysWrap.innerHTML = '';
    const y = currentMonthDate.getFullYear();
    const m = currentMonthDate.getMonth();
    const daysInMonth = new Date(y, m+1, 0).getDate();

    for (let day=1; day<=daysInMonth; day++){
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

    // Після побудови — показати активний у центрі
    const active = daysWrap.querySelector('.cal-day--active');
    if (active) active.scrollIntoView({ block:'nearest', inline:'center', behavior:'smooth' });
  }

  // ---------- ЗАВАНТАЖЕННЯ ДАНИХ ----------
  const clientsSnap = await getDocs(collection(db, 'users', uid, 'clients'));
  const clients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const clientsById = Object.fromEntries(clients.map(c => [c.id, c]));

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

  const appointments = picked.snap.docs.map(d => {
    const a = normalizeAppt({ id: d.id, ...d.data() });
    const cli = a.clientId ? clientsById[a.clientId] : null;
    a.clientName =
      (cli?.name) ||
      ([cli?.firstName, cli?.lastName].filter(Boolean).join(' ').trim()) ||
      (cli?.fullName) ||
      (cli?.phone) || '';
    return a;
  }).sort((a, b) => (a.ts || 0) - (b.ts || 0));

  // ---------- KPI ----------
  const todayStart = new Date().setHours(0,0,0,0);
  const todayEnd   = new Date().setHours(23,59,59,999);
  const todayAll = appointments.filter(a => (a.ts >= todayStart && a.ts <= todayEnd));
  const totalToday = sumBy(todayAll, a => toNumber(a.price));
  const paidToday  = sumBy(todayAll.filter(a => !!a.paid), a => toNumber(a.price));

  const kpis = [
    { label: 'Клієнтів',          value: clients.length,                icon: iconUsers()    },
    { label: 'Записів сьогодні',  value: todayAll.length,               icon: iconCalendar() },
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
  const saved = localStorage.getItem('dashSelectedDate');
  let selectedDate = saved ? atStartOfDay(new Date(saved)) : atStartOfDay(new Date());
  let currentMonth = atStartOfDay(new Date(selectedDate));

  const calEl    = document.getElementById('calendarStrip');
  const prevBtn  = document.getElementById('calPrev');
  const nextBtn  = document.getElementById('calNext');
  const todayBtn = document.getElementById('calToday');
  const dayTitle = document.getElementById('dayTitle');
  const daysWrapEl = document.getElementById('calDays');

  function onPickDate(d){
    selectedDate = atStartOfDay(d);
    localStorage.setItem('dashSelectedDate', selectedDate.toISOString());
    if (dayTitle) dayTitle.textContent = titleForDate(selectedDate);
    renderCalendarStrip(calEl, currentMonth, appointments, onPickDate, selectedDate);
    renderListForSelectedDay();
  }

  // --- Горизонтальний скрол + ТАП-ВИБІР на pointerup (разово) ---
if (daysWrapEl && !daysWrapEl.__hasScrollTapHandlers) {
  // 1) Колесо/трекпад -> горизонтальний скрол
  daysWrapEl.addEventListener('wheel', (e) => {
    const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (horiz !== 0) {
      e.preventDefault();               // потрібно passive:false
      daysWrapEl.scrollLeft += horiz;
    }
  }, { passive: false });

  // 2) Drag/Swipe + Tap
  let isDown = false;
  let startX = 0, startY = 0;
  let startScroll = 0;
  let moved = 0;
  let tapStartBtn = null;               // на чому почали тап

  daysWrapEl.addEventListener('pointerdown', (e) => {
    isDown = true;
    moved = 0;
    startX = e.clientX;
    startY = e.clientY;
    startScroll = daysWrapEl.scrollLeft;
    tapStartBtn = e.target.closest('.cal-day');
    daysWrapEl.setPointerCapture(e.pointerId);
    daysWrapEl.classList.add('dragging');
  });

  daysWrapEl.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 8) moved = 1;   // поріг
    daysWrapEl.scrollLeft = startScroll - dx;
  });

  function endDragCommon(e) {
    if (!isDown) return;
    isDown = false;
    daysWrapEl.classList.remove('dragging');
    daysWrapEl.releasePointerCapture?.(e.pointerId);

    // Якщо НЕ тягнули — це «тап»: обираємо день
    if (!moved) {
      // Ціль на момент відпускання (якщо поїхали — беремо за координатою)
      const upTarget = e.target.closest('.cal-day') ||
        (document.elementFromPoint(e.clientX, e.clientY)?.closest('.cal-day'));
      const btn = upTarget || tapStartBtn;
      if (btn && btn.dataset.date) {
        const d = new Date(btn.dataset.date);
        onPickDate(atStartOfDay(d));
      }
    }

    // скинути
    moved = 0;
    tapStartBtn = null;
  }

  daysWrapEl.addEventListener('pointerup', endDragCommon);
  daysWrapEl.addEventListener('pointercancel', endDragCommon);
  daysWrapEl.addEventListener('pointerleave', endDragCommon);

  // 3) Не блокуємо подію click зовсім — ми вже все зробили на pointerup
  // (жодних stopPropagation тут не треба)

  daysWrapEl.__hasScrollTapHandlers = true;
}





 


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
    if (dayTitle) dayTitle.textContent = titleForDate(selectedDate);
    renderCalendarStrip(calEl, currentMonth, appointments, onPickDate, selectedDate);
    renderListForSelectedDay();
  });

  // Клавіатурні шорткати
  document.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') {
      selectedDate = atStartOfDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1));
      if (selectedDate.getMonth() !== currentMonth.getMonth()) {
        currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      }
      onPickDate(selectedDate);
    }
    if (e.key === 'ArrowRight') {
      selectedDate = atStartOfDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1));
      if (selectedDate.getMonth() !== currentMonth.getMonth()) {
        currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      }
      onPickDate(selectedDate);
    }
    if (e.key === 'PageUp') {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      renderCalendarStrip(calEl, currentMonth, appointments, onPickDate, selectedDate);
    }
    if (e.key === 'PageDown') {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      renderCalendarStrip(calEl, currentMonth, appointments, onPickDate, selectedDate);
    }
  });

  // первинний рендер
  renderCalendarStrip(calEl, currentMonth, appointments, onPickDate, selectedDate);
  if (dayTitle) dayTitle.textContent = titleForDate(selectedDate);
  renderListForSelectedDay();
}

/* ---------------- helpers ---------------- */
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
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return s;
}
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
  return `<span class="status-dot ${map[status] || 'scheduled'}"></span>`;
}
function paidBadge(paid, soft=false) {
  if (soft) return `<span class="badge ${paid ? 'paid-soft' : 'unpaid-soft'}">${paid ? 'Оплачено' : 'Не оплачено'}</span>`;
  return `<span class="badge ${paid ? 'paid' : 'unpaid'}">${paid ? 'Оплачено' : 'Не оплачено'}</span>`;
}
function rowHTML(r, { soft }) {
  const title = (r.title && r.title.trim())
    || (r.service && r.service.trim())
    || (r.serviceTitle && r.serviceTitle.trim())
    || 'Без назви';
  return `
    <div class="row">
      <div>
        ${statusDot(r.status)}
        <strong>${title}</strong><br>
        <small>${dateTimeStr(r.ts)}</small>
      </div>
      <div style="text-align:right">
        <small>${r.clientName || ''}</small><br>
        <strong>${r.price ? `${r.price} ₴` : ''}</strong><br>
        ${paidBadge(!!r.paid, soft)}
      </div>
    </div>
  `;
}

/* ---------- icons (inline SVG) ---------- */
function iconUsers(){ return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24.1858 28.827C23.0125 29.1737 21.6258 29.3337 19.9992 29.3337H11.9992C10.3725 29.3337 8.98583 29.1737 7.8125 28.827C8.10583 25.3603 11.6658 22.627 15.9992 22.627C20.3325 22.627 23.8925 25.3603 24.1858 28.827Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.9974 2.66602H11.9974C5.33073 2.66602 2.66406 5.33268 2.66406 11.9993V19.9993C2.66406 25.0393 4.18406 27.7993 7.81073 28.826C8.10406 25.3593 11.6641 22.626 15.9974 22.626C20.3307 22.626 23.8907 25.3593 24.1841 28.826C27.8107 27.7993 29.3307 25.0393 29.3307 19.9993V11.9993C29.3307 5.33268 26.6641 2.66602 19.9974 2.66602ZM15.9974 18.8927C13.3574 18.8927 11.2241 16.746 11.2241 14.106C11.2241 11.466 13.3574 9.33268 15.9974 9.33268C18.6374 9.33268 20.7707 11.466 20.7707 14.106C20.7707 16.746 18.6374 18.8927 15.9974 18.8927Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.7732 14.1073C20.7732 16.7473 18.6399 18.894 15.9999 18.894C13.3599 18.894 11.2266 16.7473 11.2266 14.1073C11.2266 11.4673 13.3599 9.33398 15.9999 9.33398C18.6399 9.33398 20.7732 11.4673 20.7732 14.1073Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function iconCalendar(){ return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.6641 16.2656H19.9974" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.6641 21.5996H16.5041" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.3307 7.99935H18.6641C21.3307 7.99935 21.3307 6.66602 21.3307 5.33268C21.3307 2.66602 19.9974 2.66602 18.6641 2.66602H13.3307C11.9974 2.66602 10.6641 2.66602 10.6641 5.33268C10.6641 7.99935 11.9974 7.99935 13.3307 7.99935Z" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M21.3333 5.35938C25.7733 5.59938 28 7.23937 28 13.3327V21.3327C28 26.666 26.6667 29.3327 20 29.3327H12C5.33333 29.3327 4 26.666 4 21.3327V13.3327C4 7.25271 6.22667 5.59938 10.6667 5.35938" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function iconCurrency(){ return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5625 19.1071C11.5625 20.8271 12.8825 22.2138 14.5225 22.2138H17.8692C19.2958 22.2138 20.4558 21.0004 20.4558 19.5071C20.4558 17.8804 19.7492 17.3071 18.6958 16.9338L13.3225 15.0671C12.2692 14.6938 11.5625 14.1204 11.5625 12.4938C11.5625 11.0004 12.7225 9.78711 14.1492 9.78711H17.4958C19.1358 9.78711 20.4558 11.1738 20.4558 12.8938" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 8V24" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.9974 29.3327H11.9974C5.33073 29.3327 2.66406 26.666 2.66406 19.9993V11.9993C2.66406 5.33268 5.33073 2.66602 11.9974 2.66602H19.9974C26.6641 2.66602 29.3307 5.33268 29.3307 11.9993V19.9993C29.3307 26.666 26.6641 29.3327 19.9974 29.3327Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function iconCheck(){ return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.0182 20.584H12.3516" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.6875 17.3301V23.9967" stroke="#1B1B1B" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.8839 3.35686L16.8439 3.4502L12.9772 12.4235H9.17719C8.27052 12.4235 7.40385 12.6102 6.61719 12.9435L8.95052 7.3702L9.00385 7.23686L9.09719 7.02353C9.12385 6.94353 9.15052 6.86353 9.19052 6.79686C10.9372 2.75686 12.9105 1.83686 16.8839 3.35686Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M24.0621 12.6908C23.4621 12.5041 22.8221 12.4241 22.1821 12.4241H12.9688L16.8354 3.45076L16.8754 3.35742C17.0754 3.42409 17.2621 3.51742 17.4621 3.59742L20.4088 4.83742C22.0488 5.51742 23.1954 6.22409 23.8887 7.07742C24.0221 7.23742 24.1287 7.38409 24.2221 7.55742C24.3421 7.74409 24.4354 7.93076 24.4888 8.13076C24.5421 8.25076 24.5821 8.37076 24.6088 8.47742C24.9688 9.59742 24.7554 10.9708 24.0621 12.6908Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M28.7008 18.9305V21.5305C28.7008 21.7972 28.6875 22.0638 28.6742 22.3305C28.4208 26.9838 25.8208 29.3305 20.8875 29.3305H10.4875C10.1675 29.3305 9.8475 29.3038 9.54083 29.2638C5.30083 28.9838 3.03417 26.7172 2.75417 22.4772C2.71417 22.1705 2.6875 21.8505 2.6875 21.5305V18.9305C2.6875 16.2505 4.31417 13.9438 6.63417 12.9438C7.43417 12.6105 8.2875 12.4238 9.19417 12.4238H22.2075C22.8608 12.4238 23.5008 12.5172 24.0875 12.6905C26.7408 13.5038 28.7008 15.9838 28.7008 18.9305Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.94406 7.36914L6.61073 12.9425C4.29073 13.9425 2.66406 16.2491 2.66406 18.9291V15.0225C2.66406 11.2358 5.3574 8.07581 8.94406 7.36914Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M28.6993 15.0242V18.9309C28.6993 15.9975 26.7526 13.5042 24.0859 12.7042C24.7793 10.9709 24.9793 9.61086 24.6459 8.47753C24.6193 8.35753 24.5793 8.23753 24.5259 8.13086C27.0059 9.41086 28.6993 12.0375 28.6993 15.0242Z" stroke="#1B1B1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }

/* ---------- utils ---------- */
function injectOnce(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style'); s.id = id; s.textContent = css;
  document.head.appendChild(s);
}
