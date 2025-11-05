import { fb } from '../db/firebase.js';
import { signIn, signUp, getAuthInstance } from '../store/session.js';
export function render(root) {
  root.innerHTML = `
    <section class="auth-section">
      <div class="auth-box">
        <h2 id="authTitle">Увійти</h2>
        <form id="authForm">
          <div id="nameField" class="field hidden">
            <label for="name">Ім’я</label>
            <input type="text" id="name" name="name" placeholder="Ваше ім’я">
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" placeholder="email@example.com" required>
          </div>
          <div class="field">
            <label for="password">Пароль</label>
            <input type="password" id="password" name="password" placeholder="••••••••" required>
          </div>
          <button type="submit" id="submitBtn">Увійти</button>
        </form>
        <p class="toggle">
          <span id="toggleText">Немає акаунта?</span>
          <a href="#" id="toggleLink">Зареєструватися</a>
        </p>
      </div>
    </section>
  `;

  // moved CSS to external file


  const form = root.querySelector('#authForm');
  const title = root.querySelector('#authTitle');
  const toggleLink = root.querySelector('#toggleLink');
  const toggleText = root.querySelector('#toggleText');
  const nameField = root.querySelector('#nameField');
  const submitBtn = root.querySelector('#submitBtn');

  let mode = 'login'; // login | register

  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (mode === 'login') {
      mode = 'register';
      title.textContent = 'Зареєструватися';
      submitBtn.textContent = 'Зареєструватися';
      toggleText.textContent = 'Вже маєте акаунт?';
      toggleLink.textContent = 'Увійти';
      nameField.classList.remove('hidden');
    } else {
      mode = 'login';
      title.textContent = 'Увійти';
      submitBtn.textContent = 'Увійти';
      toggleText.textContent = 'Немає акаунта?';
      toggleLink.textContent = 'Зареєструватися';
      nameField.classList.add('hidden');
    }
  });


form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const name = form.name?.value.trim();

  try {
    if (mode === 'login') {
      await signIn(email, password);
      return;
    }

    // ---- РЕЖИМ РЕЄСТРАЦІЇ ----
    try {
      // пробуємо створити акаунт
      const user = await signUp(email, password, name);
      console.log('✅ Реєстрація успішна:', user);
    } catch (err) {
      // якщо такий email вже є — тихо перемикаємось на вхід
      if (err?.code === 'auth/email-already-in-use') {
        // опціонально можна спробувати перевірку методів, але не обов'язково
        alert('Цей email вже зареєстрований. Перемикаю форму на "Увійти".');

        mode = 'login';
        title.textContent = 'Увійти';
        submitBtn.textContent = 'Увійти';
        toggleText.textContent = 'Немає акаунта?';
        toggleLink.textContent = 'Зареєструватися';
        nameField.classList.add('hidden');

        // НІЯКИХ перекидок у signUp далі — просто виходимо
        return;
      }

      // інші помилки реєстрації — покажемо як є
      throw err;
    }
  } catch (err) {
    console.error('Auth error:', err?.code, err?.message);
    alert(`${err?.code || 'auth/error'}: ${err?.message || 'Unknown error'}`);
  }
});


}

function injectOnce(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = css;
  document.head.appendChild(s);
}
