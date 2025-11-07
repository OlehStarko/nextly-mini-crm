import { fb } from '../db/firebase.js';
import { signIn, signUp } from '../store/session.js';

export function render(root) {
  document.documentElement.classList.add('is-auth');

  root.innerHTML = `
    <section class="auth-section">
      <div class="auth-box">
        <h2 id="authTitle">Увійти</h2>

        <form id="authForm">
          <div id="nameField" class="field hidden">
            <label for="name">Ім’я</label>
            <input type="text" id="name" name="name" placeholder="Ваше ім’я" autocomplete="name">
          </div>

          <div class="field">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" placeholder="email@example.com" required autocomplete="email">
          </div>

          <div class="field">
            <label for="password">Пароль</label>
            <input type="password" id="password" name="password" placeholder="••••••••" required autocomplete="current-password">
          </div>

          <button type="submit" id="submitBtn" class="btn-primary">Увійти</button>
        </form>

        <p class="toggle">
          <span id="toggleText">Немає акаунта?</span>
          <a href="#" id="toggleLink">Зареєструватися</a>
        </p>
      </div>
    </section>
  `;

  const form       = root.querySelector('#authForm');
  const titleEl    = root.querySelector('#authTitle');
  const toggleLink = root.querySelector('#toggleLink');
  const toggleText = root.querySelector('#toggleText');
  const nameField  = root.querySelector('#nameField');
  const submitBtn  = root.querySelector('#submitBtn');

  let mode = 'login'; // 'login' | 'register'

  function setMode(next) {
    mode = next;
    const isReg = mode === 'register';
    titleEl.textContent    = isReg ? 'Реєстрація' : 'Увійти';
    submitBtn.textContent  = isReg ? 'Зареєструватися' : 'Увійти';
    toggleText.textContent = isReg ? 'Вже маєте акаунт?' : 'Немає акаунта?';
    toggleLink.textContent = isReg ? 'Увійти' : 'Зареєструватися';
    nameField.classList.toggle('hidden', !isReg);
    // підказка браузеру які автозаповнення використовувати
    form.password.setAttribute('autocomplete', isReg ? 'new-password' : 'current-password');
  }

  // перемикач режимів
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    setMode(mode === 'login' ? 'register' : 'login');
  });

  // ЄДИНИЙ submit-хендлер
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.body.classList.remove('nav-open'); // на випадок відкритого бургера

    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const name = form.name?.value.trim();

    try {
      if (mode === 'login') {
        await signIn(email, password);
        location.hash = '#/dashboard';
        return;
      }

      // ---- реєстрація ----
      try {
        await signUp(email, password, name);
        location.hash = '#/dashboard';
      } catch (err) {
        if (err?.code === 'auth/email-already-in-use') {
          alert('Цей email вже зареєстрований. Перемикаю форму на "Увійти".');
          setMode('login');
          return;
        }
        throw err;
      }
    } catch (err) {
      console.error('Auth error:', err?.code, err?.message);
      alert(`${err?.code || 'auth/error'}: ${err?.message || 'Unknown error'}`);
    }
  });

  // стартуємо в режимі входу (поле "Ім’я" сховане)
  setMode('login');
}
