// public/js/modules/reports.js
import { apptListRange } from '../store/repository.cloud.js';

export async function render(root){
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
          <button id="exportCsv">Експорт CSV</button>
        </div>
      </header>
      <div id="kpis" style="margin:12px 0; display:flex; gap:10px; flex-wrap:wrap;"></div>
      <div id="byStatus" style="margin:12px 0;"></div>
      <div id="tableWrap" style="margin-top:12px;"></div>
    </section>
  `;

  // moved CSS to external file


  const dateEl = root.querySelector('#date'); dateEl.valueAsDate = new Date();
  let period = 'month';

  function getRange(period, base){
    const d=new Date(base);
    if(period==='all') return [0, 8.64e15];
    if(period==='day'){ const s=new Date(d); s.setHours(0,0,0,0); const e=new Date(d); e.setHours(23,59,59,999); return [s.getTime(),e.getTime()]; }
    if(period==='week'){ const day=d.getDay(); const mon=new Date(d); mon.setDate(d.getDate()-((day+6)%7)); mon.setHours(0,0,0,0); const sun=new Date(mon); sun.setDate(mon.getDate()+6); sun.setHours(23,59,59,999); return [mon.getTime(),sun.getTime()]; }
    const first=new Date(d.getFullYear(),d.getMonth(),1,0,0,0,0); const last=new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59,999); return [first.getTime(),last.getTime()];
  }

  async function load(){
    const [start,end] = getRange(period, dateEl.valueAsDate||new Date());
    const rows = await apptListRange(start,end);

    const sum = (f) => rows.filter(f).reduce((a,x)=>a+(Number(x.price)||0),0);
    const count = (f) => rows.filter(f).length;

    const paidSum = sum(x=>!!x.paid);
    const unpaidSum = sum(x=>!x.paid);
    const totalSum = sum(()=>true);

    root.querySelector('#kpis').innerHTML = `
      <div class="kpi"><div class="t">Записів</div><div class="v">${rows.length}</div></div>
      <div class="kpi"><div class="t">Сума</div><div class="v">${totalSum} ₴</div></div>
      <div class="kpi"><div class="t">Оплачено</div><div class="v">${paidSum} ₴</div></div>
      <div class="kpi"><div class="t">Неоплачено</div><div class="v">${unpaidSum} ₴</div></div>
    `;

    const sScheduled = {cnt: count(x=>x.status==='scheduled'), sum: sum(x=>x.status==='scheduled')};
    const sDone      = {cnt: count(x=>x.status==='done'),      sum: sum(x=>x.status==='done')};
    const sCanceled  = {cnt: count(x=>x.status==='canceled'),  sum: sum(x=>x.status==='canceled')};

    root.querySelector('#byStatus').innerHTML = `
      <div class="badge">Заплановано: ${sScheduled.cnt} шт · ${sScheduled.sum} ₴</div>
      <div class="badge">Виконано: ${sDone.cnt} шт · ${sDone.sum} ₴</div>
      <div class="badge">Скасовано: ${sCanceled.cnt} шт · ${sCanceled.sum} ₴</div>
    `;

    root.querySelector('#tableWrap').innerHTML = rows.length
      ? `<table class="fin">
          <thead><tr>
            <th>Дата</th><th>Час</th><th>Послуга</th><th>Статус</th><th>Оплачено</th><th>Сума</th>
          </tr></thead>
          <tbody>
            ${rows.map(r=>`
              <tr>
                <td>${new Date(r.startAt).toLocaleDateString()}</td>
                <td>${new Date(r.startAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td>
                <td>${escapeHtml(r.title||'—')}</td>
                <td>${r.status}</td>
                <td>${r.paid ? 'так' : 'ні'}</td>
                <td style="text-align:right">${Number(r.price||0)} ₴</td>
              </tr>`).join('')}
          </tbody>
        </table>`
      : `<p>За обраний період записів немає.</p>`;

    // CSV export
    root.querySelector('#exportCsv').onclick = () => {
      const header = ['date','time','title','status','paid','price'];
      const lines = rows.map(r => [
        new Date(r.startAt).toLocaleDateString(),
        new Date(r.startAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        (r.title||'').replaceAll('"','""'),
        r.status,
        r.paid ? 'yes' : 'no',
        String(Number(r.price||0))
      ]);
      const csv = [header].concat(lines).map(arr => arr.map(v=>`"${v}"`).join(',')).join('\n');
      downloadText(csv, `finance-${Date.now()}.csv`, 'text/csv;charset=utf-8');
    };

    root.querySelectorAll('.btn.period').forEach(b=>b.classList.toggle('active', b.dataset.period===period));
  }

  dateEl.addEventListener('change', load);
  root.addEventListener('click', (e)=>{ const p=e.target?.dataset?.period; if(p){ period=p; load(); }});

  await load();
}

/* helpers */
function injectOnce(id, css){ if(document.getElementById(id)) return; const s=document.createElement('style'); s.id=id; s.textContent=css; document.head.appendChild(s); }
function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function downloadText(text, filename, type){
  const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}
