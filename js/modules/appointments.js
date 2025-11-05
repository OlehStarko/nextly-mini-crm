// public/js/modules/appointments.js
import {
  apptCreate, apptListRange, apptRemove, apptUpdate,
  servicesList, clientsList
} from '../store/repository.cloud.js';

export async function render(root) {
  root.innerHTML = `
    <section class="section">
      <header class="grid">
        <div>
          <label>Базова дата</label>
          <input type="date" id="date" />
        </div>
        <div style="align-self:end; text-align:right; display:flex; gap:12px; flex-wrap:wrap; justify-content:flex-end;">
          <div class="btn-group" role="group" aria-label="Фільтр періоду">
            <button class="btn period" data-period="all">Усі</button>
            <button class="btn period" data-period="day">Сьогодні</button>
            <button class="btn period" data-period="week">Тиждень</button>
            <button class="btn period" data-period="month">Місяць</button>
          </div>
          <div id="statusFilters" class="status-filters" style="display:flex; gap:10px; align-items:center;">
            <label style="display:inline-flex;align-items:center;gap:6px;"><input type="checkbox" class="sf" value="scheduled" checked /> Заплановано</label>
            <label style="display:inline-flex;align-items:center;gap:6px;"><input type="checkbox" class="sf" value="done" checked /> Виконано</label>
            <label style="display:inline-flex;align-items:center;gap:6px;"><input type="checkbox" class="sf" value="canceled" checked /> Скасовано</label>
          </div>
          <div id="clientFilterWrap" style="display:flex; align-items:center; gap:8px;">
            <label for="clientFilter" style="opacity:.8;">Клієнт</label>
            <select id="clientFilter" style="min-width:220px;">
              <option value="">Усі клієнти</option>
            </select>
          </div>
          <button id="new">+ Новий запис</button>
        </div>
      </header>
      <div id="content" style="margin-top:12px;"></div>
    </section>

    <!-- Modal: створення/редагування запису -->
    <div class="modal" id="apptModal" aria-hidden="true" role="dialog" aria-labelledby="apptModalTitle">
      <div class="modal__backdrop" data-close="1"></div>
      <div class="modal__dialog">
        <div class="modal__header">
          <div class="modal__title" id="apptModalTitle">Новий запис</div>
          <button class="modal__close" data-close="1" aria-label="Закрити">✕</button>
        </div>

        <form id="apptForm" class="modal__body">
          <input type="hidden" id="apptId" />
          <div>
            <label for="apptClient">Клієнт</label>
            <select id="apptClient" required></select>
          </div>

          <div>
            <label for="apptService">Послуга</label>
            <select id="apptService">
              <option value="">— Виберіть —</option>
            </select>
            <div id="customServiceWrap" style="margin-top:8px; display:none;">
              <input id="apptTitle" placeholder="Інша послуга (назва)" />
            </div>
          </div>

          <div class="grid">
            <div>
              <label for="apptDate">Дата</label>
              <input type="date" id="apptDate" required />
            </div>
            <div>
              <label for="apptTime">Час</label>
              <input type="time" id="apptTime" required />
            </div>
          </div>

          <div class="grid">
            <div>
              <label for="apptPrice">Ціна, грн</label>
              <input type="number" id="apptPrice" min="0" step="1" placeholder="0" />
            </div>
            <div>
              <label for="apptStatus">Статус</label>
              <select id="apptStatus">
                <option value="scheduled">Заплановано</option>
                <option value="done">Виконано</option>
                <option value="canceled">Скасовано</option>
              </select>
              <div style="margin-top:8px;">
                <label style="display:inline-flex;align-items:center;gap:8px;">
                  <input type="checkbox" id="apptPaid" /> Оплачено
                </label>
              </div>
            </div>
          </div>

          <div class="modal__actions">
            <button type="button" class="modal__close" data-close="1">Скасувати</button>
            <button type="submit">Зберегти</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: конфлікт запису -->
    <div class="modal" id="conflictModal" aria-hidden="true" role="dialog" aria-labelledby="conflictModalTitle">
      <div class="modal__backdrop" data-close="1"></div>
      <div class="modal__dialog">
        <div class="modal__header">
          <div class="modal__title" id="conflictModalTitle">Конфлікт запису</div>
          <button class="modal__close" data-close="1" aria-label="Закрити">✕</button>
        </div>
        <div class="modal__body">
          <p id="conflictText" style="margin-top:0"></p>
          <ul id="conflictList" class="list" style="margin-top:8px;"></ul>
        </div>
        <div class="modal__actions">
          <button type="button" class="modal__close" data-close="1">Скасувати</button>
          <button type="button" id="conflictContinue">Продовжити</button>
        </div>
      </div>
    </div>
  `;

  // ---- стилі ----
  // moved CSS to external file

  // moved CSS to external file

  // moved CSS to external file


  // ---- елементи ----
  const dateEl = root.querySelector('#date'); dateEl.valueAsDate = new Date();
  const contentEl = root.querySelector('#content');
  let currentPeriod = 'day';

  // ---- клієнти: фільтр і кеш ----
  async function populateClientFilter() {
    const sel = root.querySelector('#clientFilter'); if (!sel) return;
    const cl = await clientsList();
    sel.innerHTML = '<option value="">Усі клієнти</option>' + cl.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}${c.phone ? ' · '+escapeHtml(c.phone):''}</option>`
    ).join('');
  }
  await populateClientFilter();

  let clientsCache = [];
  let clientsById = {};
  async function refreshClientsCache() {
    clientsCache = await clientsList();
    clientsById = Object.fromEntries(clientsCache.map(c => [c.id, c]));
  }
  await refreshClientsCache();

  function clientLabelById(id) {
    const c = clientsById[id];
    if (!c) return '';
    return `${c.name || ''}${c.phone ? ' · ' + c.phone : ''}`;
  }

  // ---- модалки ----
  function openModal(){
    const m=root.querySelector('#apptModal');
    m.classList.add('open'); m.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function closeModal(){
    const m=root.querySelector('#apptModal');
    m.classList.remove('open'); m.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    const f=root.querySelector('#apptForm');
    f.reset(); f.dataset.mode='create'; f.dataset.editId='';
    root.querySelector('#customServiceWrap').style.display='none';
  }
  function openConflictModal(){
    const m=root.querySelector('#conflictModal');
    m.classList.add('open'); m.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function closeConflictModal(){
    const m=root.querySelector('#conflictModal');
    m.classList.remove('open'); m.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }

  // ---- обчислення діапазонів ----
  function getRange(period, baseDate) {
    const d = new Date(baseDate);
    if (period === 'all') return [0, 8.64e15];
    if (period === 'day'){
      const s=new Date(d); s.setHours(0,0,0,0);
      const e=new Date(d); e.setHours(23,59,59,999);
      return [s.getTime(), e.getTime()];
    }
    if (period === 'week'){
      const day=d.getDay();
      const monday=new Date(d);
      monday.setDate(d.getDate()-((day+6)%7));
      monday.setHours(0,0,0,0);
      const sunday=new Date(monday);
      sunday.setDate(monday.getDate()+6);
      sunday.setHours(23,59,59,999);
      return [monday.getTime(), sunday.getTime()];
    }
    const first = new Date(d.getFullYear(), d.getMonth(), 1, 0,0,0,0);
    const last  = new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999);
    return [first.getTime(), last.getTime()];
  }
  function periodLabel(period, baseDate) {
    const d = baseDate;
    if (period==='all') return 'Усі записи';
    if (period==='day') return new Date(d).toLocaleDateString();
    if (period==='week'){
      const [s,e]=getRange('week', d);
      return `${new Date(s).toLocaleDateString()} — ${new Date(e).toLocaleDateString()}`;
    }
    const month=new Date(d).toLocaleString(undefined,{month:'long',year:'numeric'});
    return month.charAt(0).toUpperCase()+month.slice(1);
  }
  function selectedStatuses(root){
    const boxes=root.querySelectorAll('#statusFilters .sf');
    const set=new Set(); boxes.forEach(b=>{ if(b.checked) set.add(b.value); });
    if(set.size===0) return new Set(['scheduled','done','canceled']);
    return set;
  }
  function selectedClientId(root){
    const sel=root.querySelector('#clientFilter');
    return sel ? (sel.value||'') : '';
  }

  // ---- завантаження списку ----
  async function loadList(){
    const base=dateEl.valueAsDate||new Date();
    const [startTs,endTs]=getRange(currentPeriod, base);
    const list=await apptListRange(startTs,endTs);

    const allowed=selectedStatuses(root);
    let filtered=list.filter(a=>allowed.has((a.status||'').toLowerCase()));

    const cid=selectedClientId(root);
    if (cid) filtered=filtered.filter(a=>a.clientId===cid);

    // додамо підпис клієнта
    const withClient = filtered.map(a => ({
      ...a,
      _clientLabel: clientLabelById(a.clientId)
    }));

    const total=withClient.reduce((acc,a)=>acc+(Number(a.price)||0),0);
    const clientLabel = cid ? ` · Клієнт: ${escapeHtml(root.querySelector('#clientFilter').selectedOptions[0].textContent)}` : '';
    const header = `
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">
        <span class="badge">Записів: ${withClient.length}</span>
        <span class="badge">Сума: ${total} ₴</span>
        <span class="badge">Період: ${periodLabel(currentPeriod, base)}${clientLabel}</span>
      </div>`;

    contentEl.innerHTML = header + (withClient.length ? `<ul class="list">
  ${withClient.map(a=>`
  <li>
    <div style="display:flex; gap:10px; align-items:center;">
      ${clientsById[a.clientId]?.avatar
        ? `<img src="${clientsById[a.clientId].avatar}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
        : `<span style="width:32px;height:32px;border-radius:50%;background:#eee;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:#555;">
            ${initials(clientsById[a.clientId]?.name || '')}
          </span>`
      }
      <span class="status-dot ${statusClass(a.status)}" title="${a.status}"></span>
      <div>
        <div>
          <strong>${new Date(a.startAt).toLocaleDateString()} ${new Date(a.startAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong>
          — ${escapeHtml(a.title || 'Послуга')}
        </div>
        ${a._clientLabel ? `<div style="opacity:.75;">${escapeHtml(a._clientLabel)}</div>` : ''}
        <div class="badge">${a.status}${a.paid ? ' · опл.' : ''}</div>
      </div>
    </div>
    <div>
      <div style="display:flex; gap:10px; align-items:center; justify-content:flex-end;">
        <label style="display:inline-flex;align-items:center;gap:6px;">
          <input type="checkbox" data-paid="${a.id}" ${a.paid ? 'checked' : ''} />
          Оплачено
        </label>
        <div style="min-width:80px; text-align:right;">${a.price ?? 0} ₴</div>
        <button
          data-edit="${a.id}"
          data-clientid="${a.clientId}"
          data-serviceid="${a.serviceId || ''}"
          data-title="${escapeAttr(a.title || '')}"
          data-start="${a.startAt}"
          data-price="${a.price ?? 0}"
          data-status="${a.status}"
          data-paid="${a.paid ? '1':'0'}"
        >Редагувати</button>
        <button data-del="${a.id}">Видалити</button>
      </div>
    </div>
  </li>
`).join('')}
    </ul>` : '<p>У цьому періоді записів немає.</p>');

    root.querySelectorAll('.btn.period').forEach(b=>b.classList.toggle('active', b.dataset.period===currentPeriod));
  }

  // ---- модалка створення/редагування ----
  function openForCreate(){
    root.querySelector('#apptStatus').value='scheduled';
    root.querySelector('#apptPaid').checked=false;
    root.querySelector('#apptPrice').value='';
    root.querySelector('#apptTitle').value='';
    root.querySelector('#apptModalTitle').textContent='Новий запис';
    const f=root.querySelector('#apptForm'); f.dataset.mode='create'; f.dataset.editId='';
    setDateTimeDefaults();
    openModal();
  }

  async function openForEdit(btn){
    await refreshClientsCache();
    await populateModalDefaults();
    const f=root.querySelector('#apptForm'); f.dataset.mode='edit'; f.dataset.editId=btn.getAttribute('data-edit');
    root.querySelector('#apptModalTitle').textContent='Редагування запису';

    root.querySelector('#apptClient').value = btn.getAttribute('data-clientid') || '';

    const serviceId = btn.getAttribute('data-serviceid') || '';
    const svcSel=root.querySelector('#apptService');
    if (serviceId) {
      const val = `svc:${serviceId}`;
      const hasOption = Array.from(svcSel.options).some(o=>o.value===val);
      svcSel.value = hasOption ? val : '';
      root.querySelector('#customServiceWrap').style.display='none';
      root.querySelector('#apptTitle').value='';
    } else {
      svcSel.value='custom';
      root.querySelector('#customServiceWrap').style.display='block';
      root.querySelector('#apptTitle').value = btn.getAttribute('data-title') || '';
    }

    const startAt = Number(btn.getAttribute('data-start')||Date.now());
    const d = new Date(startAt);
    root.querySelector('#apptDate').value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    root.querySelector('#apptTime').value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    root.querySelector('#apptPrice').value = String(Number(btn.getAttribute('data-price')||0) || '');
    root.querySelector('#apptStatus').value = btn.getAttribute('data-status') || 'scheduled';
    root.querySelector('#apptPaid').checked = (btn.getAttribute('data-paid')==='1');

    openModal();
  }

  async function populateModalDefaults(){
    const [clients, services] = await Promise.all([clientsList(), servicesList()]);
    const clientSel = root.querySelector('#apptClient');
    clientSel.innerHTML = clients.length
      ? clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}${c.phone ? ' · ' + escapeHtml(c.phone) : ''}</option>`).join('')
      : '<option value="">(спершу додайте клієнта)</option>';
    const svcSel = root.querySelector('#apptService');
    const svcOptions = ['<option value="">— Виберіть —</option>']
      .concat(services.map(s => `<option value="svc:${s.id}" data-price="${s.priceDefault||0}">${escapeHtml(s.title)} (${s.priceDefault||0} ₴)</option>`))
      .concat(['<option value="custom">Інша послуга…</option>']);
    svcSel.innerHTML = svcOptions.join('');
  }

  function setDateTimeDefaults(){
    const modalDate = root.querySelector('#apptDate');
    modalDate.valueAsDate = dateEl.valueAsDate || new Date();
    const t=new Date(); const mm=t.getMinutes();
    const rounded = mm<15?0:mm<45?30:0;
    if(rounded===0&&mm>=45) t.setHours(t.getHours()+1);
    t.setMinutes(rounded,0,0);
    root.querySelector('#apptTime').value = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  }

  // ---- події ----
  dateEl.addEventListener('change', loadList);

  root.addEventListener('click', (e)=>{
    const p=e.target?.dataset?.period;
    if(p){ currentPeriod=p; loadList(); }
  });

  root.addEventListener('change', (e)=>{
    if(e.target && e.target.classList.contains('sf')) loadList();
    if(e.target && e.target.id==='clientFilter') loadList();

    if(e.target?.dataset?.paid){
      const paidId=e.target.dataset.paid;
      apptUpdate(paidId, { paid: !!e.target.checked }).then(loadList);
    }

    if(e.target?.id==='apptService'){
      const val=e.target.value;
      const wrap=root.querySelector('#customServiceWrap');
      const priceEl=root.querySelector('#apptPrice');
      if(val==='custom'){
        wrap.style.display='block'; priceEl.value='';
      } else {
        wrap.style.display='none';
        const opt=e.target.selectedOptions?.[0];
        const p=opt?Number(opt.getAttribute('data-price')||0):0;
        if(p) priceEl.value=String(p);
      }
    }
  });

  root.addEventListener('click', async (e)=>{
    if(e.target.id==='new'){
      await refreshClientsCache();
      await populateModalDefaults();
      openForCreate();
      return;
    }
    const editId=e.target?.dataset?.edit;
    if(editId){ openForEdit(e.target); return; }
    const delId=e.target?.dataset?.del;
    if(delId){
      if(confirm('Видалити запис?')){
        await apptRemove(delId);
        loadList();
      }
    }
  });

  root.querySelector('#apptModal').addEventListener('click', (e)=>{ if(e.target.dataset.close) closeModal(); });
  root.querySelector('#conflictModal').addEventListener('click', (e)=>{ if(e.target.dataset.close) closeConflictModal(); });
  window.addEventListener('keydown', (e)=>{
    if(e.key==='Escape' && root.querySelector('#apptModal').classList.contains('open')) closeModal();
    if(e.key==='Escape' && root.querySelector('#conflictModal').classList.contains('open')) closeConflictModal();
  });

  // ---- сабміт форми ----
  root.querySelector('#apptForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const f=e.currentTarget; const mode=f.dataset.mode||'create'; const editId=f.dataset.editId||'';

    const clientId=root.querySelector('#apptClient').value; if(!clientId){ alert('Оберіть клієнта'); return; }
    const svcVal=root.querySelector('#apptService').value; let serviceId=null; let title='';
    if(svcVal==='custom'){ title=(root.querySelector('#apptTitle').value||'').trim(); if(!title){ alert('Вкажіть назву послуги'); return; } }
    else if(svcVal && svcVal.startsWith('svc:')){ serviceId=svcVal.slice(4); title=root.querySelector('#apptService').selectedOptions[0].textContent.split(' (')[0]; }
    else { alert('Оберіть послугу або вкажіть іншу'); return; }

    const dateInput=root.querySelector('#apptDate').valueAsDate; if(!dateInput){ alert('Вкажіть дату'); return; }
    const timeStr=root.querySelector('#apptTime').value; if(!timeStr){ alert('Вкажіть час'); return; }
    const [hh,mm]=timeStr.split(':').map(n=>parseInt(n,10));
    const start=new Date(dateInput); start.setHours(hh||0, mm||0, 0, 0);
    const startAt=start.getTime(); const endAt=startAt + 60*60*1000;

    const price=Number(root.querySelector('#apptPrice').value||0)||0;
    const status=root.querySelector('#apptStatus').value||'scheduled';
    const paid=!!root.querySelector('#apptPaid').checked;

    // збережемо очевидні поля для Dashboard
    const dateStr = root.querySelector('#apptDate').value; // 'YYYY-MM-DD'
    const extraTimeFields = { date: dateStr, time: timeStr, ts: startAt };

    // перевірка конфлікту
    const dayStart=new Date(new Date(startAt).setHours(0,0,0,0)).getTime();
    const dayEnd=new Date(new Date(startAt).setHours(23,59,59,999)).getTime();
    const dayList=await apptListRange(dayStart, dayEnd);
    const conflicts=dayList.filter(a=>{
      if(mode==='edit' && a.id===editId) return false;
      const aEnd = (typeof a.endAt==='number') ? a.endAt : (a.startAt + 60*60*1000);
      return overlaps(a.startAt, aEnd, startAt, endAt);
    });
    if(conflicts.length>0){
      const proceed = await confirmConflict(conflicts, startAt, endAt);
      if(!proceed) return;
    }

    // збереження
    if(mode==='edit' && editId){
      await apptUpdate(editId, {
        clientId, serviceId, title, startAt, endAt, price, status, paid,
        ...extraTimeFields
      });
    } else {
      await apptCreate({
        clientId, serviceId, title, startAt, endAt, price, status, paid, notes:'',
        ...extraTimeFields
      });
    }

    // закриваємо
    closeModal();

    // м'яке оновлення Dashboard, якщо відкритий
    try {
      const dash = document.querySelector('[data-page="dashboard"]');
      if (dash) {
        import('../modules/dashboard.js').then(m => m.render(dash));
      }
    } catch (err) {
      console.warn('Dashboard refresh skipped:', err);
    }

    // якщо базова дата = дата модалки (режим day), оновлюємо базу
    const modalDateStr=root.querySelector('#apptDate').value;
    if(dateEl.value!==modalDateStr && currentPeriod==='day') dateEl.value=modalDateStr;

    // перечитати список
    loadList();
  });

  // перший рендер списку
  await loadList();
}

/* ===== helpers ===== */
function initials(name=''){
  const parts=String(name).trim().split(/\s+/);
  const [a,b]=[parts[0]?.[0],parts[1]?.[0]];
  return `${(a||'').toUpperCase()}${(b||'').toUpperCase()}`||'•';
}
function statusClass(status){
  switch((status||'').toLowerCase()){
    case 'done': return 'status-done';
    case 'canceled': return 'status-canceled';
    default: return 'status-scheduled';
  }
}
function escapeHtml(str){
  return String(str||'').replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function escapeAttr(str){
  return String(str||'').replaceAll('&','&amp;').replaceAll('"','&quot;')
    .replaceAll("'",'&#39;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
function injectOnce(id, cssText){
  if(document.getElementById(id)) return;
  const style=document.createElement('style');
  style.id=id; style.textContent=cssText;
  document.head.appendChild(style);
}
function overlaps(aStart,aEnd,bStart,bEnd){ return aStart < bEnd && aEnd > bStart; }

function confirmConflict(conflicts, startAt, endAt){
  const root=document;
  const text = root.querySelector('#conflictText');
  const list = root.querySelector('#conflictList');
  text.textContent = `На ${new Date(startAt).toLocaleDateString()} о ${new Date(startAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} вже є запис(и):`;
  list.innerHTML = conflicts.map(a => `
    <li>
      <div>
        <div><strong>${new Date(a.startAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong> — ${escapeHtml(a.title || 'Послуга')}</div>
        <div class="badge">${a.status}${a.paid ? ' · опл.' : ''}</div>
      </div>
      <div style="text-align:right;">${a.price ?? 0} ₴</div>
    </li>
  `).join('');
  const modal = document.querySelector('#conflictModal');
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';

  return new Promise((resolve)=>{
    const onClose=()=>{ cleanup(); resolve(false); };
    const onContinue=()=>{ cleanup(); resolve(true); };
    function handlerBackdrop(e){ if(e.target.dataset.close) onClose(); }
    function handlerKey(e){ if(e.key==='Escape' && modal.classList.contains('open')) onClose(); }
    function cleanup(){
      modal.removeEventListener('click',handlerBackdrop);
      window.removeEventListener('keydown',handlerKey);
      btnContinue.removeEventListener('click',onContinue);
      modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow='';
    }
    const btnContinue = document.querySelector('#conflictContinue');
    modal.addEventListener('click', handlerBackdrop);
    window.addEventListener('keydown', handlerKey);
    btnContinue.addEventListener('click', onContinue);
  });
}
