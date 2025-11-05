// public/js/store/session.js
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

// ініціалізація відстеження стану
export async function initSession() {
  const { auth, onAuthStateChanged } = await fb();
  onAuthStateChanged(auth, (user) => {
    _state = { user };
    emit();
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
