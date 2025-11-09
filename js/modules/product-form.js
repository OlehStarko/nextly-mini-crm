import { productUpsert, productGet } from '../store/repository.cloud.js';
import { t } from '../utils/i18n.js';

export async function render(root, params = {}) {
  const mode = params.mode === 'edit' ? 'edit' : 'new';
  const productId = mode === 'edit' ? params.id : null;
  const returnHash = sessionStorage.getItem('productReturn') || '#/products';
  const titleText = mode === 'edit' ? t('Редагувати товар') : t('Новий товар');
  const submitText = mode === 'edit' ? t('Зберегти') : t('Створити');

  root.innerHTML = `
    <section class="page page--product-form">
      <div class="card product-form">
        <header class="edit-appt__head">
          <h1>${titleText}</h1>
          <button class="btn-cl btn-cl--ghost" id="productFormBack" type="button">${t('← Назад')}</button>
        </header>
        <form id="productForm" class="edit-appt__form">
          <label>${t('Назва')}
            <input id="productTitle" type="text" placeholder="${t('Назва товару')}" required />
          </label>
          <label>${t('Ціна, ₴')}
            <input id="productPrice" type="number" min="0" step="1" placeholder="0" />
          </label>
          <div class="edit-appt__actions">
            <button type="button" class="btn-cl btn-cl--ghost" id="productCancel">${t('Скасувати')}</button>
            <button type="submit" class="btn-cl btn-cl--primary">${submitText}</button>
          </div>
        </form>
      </div>
    </section>
  `;

  const goBack = () => {
    sessionStorage.removeItem('productReturn');
    location.hash = returnHash;
  };
  document.getElementById('productFormBack')?.addEventListener('click', goBack);
  document.getElementById('productCancel')?.addEventListener('click', goBack);

  const titleEl = document.getElementById('productTitle');
  const priceEl = document.getElementById('productPrice');

  if (mode === 'edit' && productId) {
    try {
      const product = await productGet(productId);
      if (!product) throw new Error('notfound');
      titleEl.value = product.title || '';
      priceEl.value = Number(product.price || 0);
    } catch (err) {
      console.error(err);
      document
        .querySelector('.product-form')
        ?.insertAdjacentHTML('beforeend', `<p class="error">${t('Не вдалося завантажити товар.')}</p>`);
    }
  }

  document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleEl.value.trim();
    const price = Math.max(0, Number(priceEl.value || 0) || 0);
    if (!title) {
      alert(t('Вкажіть назву товару'));
      titleEl.focus();
      return;
    }
    await productUpsert({
      id: productId || null,
      title,
      price,
    });
    goBack();
  });
}
