// public/js/modules/reports.js
import { apptListRange, clientsList, productsList, productSalesRange } from '../store/repository.cloud.js';

export async function render(root){
  root.innerHTML = `
    <section class="section reports-page" data-page="reports">
      <div class="reports-card">
        <div class="reports-toolbar">
          <div class="reports-filter">
            <label for="date">Базова дата</label>
            <input type="date" id="date" />
          </div>
          <div class="reports-toolbar__actions">
            <div class="reports-period" role="group" aria-label="Фільтр періоду">
              <button class="btn-cl btn-cl--ghost reports-period__btn" data-period="all">Усі</button>
              <button class="btn-cl btn-cl--ghost reports-period__btn" data-period="day">Сьогодні</button>
              <button class="btn-cl btn-cl--ghost reports-period__btn" data-period="week">Тиждень</button>
              <button class="btn-cl btn-cl--ghost reports-period__btn" data-period="month">Місяць</button>
            </div>
            <div class="reports-export-buttons">
              <button id="exportCsv" class="btn-cl btn-cl--primary reports-export">Експорт записів</button>
              <button id="exportSalesCsv" class="btn-cl btn-cl--ghost reports-export">Експорт продажів</button>
            </div>
          </div>
        </div>
        <div id="kpis" class="reports-kpis"></div>
        <div id="byStatus" class="reports-status"></div>
        <div id="tableWrap" class="reports-table-card"></div>
        <h3 class="reports-sales-title">Продажі товарів</h3>
        <div id="salesWrap" class="reports-table-card reports-sales-card"></div>
      </div>
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
    const [rows, clients, products, sales] = await Promise.all([
      apptListRange(start,end),
      clientsList(),
      productsList(),
      productSalesRange(start,end),
    ]);

    const clientsById = Object.fromEntries(clients.map(c => [c.id, c]));
    const productsById = Object.fromEntries(products.map(p => [p.id, p]));

    const rowsWithClient = rows.map(r => {
      const client = r.clientId ? clientsById[r.clientId] : null;
      return {
        ...r,
        clientName: client?.name || '',
        clientPhone: client?.phone || ''
      };
    });

    const salesWithMeta = sales.map(s => {
      const client = s.clientId ? clientsById[s.clientId] : null;
      const product = s.productId ? productsById[s.productId] : null;
      const totalPrice = Number(s.totalPrice ?? (s.qty || 0) * (s.pricePerUnit || 0));
      return {
        ...s,
        productName: product?.title || '—',
        clientName: client?.name || '—',
        clientPhone: client?.phone || '',
        totalPrice,
      };
    });

    const sum = (f) => rows.filter(f).reduce((a,x)=>a+(Number(x.price)||0),0);
    const count = (f) => rows.filter(f).length;

    const paidSum = sum(x=>!!x.paid);
    const unpaidSum = sum(x=>!x.paid);
    const totalSum = sum(()=>true);
    const salesRevenue = salesWithMeta.reduce((acc, s) => acc + Number(s.totalPrice || 0), 0);

    root.querySelector('#kpis').innerHTML = `
      <div class="reports-kpi">
        <div class="reports-kpi__label">Записів</div>
        <div class="reports-kpi__value">${rows.length}</div>
      </div>
      <div class="reports-kpi">
        <div class="reports-kpi__label">Сума</div>
        <div class="reports-kpi__value">${totalSum} ₴</div>
      </div>
      <div class="reports-kpi">
        <div class="reports-kpi__label">Оплачено</div>
        <div class="reports-kpi__value text-success">${paidSum} ₴</div>
      </div>
      <div class="reports-kpi">
        <div class="reports-kpi__label">Неоплачено</div>
        <div class="reports-kpi__value text-danger">${unpaidSum} ₴</div>
      </div>
      <div class="reports-kpi">
        <div class="reports-kpi__label">Продажі товарів</div>
        <div class="reports-kpi__value">${salesRevenue} ₴</div>
      </div>
    `;

    const sScheduled = {cnt: count(x=>x.status==='scheduled'), sum: sum(x=>x.status==='scheduled')};
    const sDone      = {cnt: count(x=>x.status==='done'),      sum: sum(x=>x.status==='done')};
    const sCanceled  = {cnt: count(x=>x.status==='canceled'),  sum: sum(x=>x.status==='canceled')};

    root.querySelector('#byStatus').innerHTML = `
      <div class="reports-status__item reports-status__item--scheduled">
        <span>Заплановано</span>
        <strong>${sScheduled.cnt} шт · ${sScheduled.sum} ₴</strong>
      </div>
      <div class="reports-status__item reports-status__item--done">
        <span>Виконано</span>
        <strong>${sDone.cnt} шт · ${sDone.sum} ₴</strong>
      </div>
      <div class="reports-status__item reports-status__item--canceled">
        <span>Скасовано</span>
        <strong>${sCanceled.cnt} шт · ${sCanceled.sum} ₴</strong>
      </div>
    `;

    const tableWrap = root.querySelector('#tableWrap');
    tableWrap.innerHTML = rows.length
      ? `<div class="reports-table-scroll">
           <table class="reports-table">
             <thead>
               <tr>
                 <th>Дата</th>
                 <th>Час</th>
                 <th>Клієнт</th>
                 <th>Телефон</th>
                 <th>Послуга</th>
                 <th>Статус</th>
                 <th>Оплачено</th>
                 <th class="align-right">Сума</th>
               </tr>
             </thead>
             <tbody>
               ${rowsWithClient.map(r=>`
                 <tr>
                   <td>${new Date(r.startAt).toLocaleDateString()}</td>
                   <td>${new Date(r.startAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td>
                   <td>${escapeHtml(r.clientName || '—')}</td>
                   <td>${escapeHtml(r.clientPhone || '—')}</td>
                   <td>${escapeHtml(r.title||'—')}</td>
                   <td>${formatStatus(r.status)}</td>
                   <td>${r.paid ? 'Так' : 'Ні'}</td>
                   <td class="align-right">${Number(r.price||0)} ₴</td>
                 </tr>`).join('')}
             </tbody>
           </table>
         </div>`
      : `<p class="reports-empty">За обраний період записів немає.</p>`;

    const salesWrap = root.querySelector('#salesWrap');
    salesWrap.innerHTML = salesWithMeta.length
      ? `<div class="reports-table-scroll">
           <table class="reports-table">
             <thead>
               <tr>
                 <th>Дата</th>
                 <th>Товар</th>
                 <th>Клієнт</th>
                 <th>Кількість</th>
                 <th class="align-right">Сума</th>
               </tr>
             </thead>
             <tbody>
               ${salesWithMeta.map(s => `
                 <tr>
                   <td>${new Date(s.soldAt).toLocaleDateString()}</td>
                   <td>${escapeHtml(s.productName)}</td>
                   <td>${escapeHtml(s.clientName)}${s.clientPhone ? `<br><small>${escapeHtml(s.clientPhone)}</small>` : ''}</td>
                   <td>${Number(s.qty || 0)}</td>
                   <td class="align-right">${Number(s.totalPrice || 0)} ₴</td>
                 </tr>`).join('')}
             </tbody>
           </table>
         </div>`
      : `<p class="reports-empty">За обраний період продажів немає.</p>`;

    // CSV export
    root.querySelector('#exportCsv').onclick = () => {
      const header = ['date','time','client','phone','title','status','paid','price'];
      const lines = rowsWithClient.map(r => [
        new Date(r.startAt).toLocaleDateString(),
        new Date(r.startAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        (r.clientName||'').replaceAll('"','""'),
        (r.clientPhone||'').replaceAll('"','""'),
        (r.title||'').replaceAll('"','""'),
        formatStatus(r.status),
        r.paid ? 'yes' : 'no',
        String(Number(r.price||0))
      ]);
      const csv = [header].concat(lines).map(arr => arr.map(v=>`"${v}"`).join(',')).join('\n');
      downloadText(csv, `finance-${Date.now()}.csv`, 'text/csv;charset=utf-8');
    };
    root.querySelector('#exportSalesCsv').onclick = () => {
      const header = ['date','product','client','phone','qty','unit_price','total'];
      const lines = salesWithMeta.map(s => [
        new Date(s.soldAt).toLocaleDateString(),
        (s.productName||'').replaceAll('"','""'),
        (s.clientName||'').replaceAll('"','""'),
        (s.clientPhone||'').replaceAll('"','""'),
        String(Number(s.qty || 0)),
        String(Number(s.pricePerUnit || 0)),
        String(Number(s.totalPrice || 0))
      ]);
      const csv = [header].concat(lines).map(arr => arr.map(v=>`"${v}"`).join(',')).join('\n');
      downloadText(csv, `product-sales-${Date.now()}.csv`, 'text/csv;charset=utf-8');
    };

    root.querySelectorAll('.reports-period__btn').forEach(b=>b.classList.toggle('active', b.dataset.period===period));
  }

  dateEl.addEventListener('change', load);
  if (root.__reportsClickHandler) {
    root.removeEventListener('click', root.__reportsClickHandler);
  }
  const handleReportClick = (e) => {
    const p = e.target?.dataset?.period;
    if (p) {
      period = p;
      load();
    }
  };
  root.addEventListener('click', handleReportClick);
  root.__reportsClickHandler = handleReportClick;

  await load();
}

/* helpers */
function injectOnce(id, css){ if(document.getElementById(id)) return; const s=document.createElement('style'); s.id=id; s.textContent=css; document.head.appendChild(s); }
function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
const statusLabels = { scheduled:'Заплановано', done:'Виконано', canceled:'Скасовано' };
function formatStatus(status){ return statusLabels[status] || '—'; }
function downloadText(text, filename, type){
  const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}
