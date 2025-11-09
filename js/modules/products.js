import { productsList, productUpsert, productRemove, productSaleCreate, clientsList } from '../store/repository.cloud.js';
import { t, formatNumber } from '../utils/i18n.js';

export async function render(root) {
  root.innerHTML = `
    <section class="section products-page" data-page="products">
      <div class="card products-card">
        <header class="products-head">
          <div>
            <h1>${t('Товари')}</h1>
            <p>${t('Додавайте засоби догляду та фіксуйте продажі клієнтам.')}</p>
          </div>
          <div class="products-counter">
            <span class="badge" id="productsCount">${t('{count} шт.', { count: 0 })}</span>
            <span id="productsRevenue" class="muted"></span>
          </div>
        </header>

        <div class="products-notice" id="productsNotice" aria-live="polite"></div>

        <div class="products-panels">
          <form id="productForm" class="products-form">
            <h3>${t('Новий товар')}</h3>
            <label>${t('Назва')}
              <input id="productName" type="text" required placeholder="${t('Наприклад, крем для обличчя')}" />
            </label>
            <label>${t('Ціна, ₴')}
              <input id="productPrice" type="number" inputmode="decimal" min="0" step="1" placeholder="500" />
            </label>
            <button type="submit" class="btn-cl btn-cl--primary">${t('Додати')}</button>
          </form>

          <form id="saleForm" class="products-form">
            <h3>${t('Продаж клієнту')}</h3>
            <label>${t('Товар')}
              <select id="saleProduct" required></select>
            </label>
            <label>${t('Клієнт')}
              <select id="saleClient">
                <option value="">${t('Без привʼязки')}</option>
              </select>
            </label>
            <div class="products-form__row">
              <label>${t('Кількість')}
                <input id="saleQty" type="number" min="1" step="1" value="1" required />
              </label>
              <label>${t('Ціна за од., ₴')}
                <input id="salePrice" type="number" inputmode="decimal" min="0" step="1" placeholder="0" />
              </label>
            </div>
            <button type="submit" class="btn-cl btn-cl--ghost">${t('Зафіксувати продаж')}</button>
          </form>
        </div>

        <div class="products-table-wrap">
          <table class="products-table">
            <thead>
              <tr>
                <th>${t('Назва')}</th>
                <th>${t('Ціна, ₴')}</th>
                <th>${t('Продано, шт')}</th>
                <th>${t('Виторг, ₴')}</th>
                <th class="col-actions">${t('Дії')}</th>
              </tr>
            </thead>
            <tbody id="productsBody"></tbody>
          </table>
        </div>
      </div>
    </section>
  `;

  const state = {
    products: [],
    clients: [],
  };

  const els = {
    count: root.querySelector('#productsCount'),
    revenue: root.querySelector('#productsRevenue'),
    body: root.querySelector('#productsBody'),
    productForm: root.querySelector('#productForm'),
    productName: root.querySelector('#productName'),
    productPrice: root.querySelector('#productPrice'),
    saleForm: root.querySelector('#saleForm'),
    saleProduct: root.querySelector('#saleProduct'),
    saleClient: root.querySelector('#saleClient'),
    saleQty: root.querySelector('#saleQty'),
    salePrice: root.querySelector('#salePrice'),
    notice: root.querySelector('#productsNotice'),
  };

  let noticeTimer = null;
  const notify = (msg, tone = 'info') => {
    if (!els.notice) return;
    els.notice.textContent = msg;
    els.notice.dataset.tone = tone;
    els.notice.classList.add('show');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => els.notice.classList.remove('show'), 3500);
  };

  const formatCurrency = (value = 0) =>
    `${formatNumber(Number(value || 0))} ₴`;

  async function loadData() {
    const [products, clients] = await Promise.all([
      productsList(),
      clientsList(),
    ]);
    state.products = products;
    state.clients = clients;
    renderProducts();
    renderSelectors();
  }

  function renderProducts() {
    const rows = state.products.map(p => `
      <tr data-id="${p.id}">
        <td>${escapeHtml(p.title || '—')}</td>
        <td>${formatCurrency(p.price || 0)}</td>
        <td>${Number(p.totalSoldQty || 0)}</td>
        <td>${formatCurrency(p.totalRevenue || 0)}</td>
        <td class="col-actions">
          <button type="button" class="btn-inline" data-edit="${p.id}">${t('Редагувати')}</button>
          <button type="button" class="btn-inline text-danger" data-remove="${p.id}">${t('Видалити')}</button>
        </td>
      </tr>
    `).join('');
    els.body.innerHTML = rows || `<tr><td colspan="5" class="empty">${t('Ще немає товарів. Додайте перший, щоб почати продажі.')}</td></tr>`;

    els.count.textContent = t('{count} шт.', { count: state.products.length });
    const totalRevenue = state.products.reduce((acc, p) => acc + Number(p.totalRevenue || 0), 0);
    els.revenue.textContent = totalRevenue ? t('Виторг: {value}', { value: formatCurrency(totalRevenue) }) : '';
  }

  function renderSelectors() {
    if (state.products.length) {
      els.saleProduct.innerHTML = state.products
        .map(p => `<option value="${p.id}">${escapeHtml(p.title || '')}</option>`)
        .join('');
      els.saleProduct.disabled = false;
    } else {
      els.saleProduct.innerHTML = `<option value="">${t('Спочатку додайте товар')}</option>`;
      els.saleProduct.disabled = true;
    }
    if (state.clients.length) {
      const options = [`<option value="">${t('Без привʼязки')}</option>`]
        .concat(state.clients.map(c => `<option value="${c.id}">${escapeHtml(c.name || t('Клієнт'))} ${c.phone ? '· '+escapeHtml(c.phone) : ''}</option>`));
      els.saleClient.innerHTML = options.join('');
    } else {
      els.saleClient.innerHTML = `<option value="">${t('Клієнтів поки немає')}</option>`;
    }
    syncSalePrice();
  }

  function syncSalePrice() {
    const product = state.products.find(p => p.id === els.saleProduct.value);
    if (product) {
      els.salePrice.value = Number(product.price || 0);
    } else if (!state.products.length) {
      els.salePrice.value = '';
    }
  }

  els.productForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = (els.productName.value || '').trim();
    const price = Number(els.productPrice.value || 0);
    if (!title) {
      els.productName.focus();
      return;
    }
    await productUpsert({ title, price });
    els.productForm.reset();
    notify(t('Товар додано'));
    await loadData();
  });

  els.saleProduct?.addEventListener('change', syncSalePrice);

  els.saleForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!els.saleProduct.value) {
      notify(t('Спочатку додайте товар'), 'danger');
      return;
    }
    const qty = Math.max(1, Number(els.saleQty.value || 1));
    const product = state.products.find(p => p.id === els.saleProduct.value);
    const unitPrice = els.salePrice.value === '' ? Number(product?.price || 0) : Number(els.salePrice.value || 0);
    await productSaleCreate({
      productId: els.saleProduct.value,
      clientId: els.saleClient.value || null,
      qty,
      pricePerUnit: unitPrice,
    });
    els.saleQty.value = '1';
    syncSalePrice();
    notify(t('Продаж збережено'));
    await loadData();
  });

  const goToProductForm = (mode, id = '') => {
    sessionStorage.setItem('productReturn', '#/products');
    if (mode === 'edit' && id) {
      location.hash = `#/products/edit/${encodeURIComponent(id)}`;
    } else {
      location.hash = '#/products/new';
    }
  };

  if (root.__productsClickHandler) {
    root.removeEventListener('click', root.__productsClickHandler);
  }
  const handleClick = async (event) => {
    const target = event.target.closest('[data-edit],[data-remove]');
    if (!target) return;
    const id = target.dataset.edit || target.dataset.remove;
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    if (target.dataset.edit) {
      goToProductForm('edit', id);
      return;
    }

    if (target.dataset.remove) {
      if (!confirm(t('Видалити товар? Записи продажів залишаться в звітах.'))) return;
      await productRemove(id);
      notify(t('Товар видалено'), 'danger');
      await loadData();
    }
  };
  root.addEventListener('click', handleClick);
  root.__productsClickHandler = handleClick;

  await loadData();
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
