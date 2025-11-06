// public/js/store/session.js
import { fb } from '../db/firebase.js';

export async function signUp(email, password, name) {
  const { auth, createUserWithEmailAndPassword, updateProfile } = await fb();
  const res = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(res.user, { displayName: name });
  return res.user;
}

let _state = { user: null };
const listeners = new Set();

export function session() {
  return _state;
}

export function onSession(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit() {
  for (const cb of listeners) cb(_state);
}

// ---------- UI хедера під стан auth ----------
function updateHeaderAuthUI(user) {
  const el = document.querySelector('.nav-right');
  if (!el) return;

  // коли маємо відповідь від Firebase — знімаємо pending
  el.setAttribute('data-auth', 'ready');

  if (user) {
    const initials = (user.displayName || '')
      .split(/\s+/).map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase() || 'U';

    el.innerHTML = `
      <div class="avatar">${initials}</div>
      <span class="username">${user.displayName || 'User'}</span>
      <a id="logout" href="#" style="color:#6b7280;text-decoration:none">Вийти</a>
    `;

    // вихід (разово, поки не перерендеримо .nav-right)
    el.querySelector('#logout')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const { auth, signOut } = await fb();
      await signOut(auth);
    }, { once: true });

  } else {
    // гість
    el.innerHTML = `<a href="#/signin" class="btn">Увійти</a>`;
  }
}

// ---------- ініціалізація відстеження стану auth ----------
export async function initSession() {
  const { auth, onAuthStateChanged } = await fb();

  // якщо хедер уже в DOM — позначаємо, що чекаємо на auth
  document.querySelector('.nav-right')?.setAttribute('data-auth', 'pending');

  onAuthStateChanged(auth, (user) => {
    _state = { user };
    emit();                // повідомляємо всіх слухачів
    updateHeaderAuthUI(user); // оновлюємо UI хедера
  });
}

// SIGN IN
export async function signIn(email, password) {
  const { auth, signInWithEmailAndPassword } = await fb();
  const res = await signInWithEmailAndPassword(auth, email, password);
  return res.user;
}

export async function getAuthInstance() {
  const { auth } = await fb();
  return auth;
}

// SIGN OUT
export async function signOutAll() {
  const { auth, signOut } = await fb();
  await signOut(auth);
}
