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
  const { auth, onAuthStateChanged, getRedirectResult } = await fb();

  // позначимо pending для хедера, якщо він уже в DOM
  document.querySelector('.nav-right')?.setAttribute('data-auth', 'pending');

  // 1) якщо був Google-редірект – тихо доберемо результат (Chrome Mobile кейс)
  try { await getRedirectResult(auth); } catch (e) { console.warn(e); }

  // 2) слухаємо зміну авторизації
  onAuthStateChanged(auth, (user) => {
    _state = { user };
    emit();
    updateHeaderAuthUI(user);
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
function isMobileChrome() {
  const ua = navigator.userAgent;
  return /Android.*Chrome/i.test(ua) || /CriOS/i.test(ua); // Chrome на iOS = CriOS
}

export async function googleSignIn() {
  const { auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await fb();
  const provider = new GoogleAuthProvider();

  try {
    if (isMobileChrome()) {
      // 👉 Chrome Mobile — надійніше через redirect
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
    }
  } catch (err) {
    console.error('Google sign-in popup failed, falling back to redirect:', err);
    await signInWithRedirect(auth, provider);
  }
}
