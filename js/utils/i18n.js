const dictionaries = {
  en: {
    'Головна': 'Home',
    'Клієнти': 'Clients',
    'Записи': 'Appointments',
    'Послуги': 'Services',
    'Товари': 'Products',
    'Фінанси': 'Reports',
    'Налаштування': 'Settings',
    'Увійти': 'Sign in',
    'Вийти': 'Sign out',
    'Nextly — авторизуйтесь, щоб працювати із даними': 'Nextly — sign in to start working with your data',
    '© 2025 Mini CRM. Усі права захищені.': '© 2025 Mini CRM. All rights reserved.',
    'Базова дата': 'Base date',
    'Усі': 'All',
    'Сьогодні': 'Today',
    'Тиждень': 'Week',
    'Місяць': 'Month',
    'Заплановано': 'Scheduled',
    'Виконано': 'Done',
    'Скасовано': 'Canceled',
    'Клієнт': 'Client',
    'Усі клієнти': 'All clients',
    'Клієнтів поки немає': 'No clients yet',
    '+ Новий запис': '+ New appointment',
    'Записів': 'Appointments',
    'Сума': 'Amount',
    'Період': 'Period',
    'Усі записи': 'All appointments',
    'У цьому періоді записів немає.': 'No appointments for this period.',
    'Оплачено': 'Paid',
    'Редагувати': 'Edit',
    'Видалити': 'Delete',
    'Видалити запис?': 'Delete the appointment?',
    'Видалити клієнта і пов’язані записи?': 'Delete the client and related appointments?',
    'Видалити послугу? Існуючі записи залишаться з назвою/ціною на момент створення.': 'Delete the service? Existing appointments will keep the name/price from creation time.',
    '+ Додати клієнта': '+ Add client',
    'Пошук по імені або телефону': 'Search by name or phone',
    'Історія': 'History',
    'Історія відвідувань': 'Visit history',
    'Клієнт не знайдений.': 'Client not found.',
    'Вік': 'Age',
    'Записів на сьогодні': 'Today’s appointments',
    'Авторизуйтесь…': 'Please sign in…',
    'Завантаження...': 'Loading…',
    'Новий клієнт': 'New client',
    'Редагувати клієнта': 'Edit client',
    'Створити': 'Create',
    'Зберегти': 'Save',
    '← Назад': '← Back',
    'Основні налаштування': 'General settings',
    'Користувач': 'User',
    'Ім’я': 'Name',
    'Телефон': 'Phone',
    'Дата народження': 'Birth date',
    'Фото': 'Photo',
    'Послуга': 'Service',
    'прев’ю': 'preview',
    'Вік: {age}': 'Age: {age}',
    'Скасувати': 'Cancel',
    'Не вдалося завантажити клієнта.': 'Failed to load the client.',
    'Не вдалося завантажити історію.': 'Failed to load history.',
    'ще не має відвідувань.': 'has no visits yet.',
    'Всього візитів: {count}': 'Total visits: {count}',
    'Оплачено: {count}': 'Paid: {count}',
    'Сума: {amount}': 'Amount: {amount}',
    'Без назви': 'Untitled',
    'Не вдалося завантажити послугу.': 'Failed to load the service.',
    'Вкажіть назву послуги': 'Enter the service name',
    'Тривалість повинна бути ≥ 5 хв': 'Duration must be ≥ 5 min',
    'Увійти': 'Sign in',
    'Реєстрація': 'Sign up',
    'Немає акаунта?': 'Don’t have an account?',
    'Зареєструватися': 'Sign up',
    'Вже маєте акаунт?': 'Already have an account?',
    'Email': 'Email',
    'Пароль': 'Password',
    'Мова інтерфейсу': 'Interface language',
    'Валюта': 'Currency',
    'Українська': 'Ukrainian',
    'English': 'English',
    '₴ Гривня': '₴ Hryvnia',
    '$ Долар': '$ Dollar',
    '€ Євро': '€ Euro',
    'Зберігаються локально для поточного браузера.': 'Stored locally for this browser.',
    'Оплачено': 'Paid',
    'Так': 'Yes',
    'Ні': 'No',
    'Записів: {count}': 'Appointments: {count}',
    'Сума: {amount}': 'Amount: {amount}',
    'Період: {period}': 'Period: {period}',
    ' · Клієнт: {name}': ' · Client: {name}',
    'Продажі товарів': 'Product sales',
    'Експорт записів': 'Export appointments',
    'Експорт продажів': 'Export sales',
    'За обраний період записів немає.': 'No appointments for the selected period.',
    'Продажі товарів': 'Product sales',
    'За обраний період продажів немає.': 'No product sales for the selected period.',
    'Товари': 'Products',
    'Додавайте засоби догляду та фіксуйте продажі клієнтам.': 'Add care products and track client sales.',
    'Новий товар': 'New product',
    'Назва': 'Name',
    'Додати': 'Add',
    'Продаж клієнту': 'Sell to client',
    'Товар': 'Product',
    'Без привʼязки': 'No client',
    'Кількість': 'Quantity',
    'Ціна за од., ₴': 'Unit price, ₴',
    'Зафіксувати продаж': 'Record sale',
    'Продано, шт': 'Sold, pcs',
    'Виторг, ₴': 'Revenue, ₴',
    'Дії': 'Actions',
    'Назва товару': 'Product name',
    'Наприклад, крем для обличчя': 'e.g., face cream',
    'Редагувати послугу': 'Edit service',
    'Нова послуга': 'New service',
    'Ціна, ₴': 'Price, ₴',
    'Тривалість, хв': 'Duration, min',
    'Активна (видима у виборі послуг)': 'Active (visible in service picker)',
    'Напр., Стрижка': 'e.g., Haircut',
    'Ціна, ₴': 'Price, ₴',
    'Продаж клієнту': 'Sell to client',
    'Клієнт': 'Client',
    'Без привʼязки': 'Without client',
    'Кількість': 'Quantity',
    'Ціна за од., ₴': 'Price per unit, ₴',
    'Зафіксувати продаж': 'Record sale',
    'Продано, шт': 'Sold, pcs',
    'Виторг, ₴': 'Revenue, ₴',
    'Ще немає товарів. Додайте перший, щоб почати продажі.': 'No products yet. Add the first one to start selling.',
    '{count} шт.': '{count} pcs',
    'Виторг: {value}': 'Revenue: {value}',
    'Спочатку додайте товар': 'Add a product first',
    'Товар додано': 'Product added',
    'Продаж збережено': 'Sale saved',
    'Назва товару': 'Product name',
    'Вкажіть назву товару': 'Enter the product name',
    'Товар оновлено': 'Product updated',
    'Видалити товар? Записи продажів залишаться в звітах.': 'Delete the product? Sales records will stay in reports.',
    'Товар видалено': 'Product removed',
    'Виторг: {value}': 'Revenue: {value}',
    'Товар додано': 'Product added',
    'Продаж збережено': 'Sale saved',
    'Редагувати товар': 'Edit product',
    'Товар оновлено': 'Product updated',
    'Видалити товар? Записи продажів залишаться в звітах.': 'Delete the product? Sales records will remain in reports.',
    'Товар видалено': 'Product removed',
    'Фінанси': 'Reports',
    'Експорт CSV': 'Export CSV',
    'Записів': 'Appointments',
    'Оплачено': 'Paid',
    'Неоплачено': 'Unpaid',
    'Сума': 'Amount',
    'Заплановано': 'Scheduled',
    'Виконано': 'Done',
    'Скасовано': 'Canceled',
    'Дата': 'Date',
    'Час': 'Time',
    'Послуга': 'Service',
    'Статус': 'Status',
    'Оплачено': 'Paid',
    'Сума': 'Amount',
    'Товар': 'Product',
    'Кількість': 'Qty',
    'Сума': 'Amount',
    'Ім’я': 'Name',
    'Телефон': 'Phone',
    'Дата народження': 'Birth date',
    'Фото': 'Photo',
    'Вік: {age}{mark}': 'Age: {age}{mark}',
    'Скасувати': 'Cancel',
    'Вийти': 'Sign out',
    'Записів на сьогодні': 'Today’s appointments',
    'Записи на сьогодні': 'Today’s appointments',
    'Записи на {date}': 'Appointments on {date}',
    'Записи': 'Appointments',
    'Базова дата': 'Base date',
    'Не вдалося завантажити товар.': 'Failed to load the product.',
  }
};

const locales = {
  uk: 'uk-UA',
  en: 'en-US',
};

let currentLang = localStorage.getItem('ui.lang') || 'uk';
const listeners = new Set();

function getDictionary() {
  return dictionaries[currentLang] || {};
}

export function t(key, params = null) {
  let phrase = currentLang === 'uk' ? key : (getDictionary()[key] || key);
  if (params) {
    Object.entries(params).forEach(([name, value]) => {
      phrase = phrase.replaceAll(`{${name}}`, value);
    });
  }
  return phrase;
}

export function initI18n() {
  document.documentElement.setAttribute('lang', currentLang);
}

export function getLang() {
  return currentLang;
}

export function setLang(next) {
  if (!next) return;
  if (next === currentLang) return;
  currentLang = next;
  localStorage.setItem('ui.lang', currentLang);
  document.documentElement.setAttribute('lang', currentLang);
  listeners.forEach((cb) => cb(currentLang));
}

export function onLangChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function formatDate(value, options) {
  const locale = locales[currentLang] || locales.uk;
  return new Date(value).toLocaleDateString(locale, options);
}

export function formatTime(value, options) {
  const locale = locales[currentLang] || locales.uk;
  return new Date(value).toLocaleTimeString(locale, options);
}

export function formatNumber(value, options) {
  const locale = locales[currentLang] || locales.uk;
  return Number(value).toLocaleString(locale, options);
}

const attrList = ['placeholder', 'aria-label', 'title', 'value', 'alt'];

function translateNode(node) {
  if (!node) return;
  const dict = getDictionary();
  if (currentLang === 'uk') return;
  if (node.nodeType === Node.TEXT_NODE) {
    const original = node.textContent;
    if (!original) return;
    const trimmed = original.trim();
    if (!trimmed) return;
    const translated = dict[trimmed];
    if (!translated) return;
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    node.textContent = `${leading}${translated}${trailing}`;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  attrList.forEach((attr) => {
    const val = node.getAttribute(attr);
    if (!val) return;
    const translated = dict[val];
    if (translated) node.setAttribute(attr, translated);
  });
  node.childNodes.forEach(translateNode);
}

export function applyTranslations(root = document.body) {
  if (!root || currentLang === 'uk') return;
  translateNode(root);
}
