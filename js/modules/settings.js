export async function render(root) {
  // moved CSS to external file


  root.innerHTML = `
    <section>
      <div class="card">
        <div class="h3">Основні налаштування</div>
        <div class="grid">
          <div>
            <label>Мова інтерфейсу</label>
            <select id="lang">
              <option value="uk">Українська</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label>Валюта</label>
            <select id="currency">
              <option value="UAH">₴ Гривня</option>
              <option value="USD">$ Долар</option>
              <option value="EUR">€ Євро</option>
            </select>
          </div>
        </div>
        <div style="margin-top:8px;" class="muted">Зберігаються локально для поточного браузера.</div>
      </div>
    </section>
  `;

  // локальні базові налаштування
  const langEl = root.querySelector('#lang');
  const curEl  = root.querySelector('#currency');
  langEl.value = localStorage.getItem('ui.lang') || 'uk';
  curEl.value  = localStorage.getItem('ui.currency') || 'UAH';
  langEl.addEventListener('change', () => localStorage.setItem('ui.lang', langEl.value));
  curEl.addEventListener('change',  () => localStorage.setItem('ui.currency', curEl.value));
}

/* utils */
function injectOnce(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style'); s.id = id; s.textContent = css;
  document.head.appendChild(s);
}
