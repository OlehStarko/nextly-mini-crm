import { clientsList, clientsSearch, clientCreate, clientUpdate, clientRemove, clientGet, apptListRange } from '../store/repository.cloud.js';

export async function render(root) {
  root.innerHTML = `
    <section class="section">
      <header style="display:flex;gap:8px;align-items:center;flex-wrap:wrap; justify-content: space-between;">
     <input id="q" placeholder="Пошук по імені або телефону" />
        <button id="add">+ Додати клієнта</button>
        
      </header>
      <ul id="list" class="list" style="margin-top:12px;"></ul>
    </section>

    <!-- Modal -->
    <div class="modal" id="clientModal" aria-hidden="true" role="dialog" aria-labelledby="clientModalTitle">
      <div class="modal__backdrop" data-close="1"></div>
      <div class="modal__dialog">
        <div class="modal__header">
          <div class="modal__title" id="clientModalTitle">Новий клієнт</div>
          <button type="button" class="modal__close" data-close="1" aria-label="Закрити">✕</button>
        </div>
        <form id="clientForm" class="modal__body">
          <input type="hidden" id="clientId" />
          <div class="grid">
            <div>
              <label for="clientName">Ім’я</label>
              <input id="clientName" name="name" required placeholder="Напр., Ольга" />
            </div>
            <div>
              <label for="clientPhone">Телефон</label>
              <input id="clientPhone" name="phone" placeholder="+380..." />
            </div>
          </div>

          <div class="grid" style="align-items:end;">
            <div>
              <label for="clientBirthdate">Дата народження</label>
              <input id="clientBirthdate" type="date" />
            </div>
            <div>
              <label for="clientPhoto">Фото</label>
              <input id="clientPhoto" type="file" accept="image/*" />
            </div>
          </div>

          <div style="display:flex; gap:12px; align-items:center;">
            <img id="clientPhotoPreview" class="avatar" alt="прев’ю" style="display:none;" />
            <div id="clientAgeBadge" class="badge" style="display:none;"></div>
          </div>

          <div class="modal__actions">
            <button type="button" class="modal__close" data-close="1">Скасувати</button>
            <button type="submit">Зберегти</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: історія відвідувань -->
    <div class="modal" id="historyModal" aria-hidden="true">
      <div class="modal__backdrop" data-close="1"></div>
      <div class="modal__dialog">
        <div class="modal__header">
          <div class="modal__title" id="historyTitle">Історія відвідувань</div>
          <button class="modal__close" data-close="1" aria-label="Закрити">✕</button>
        </div>
        <div class="modal__body" id="historyBody" style="max-height:70vh; overflow:auto;">
          <p style="opacity:.7;">Завантаження...</p>
        </div>
      </div>
    </div>
  `;

  const listEl = root.querySelector('#list');
  const qEl = root.querySelector('#q');

  async function load() {
    const q = qEl.value?.trim();
    const data = q ? await clientsSearch(q) : await clientsList();
    listEl.innerHTML = data.map(item => {
      const age = calcAge(item.birthdate);
      const todayMark = isBirthdayToday(item.birthdate) ? ' 🎂' : '';
      const ageText = age !== null ? `<span class="badge">Вік: ${age}${todayMark}</span>` : '';
      const avatar = item.avatar
        ? `<img src="${item.avatar}" class="avatar avatar--sm" alt="">`
        : `<span class="avatar__fallback">${initials(item.name)}</span>`;
      return `
        <li>
          <div style="display:flex; gap:10px; align-items:center;">
            ${avatar}
            <div>
              <div><strong>${escapeHtml(item.name)}</strong></div>
              <div style="opacity:.7">${escapeHtml(item.phone || '')}</div>
              ${ageText}
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button data-history="${item.id}">Історія</button>
            <button class="paid" data-edit="${item.id}">Редагувати</button>
            <button class="unpaid" data-del="${item.id}">Видалити</button>
          </div>
        </li>
      `;
    }).join('');
  }

  // ==== Модалка клієнта
  const modal = root.querySelector('#clientModal');
  const form = root.querySelector('#clientForm');
  const idEl = root.querySelector('#clientId');
  const nameEl = root.querySelector('#clientName');
  const phoneEl = root.querySelector('#clientPhone');
  const birthEl = root.querySelector('#clientBirthdate');
  const photoEl = root.querySelector('#clientPhoto');
  const previewEl = root.querySelector('#clientPhotoPreview');
  const ageBadgeEl = root.querySelector('#clientAgeBadge');

  function openModal() {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    form.reset();
    previewEl.style.display='none';
    previewEl.src='';
    ageBadgeEl.style.display='none';
    idEl.value='';
    previewEl.dataset.dataUrl='';
  }

  modal.addEventListener('click', (e)=>{
    if (e.target && e.target.hasAttribute('data-close')) {
      e.preventDefault();
      closeModal();
    }
  });
  window.addEventListener('keydown', e=>{
    if (e.key==='Escape' && modal.classList.contains('open')) closeModal();
  });

  photoEl.addEventListener('change', async () => {
    const file = photoEl.files?.[0]; if (!file) return;
    const dataUrl = await fileToDataURL(file, 512);
    previewEl.src = dataUrl; previewEl.style.display='inline-block'; previewEl.dataset.dataUrl = dataUrl;
  });

  function refreshAgeBadge() {
    const age = calcAge(birthEl.value || null);
    if (age !== null) {
      const mark = isBirthdayToday(birthEl.value) ? ' 🎂' : '';
      ageBadgeEl.textContent = `Вік: ${age}${mark}`;
      ageBadgeEl.style.display = 'inline-flex';
    } else { ageBadgeEl.style.display='none'; ageBadgeEl.textContent=''; }
  }
  birthEl.addEventListener('change', refreshAgeBadge);

  root.querySelector('#add').addEventListener('click', () => {
    root.querySelector('#clientModalTitle').textContent = 'Новий клієнт';
    form.dataset.mode='create'; form.dataset.editId=''; form.reset();
    previewEl.style.display='none'; ageBadgeEl.style.display='none';
    openModal(); setTimeout(()=>nameEl?.focus(),0);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameEl.value.trim(); if (!name) { nameEl.focus(); return; }
    const phone = phoneEl.value.trim();
    const birthdate = birthEl.value || null;
    const avatar = previewEl.dataset.dataUrl || null;

    if (form.dataset.mode === 'edit' && form.dataset.editId) {
      const patch = { name, phone, birthdate };
      if (avatar !== null && avatar !== '') patch.avatar = avatar;
      await clientUpdate(form.dataset.editId, patch);
    } else {
      await clientCreate({ name, phone, notes:'', birthdate, avatar });
    }
    closeModal(); load();
  });

  // ==== Історія модалка
const histModal = root.querySelector('#historyModal');
const histBody  = root.querySelector('#historyBody');
const histTitle = root.querySelector('#historyTitle');

function openHistoryModal() {
  histModal.classList.add('open');
  histModal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeHistoryModal() {
  histModal.classList.remove('open');
  histModal.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}

// 1) Закриття по кліку на бекдроп або на сам контейнер модалки (поза діалогом)
histModal.addEventListener('click', (e) => {
  const isBackdrop = e.target === histModal || e.target.classList.contains('modal__backdrop');
  if (isBackdrop) closeHistoryModal();
});

// 2) Кліки всередині діалогу не повинні закривати/бульбитися нагору
histModal.querySelector('.modal__dialog')?.addEventListener('click', (e) => {
  e.stopPropagation();
});

// 3) Явні обробники на всі елементи з data-close (✕ та кнопки “Скасувати”, якщо будуть)
histModal.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    closeHistoryModal();
  });
});

// 4) Закриття по Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && histModal.classList.contains('open')) {
    closeHistoryModal();
  }
});

// функція показу історії
async function showHistory(clientId) {
  histBody.innerHTML = '<p style="opacity:.7;">Завантаження...</p>';
  histTitle.textContent = 'Історія відвідувань';

  const now = Date.now();
  const past = now - 5 * 365 * 24 * 60 * 60 * 1000; // 5 років
  const all = await apptListRange(past, now);
  const visits = all
    .filter(a => a.clientId === clientId)
    .sort((a,b)=>b.startAt - a.startAt);

  if (!visits.length) {
    histBody.innerHTML = '<p>Записів не знайдено.</p>';
  } else {
    const total = visits.length;
    const paidCount = visits.filter(v => v.paid).length;
    const totalSum = visits.reduce((acc,v)=>acc + (v.paid ? Number(v.price||0) : 0), 0);

    histBody.innerHTML = `
      <ul class="list">
        ${visits.map(v => `
          <li>
            <div><strong>${new Date(v.startAt).toLocaleDateString()}</strong> · ${escapeHtml(v.title||'Без назви')}</div>
            <div style="opacity:.7;">${v.status}${v.paid ? ' · Оплачено' : ''}</div>
            <div style="font-size:13px;">${v.price || 0} ₴</div>
          </li>
        `).join('')}
      </ul>
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid #eee; font-size:14px;">
        <strong>Підсумок:</strong><br>
        Всього відвідувань: ${total}<br>
        Оплачено: ${paidCount}<br>
        Загальна сума: <strong>${totalSum.toLocaleString('uk-UA')} ₴</strong>
      </div>
    `;
  }

  openHistoryModal();
}

  listEl.addEventListener('click', async (e) => {
    const editId = e.target?.dataset?.edit;
    const delId  = e.target?.dataset?.del;
    const histId = e.target?.dataset?.history;
    if (histId) { await showHistory(histId); return; }
    if (editId) {
      const cur = await clientGet(editId); if (!cur) return;
      root.querySelector('#clientModalTitle').textContent = 'Редагування клієнта';
      form.dataset.mode='edit'; form.dataset.editId=editId;
      idEl.value = cur.id; nameEl.value = cur.name || ''; phoneEl.value = cur.phone || ''; birthEl.value = cur.birthdate || '';
      if (cur.birthdate) refreshAgeBadge(); else ageBadgeEl.style.display='none';
      if (cur.avatar) { previewEl.src = cur.avatar; previewEl.style.display='inline-block'; previewEl.dataset.dataUrl=''; }
      else { previewEl.style.display='none'; previewEl.src=''; previewEl.dataset.dataUrl=''; }
      openModal();
    }
    if (delId) { if (confirm('Видалити клієнта і пов’язані записи?')) { await clientRemove(delId); load(); } }
  });

  qEl.addEventListener('input', load);
  await load();
}

/* utils */
function escapeHtml(str){return String(str||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}
function initials(name=''){const parts=String(name).trim().split(/\s+/);const [a,b]=[parts[0]?.[0],parts[1]?.[0]];return `${(a||'').toUpperCase()}${(b||'').toUpperCase()}`||'•'}
function calcAge(iso){ if(!iso) return null; const d=new Date(iso); if(isNaN(d)) return null; const n=new Date(); let age=n.getFullYear()-d.getFullYear(); const m=n.getMonth()-d.getMonth(); if(m<0||(m===0&&n.getDate()<d.getDate())) age--; return age>=0?age:null}
function isBirthdayToday(iso){ if(!iso) return false; const d=new Date(iso); if(isNaN(d)) return false; const n=new Date(); return d.getDate()===n.getDate()&&d.getMonth()===n.getMonth(); }
function fileToDataURL(file, maxSize=512){
  return new Promise((resolve,reject)=>{
    try{
      const reader=new FileReader();
      reader.onload=()=>{
        const result=reader.result;
        if(!/^image\//.test(file.type)||!maxSize){ return resolve(result); }
        const img=new Image();
        img.onload=()=>{
          try{
            const scale=Math.min(1, maxSize/Math.max(img.width,img.height));
            if(scale>=1) return resolve(result);
            const canvas=document.createElement('canvas');
            canvas.width=Math.round(img.width*scale);
            canvas.height=Math.round(img.height*scale);
            const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height);
            resolve(canvas.toDataURL('image/jpeg',0.9));
          }catch(e){ resolve(result); }
        };
        img.onerror=()=>resolve(result);
        img.src=result;
      };
      reader.onerror=()=>reject(reader.error||new Error('FileReader error'));
      reader.readAsDataURL(file);
    }catch(e){ reject(e); }
  });
}
