import { clientGet, clientCreate, clientUpdate } from '../store/repository.cloud.js';
import { t } from '../utils/i18n.js';

export async function render(root, params = {}) {
  const mode = params.mode === 'edit' ? 'edit' : 'new';
  const clientId = mode === 'edit' ? params.id : null;
  const returnHash = sessionStorage.getItem('clientReturn') || '#/clients';
  const title = mode === 'edit' ? t('Редагувати клієнта') : t('Новий клієнт');
  const submitLabel = mode === 'edit' ? t('Зберегти') : t('Створити');

  root.innerHTML = `
    <section class="page page--edit-client">
      <div class="card edit-client">
        <header class="edit-appt__head">
          <h1>${title}</h1>
          <button class="btn-cl btn-cl--ghost" id="clientFormBack" type="button">${t('← Назад')}</button>
        </header>
        <form id="clientForm" class="edit-appt__form">
          <label>${t('Ім’я')}
            <input id="clientName" type="text" required />
          </label>
          <label>${t('Телефон')}
            <input id="clientPhone" type="text" placeholder="+380..." />
          </label>
          <label>${t('Дата народження')}
            <input id="clientBirthdate" type="date" />
          </label>
          <label>${t('Фото')}
            <input id="clientPhoto" type="file" accept="image/*" />
          </label>
          <div class="client-modal__preview">
            <img id="clientPreview" class="avatar" alt="прев’ю" style="display:none;" />
            <div id="clientAgeBadge" class="badge" style="display:none;"></div>
          </div>
          <div class="edit-appt__actions">
            <button type="button" class="btn-cl btn-cl--ghost" id="clientCancel">${t('Скасувати')}</button>
            <button type="submit" class="btn-cl btn-cl--primary">${submitLabel}</button>
          </div>
        </form>
      </div>
    </section>
  `;

  const goBack = () => {
    sessionStorage.removeItem('clientReturn');
    location.hash = returnHash;
  };
  document.getElementById('clientFormBack')?.addEventListener('click', goBack);
  document.getElementById('clientCancel')?.addEventListener('click', goBack);

  const nameEl = document.getElementById('clientName');
  const phoneEl = document.getElementById('clientPhone');
  const birthEl = document.getElementById('clientBirthdate');
  const photoEl = document.getElementById('clientPhoto');
  const previewEl = document.getElementById('clientPreview');
  previewEl.dataset.current = '';
  const ageBadgeEl = document.getElementById('clientAgeBadge');

  const updateAge = () => {
    const age = calcAge(birthEl.value);
    if (age !== null) {
      const mark = isBirthdayToday(birthEl.value) ? ' 🎂' : '';
      ageBadgeEl.textContent = t('Вік: {age}{mark}', { age, mark });
      ageBadgeEl.style.display = 'inline-flex';
    } else {
      ageBadgeEl.style.display = 'none';
    }
  };
  birthEl.addEventListener('change', updateAge);

  photoEl.addEventListener('change', async () => {
    const file = photoEl.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file, 512);
    previewEl.src = dataUrl;
    previewEl.style.display = 'inline-block';
    previewEl.dataset.dataUrl = dataUrl;
  });

  if (mode === 'edit' && clientId) {
    try {
      const data = await clientGet(clientId);
      if (!data) throw new Error('notfound');
      nameEl.value = data.name || '';
      phoneEl.value = data.phone || '';
      birthEl.value = data.birthdate || '';
      if (data.avatar) {
        previewEl.src = data.avatar;
        previewEl.style.display = 'inline-block';
        previewEl.dataset.current = data.avatar;
      }
      previewEl.dataset.dataUrl = '';
      updateAge();
    } catch (err) {
      console.error(err);
      document.querySelector('.edit-client')?.insertAdjacentHTML('beforeend', `<p class="error">${t('Не вдалося завантажити клієнта.')}</p>`);
    }
  }

  document.getElementById('clientForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameEl.value.trim();
    if (!name) { nameEl.focus(); return; }
    const payload = {
      name,
      phone: phoneEl.value.trim(),
      birthdate: birthEl.value || null,
    };
    const avatarData = previewEl.dataset.dataUrl || previewEl.dataset.current;
    if (avatarData) payload.avatar = avatarData;
    if (mode === 'new') {
      payload.notes = '';
      await clientCreate(payload);
    } else if (clientId) {
      await clientUpdate(clientId, payload);
    }
    goBack();
  });
}

function calcAge(iso){ if(!iso) return null; const d=new Date(iso); if(isNaN(d)) return null; const n=new Date(); let age=n.getFullYear()-d.getFullYear(); const m=n.getMonth()-d.getMonth(); if(m<0||(m===0&&n.getDate()<d.getDate())) age--; return age>=0?age:null }
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
