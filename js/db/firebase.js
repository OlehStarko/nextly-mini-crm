export async function fb() {
  const [
  { initializeApp },
  {
    getAuth, onAuthStateChanged,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
    setPersistence, browserLocalPersistence,
    updateProfile, fetchSignInMethodsForEmail
  },
  {
    getFirestore, enableIndexedDbPersistence,
    collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy
  }
] = await Promise.all([
  import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'),
]);

  const firebaseConfig = {
    apiKey: "AIzaSyBlVvVhnLkRmYLsX60AHb9UcpEso1a-OeA",
    authDomain: "minicrm-1ff0a.firebaseapp.com",
    projectId: "minicrm-1ff0a",
    storageBucket: "minicrm-1ff0a.firebasestorage.app",
    messagingSenderId: "497248064849",
    appId: "1:497248064849:web:5c6f4154f4117596592f70",
    measurementId: "G-77LHQ3SFER"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence);

  const db = getFirestore(app);
  try { await enableIndexedDbPersistence(db); } catch {}

return {
  app, auth,
  onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  setPersistence, browserLocalPersistence,
  updateProfile, fetchSignInMethodsForEmail,   // ← додано
  db, enableIndexedDbPersistence,
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy
};
}
