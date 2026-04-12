// ── AURELIA ECHOES: Local Database (IndexedDB) ──

const DB_NAME = 'AureliaEchoesDB';
const DB_VERSION = 1;
let localDB;

function openLocalDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('books')) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id' });
        bookStore.createIndex('status', 'status', { unique: false });
        bookStore.createIndex('series', 'series', { unique: false });
        bookStore.createIndex('author', 'author', { unique: false });
      }
      if (!db.objectStoreNames.contains('series')) {
        db.createObjectStore('series', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (e) => {
      localDB = e.target.result;
      console.log("✅ Local database ready");
      resolve(localDB);
    };

    request.onerror = () => reject(request.error);
  });
}

function generateId(book) {
  const raw = `${(book.title || '').toLowerCase().trim()}-${(book.author || '').toLowerCase().trim()}`;
  return raw.replace(/[^a-z0-9]/g, '-');
}

function upsertBook(book) {
  return new Promise((resolve, reject) => {
    book.id = book.id || generateId(book);
    const tx = localDB.transaction('books', 'readwrite');
    const store = tx.objectStore('books');
    const getReq = store.get(book.id);

    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, ...book });
        resolve('updated');
      } else {
        store.put(book);
        resolve('added');
      }
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

function getAllBooks() {
  return new Promise((resolve, reject) => {
    const tx = localDB.transaction('books', 'readonly');
    const req = tx.objectStore('books').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getBooksByStatus(status) {
  return new Promise((resolve, reject) => {
    const tx = localDB.transaction('books', 'readonly');
    const index = tx.objectStore('books').index('status');
    const req = index.getAll(status);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function saveLog(message) {
  const today = new Date().toISOString().split('T')[0];
  const tx = localDB.transaction('logs', 'readwrite');
  tx.objectStore('logs').add({ date: today, message, timestamp: Date.now() });
}

function getAllLogs() {
  return new Promise((resolve, reject) => {
    const tx = localDB.transaction('logs', 'readonly');
    const req = tx.objectStore('logs').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
