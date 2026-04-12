// ── AURELIA ECHOES: Main App ──

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'library') renderLibrary();
    if (btn.dataset.tab === 'wishlist') renderWishlist();
    if (btn.dataset.tab === 'series') renderSeries();
    if (btn.dataset.tab === 'logs') renderLogs();
  });
});

async function renderLibrary() {
  const grid = document.getElementById('libraryGrid');
  grid.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';
  const books = await getBooksByStatus('owned');
  grid.innerHTML = books.length
    ? books.map(bookCardHTML).join('')
    : '<p style="color:var(--text-muted)">No books yet. Use the Import tab to add your library!</p>';
}

async function renderWishlist() {
  const grid = document.getElementById('wishlistGrid');
  const books = await getBooksByStatus('wishlist');
  grid.innerHTML = books.length
    ? books.map(bookCardHTML).join('')
    : '<p style="color:var(--text-muted)">Your wishlist is empty.</p>';
}

async function renderSeries() {
  const grid = document.getElementById('seriesGrid');
  const books = await getAllBooks();
  const seriesMap = {};
  books.forEach(book => {
    if (!book.series) return;
    if (!seriesMap[book.series]) seriesMap[book.series] = { author: book.author, total: 0, owned: 0 };
    seriesMap[book.series].total++;
    if (book.status === 'owned') seriesMap[book.series].owned++;
  });
  const names = Object.keys(seriesMap);
  grid.innerHTML = names.length ? names.map(name => {
    const s = seriesMap[name];
    const pct = Math.round((s.owned / s.total) * 100);
    return `<div class="series-card">
      <div class="series-title">${name}</div>
      <div class="series-author">by ${s.author || 'Unknown'}</div>
      <div class="series-progress-bar"><div class="series-progress-fill" style="width:${pct}%"></div></div>
      <div class="series-count">${s.owned} of ${s.total} owned · ${pct}% complete</div>
    </div>`;
  }).join('') : '<p style="color:var(--text-muted)">No series found. Import books with series data to see them here.</p>';
}

async function renderLogs() {
  const viewer = document.getElementById('logViewer');
  const logs = await getAllLogs();
  viewer.textContent = logs.length
    ? logs.sort((a, b) => b.timestamp - a.timestamp).map(l => `[${l.date}] ${l.message}`).join('\n')
    : 'No log entries yet.';
}

document.getElementById('shareLogBtn')?.addEventListener('click', async () => {
  const logs = await getAllLogs();
  const content = logs.sort((a, b) => b.timestamp - a.timestamp).map(l => `[${l.date}] ${l.message}`).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  a.download = `aurelia-echoes-log-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
});

function bookCardHTML(book) {
  const cover = book.coverUrl
    ? `<img class="book-cover" src="${book.coverUrl}" alt="${book.title}" loading="lazy">`
    : `<div class="book-cover-placeholder">🎧</div>`;
  return `<div class="book-card">${cover}<div class="book-info">
    <div class="book-title">${book.title}</div>
    <div class="book-author">${book.author || ''}</div>
  </div></div>`;
}

document.getElementById('searchBar')?.addEventListener('input', async (e) => {
  const q = e.target.value.toLowerCase();
  const books = await getAllBooks();
  const filtered = books.filter(b =>
    (b.title || '').toLowerCase().includes(q) ||
    (b.author || '').toLowerCase().includes(q) ||
    (b.series || '').toLowerCase().includes(q)
  );
  document.getElementById('libraryGrid').innerHTML = filtered.length
    ? filtered.map(bookCardHTML).join('')
    : '<p style="color:var(--text-muted)">No results found.</p>';
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/aureliaechoes/sw.js')
    .then(() => console.log('✅ Service Worker registered'));
}

document.addEventListener('DOMContentLoaded', async () => {
  await openLocalDB();
  renderLibrary();
  console.log('🎧 Aurelia Echoes is running!');
});
