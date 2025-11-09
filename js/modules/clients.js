import { clientsList, clientsSearch, clientRemove } from '../store/repository.cloud.js';
import { t } from '../utils/i18n.js';

export async function render(root) {
  root.innerHTML = `
    <section class="section clients-page">
      <header class="clients-page__header">
        <input id="q" placeholder="${t('Пошук по імені або телефону')}" />
        <button id="add" class="btn-cl btn-cl--primary">${t('+ Додати клієнта')}</button>
      </header>
      <ul id="list" class="list" style="margin-top:12px;"></ul>
    </section>
  `;

  const listEl = root.querySelector('#list');
  const qEl = root.querySelector('#q');

  async function load() {
    const q = qEl.value?.trim();
    const data = q ? await clientsSearch(q) : await clientsList();
    listEl.innerHTML = data.map(item => {
      const age = calcAge(item.birthdate);
      const todayMark = isBirthdayToday(item.birthdate) ? ' 🎂' : '';
      const ageText = age !== null ? `<span class="badge">${t('Вік: {age}{mark}', { age, mark: todayMark })}</span>` : '';
      const avatar = item.avatar
        ? `<img src="${item.avatar}" class="avatar avatar--sm" alt="">`
        : `<span class="avatar__fallback">${initials(item.name)}</span>`;
      return `
        <li>
          <div class="client-card__main">
            ${avatar}
            <div class="client-card__info">
              <div><strong>${escapeHtml(item.name)}</strong></div>
              <div style="opacity:.7">${escapeHtml(item.phone || '')}</div>
              ${ageText}
            </div>
          </div>
          <div class="client-card__actions">
            <button class="btn-cl btn-cl--ghost" data-history="${item.id}">${t('Історія')}</button>
            <button class="btn-cl btn-cl--primary" data-edit="${item.id}">${t('Редагувати')}</button>
            <button class="btn-cl btn-cl--danger" data-del="${item.id}">${t('Видалити')}</button>
          </div>
        </li>
      `;
    }).join('');
  }

  const remember = () => sessionStorage.setItem('clientReturn', location.hash || '#/clients');

  root.querySelector('#add')?.addEventListener('click', () => {
    remember();
    location.hash = '/clients/new';
  });

  listEl.addEventListener('click', async (e) => {
    const editId = e.target?.dataset?.edit;
    const delId  = e.target?.dataset?.del;
    const histId = e.target?.dataset?.history;
    if (histId) {
      remember();
      location.hash = `/clients/history/${histId}`;
      return;
    }
    if (editId) {
      remember();
      location.hash = `/clients/edit/${editId}`;
      return;
    }
    if (delId) {
      if (confirm(t('Видалити клієнта і пов’язані записи?'))) {
        await clientRemove(delId);
        load();
      }
    }
  });

  qEl.addEventListener('input', load);
  await load();
}

/* utils */
function escapeHtml(str){return String(str||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}
function initials(name=''){const parts=String(name).trim().split(/\s+/);const [a,b]=[parts[0]?.[0],parts[1]?.[0]];return `${(a||'').toUpperCase()}${(b||'').toUpperCase()}`||'•'}
function calcAge(iso){ if(!iso) return null; const d=new Date(iso); if(isNaN(d)) return null; const n=new Date(); let age=n.getFullYear()-d.getFullYear(); const m=n.getMonth()-d.getMonth(); if(m<0||(m===0&&n.getDate()<d.getDate())) age--; return age>=0?age:null}
function isBirthdayToday(iso){ if(!iso) return false; const d=new Date(iso); if(isNaN(d)) return false; const n=new Date(); return d.getDate()===n.getDate()&&d.getMonth()===n.getMonth(); }
