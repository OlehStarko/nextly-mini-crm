import { fb } from '../db/firebase.js';
import { session } from './session.js';
import { now } from '../utils/format.js';

function userPath(col) {
  const s = session();
  if (!s.user) throw new Error('Not authenticated');
  return `users/${s.user.uid}/${col}`;
}

async function colRef(col) {
  const { db, collection } = await fb();
  return collection(db, userPath(col));
}

// Clients
export async function clientsList() {
  const { getDocs, orderBy, query } = await fb();
  const c = await colRef('clients');
  const snap = await getDocs(query(c, orderBy('createdAt','asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function clientsSearch(q) {
  const s = (q || '').trim().toLowerCase();
  const all = await clientsList();
  return all.filter(x => x.name?.toLowerCase().includes(s) || (x.phone||'').includes(s));
}
export async function clientCreate({ name, phone='', notes='', birthdate=null, avatar=null }) {
  const { addDoc } = await fb();
  const c = await colRef('clients');
  const item = { name, phone, notes, birthdate, avatar, createdAt: now(), updatedAt: now() };
  const docRef = await addDoc(c, item);
  return { id: docRef.id, ...item };
}
export async function clientUpdate(id, patch) {
  const { db, doc, updateDoc } = await fb();
  await updateDoc(doc(db, userPath('clients'), id), { ...patch, updatedAt: now() });
  return true;
}
export async function clientRemove(id) {
  const { db, doc, deleteDoc, getDocs, query, collection, where } = await fb();
  const apptCol = collection(db, userPath('appointments'));
  const snap = await getDocs(query(apptCol, where('clientId','==', id)));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, userPath('clients'), id));
  return true;
}
export async function clientGet(id) {
  const { db, doc, getDoc } = await fb();
  const ref = doc(db, userPath('clients'), id);
  const s = await getDoc(ref);
  return s.exists() ? ({ id: s.id, ...s.data() }) : null;
}

// Services
export async function servicesList(activeOnly = true) {
  const { getDocs, orderBy, query } = await fb();
  const c = await colRef('services');
  const snap = await getDocs(query(c, orderBy('title','asc')));
  let all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return activeOnly ? all.filter(s => s.isActive !== false) : all;
}
export async function serviceUpsert({ id=null, title, priceDefault=0, durationMin=60, isActive=true }) {
  const { db, doc, setDoc, addDoc } = await fb();
  if (id) {
    await setDoc(doc(db, userPath('services'), id), { title, priceDefault, durationMin, isActive }, { merge:true });
    return { id, title, priceDefault, durationMin, isActive };
  } else {
    const c = await colRef('services');
    const ref = await addDoc(c, { title, priceDefault, durationMin, isActive });
    return { id: ref.id, title, priceDefault, durationMin, isActive };
  }
}
// Видалити послугу
export async function serviceRemove(id) {
  const { db, doc, deleteDoc } = await fb();
  await deleteDoc(doc(db, userPath('services'), id));
  return true;
}
export async function serviceGet(id) {
  if (!id) return null;
  const { db, doc, getDoc } = await fb();
  const ref = doc(db, userPath('services'), id);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
}
// Appointments
export async function apptCreate({
  clientId,
  serviceId = null,
  title = '',
  startAt,
  endAt,
  price = 0,
  status = 'scheduled',
  paid = false,
  notes = '',
  // ⬇ поля, що можуть прийти з модалки
  date = null,
  time = null,
  ts = null,
}) {
  const { addDoc } = await fb();
  const c = await colRef('appointments');

  // якщо не передали date/time/ts — виводимо з startAt
  const d = new Date(startAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');

  const item = {
    clientId,
    serviceId,
    title,
    startAt,
    endAt,
    price,
    status,
    paid,
    notes,
    // ⬇ гарантуємо наявність полів для Dashboard
    date: date || `${y}-${m}-${day}`,
    time: time || `${hh}:${mm}`,
    ts: ts || startAt,

    createdAt: now(),
    updatedAt: now(),
  };

  const ref = await addDoc(c, item);
  return { id: ref.id, ...item };
}
export async function apptUpdate(id, patch) {
  const { db, doc, updateDoc } = await fb();

  const p = { ...patch };

  if (typeof p.startAt === 'number' && p.startAt > 0) {
    // якщо startAt змінено, але date/time/ts не передані — синхронізуємо
    const needDate = !('date' in p);
    const needTime = !('time' in p);
    const needTs   = !('ts' in p);
    if (needDate || needTime || needTs) {
      const d = new Date(p.startAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      if (needDate) p.date = `${y}-${m}-${day}`;
      if (needTime) p.time = `${hh}:${mm}`;
      if (needTs)   p.ts   = p.startAt;
    }
  }

  p.updatedAt = now();
  await updateDoc(doc(db, userPath('appointments'), id), p);
  return true;
}
export async function apptListRange(startTs, endTs) {
  const { db, collection, query, where, orderBy, getDocs } = await fb();
  const c = collection(db, userPath('appointments'));
  const q = query(c, where('startAt','>=', startTs), where('startAt','<=', endTs), orderBy('startAt','asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function apptRemove(id) {
  const { db, doc, deleteDoc } = await fb();
  await deleteDoc(doc(db, userPath('appointments'), id));
  return true;
}

// Settings
export async function settingsGet() {
  const { db, doc, getDoc } = await fb();
  const ref = doc(db, userPath('settings'), 'app');
  const s = await getDoc(ref);
  return s.exists() ? s.data() : { id:'app', currency:'UAH', locale:'uk-UA', timeFormat:'24h', weekStartsOn:1 };
}
export async function settingsSave(patch) {
  const { db, doc, setDoc } = await fb();
  await setDoc(doc(db, userPath('settings'), 'app'), patch, { merge:true });
  return true;
}

// Products
export async function productsList() {
  const { getDocs, orderBy, query } = await fb();
  const c = await colRef('products');
  const snap = await getDocs(query(c, orderBy('createdAt','desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function productUpsert({ id=null, title, price=0 }) {
  const { db, doc, setDoc, addDoc } = await fb();
  const payload = {
    title,
    price: Number(price) || 0,
    updatedAt: now(),
  };
  if (id) {
    await setDoc(doc(db, userPath('products'), id), payload, { merge:true });
    return { id, ...payload };
  } else {
    const c = await colRef('products');
    const item = { ...payload, totalSoldQty: 0, totalRevenue: 0, createdAt: now() };
    const ref = await addDoc(c, item);
    return { id: ref.id, ...item };
  }
}
export async function productRemove(id) {
  const { db, doc, deleteDoc } = await fb();
  await deleteDoc(doc(db, userPath('products'), id));
  return true;
}
export async function productGet(id) {
  if (!id) return null;
  const { db, doc, getDoc } = await fb();
  const ref = doc(db, userPath('products'), id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Product sales
async function updateProductStats(productId, qtyDelta, revenueDelta) {
  const { db, doc, getDoc, updateDoc } = await fb();
  const ref = doc(db, userPath('products'), productId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() || {};
  const totalSoldQty = Number(data.totalSoldQty || 0) + qtyDelta;
  const totalRevenue = Number(data.totalRevenue || 0) + revenueDelta;
  await updateDoc(ref, { totalSoldQty, totalRevenue, updatedAt: now() });
}
export async function productSaleCreate({ productId, clientId=null, qty=1, pricePerUnit=null, soldAt=null }) {
  const { addDoc } = await fb();
  if (!productId) throw new Error('productId required');
  const c = await colRef('productSales');
  const qtyNum = Math.max(1, Number(qty) || 1);
  const priceNum = Number(pricePerUnit) || 0;
  const totalPrice = qtyNum * priceNum;
  const ts = typeof soldAt === 'number' ? soldAt : Date.now();
  const item = {
    productId,
    clientId,
    qty: qtyNum,
    pricePerUnit: priceNum,
    totalPrice,
    soldAt: ts,
    createdAt: now(),
    updatedAt: now(),
  };
  const ref = await addDoc(c, item);
  await updateProductStats(productId, qtyNum, totalPrice);
  return { id: ref.id, ...item };
}
export async function productSalesRange(startTs, endTs) {
  const { db, collection, query, where, orderBy, getDocs } = await fb();
  const c = collection(db, userPath('productSales'));
  const q = query(
    c,
    where('soldAt','>=', startTs),
    where('soldAt','<=', endTs),
    orderBy('soldAt','asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
