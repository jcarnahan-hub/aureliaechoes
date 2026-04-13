// ── AURELIA ECHOES: Main App (Phase 2) ──

// ── TAB NAVIGATION ──
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

// ── RENDER LIBRARY ──
async function renderLibrary() {
  const grid = document.getElementById('libraryGrid');
  grid.innerHTML = '<p style="color:var(--text-muted)">Loading your library...</p>';
  const books = await getBooksByStatus('owned');
  grid.innerHTML = books.length
    ? books.map(b => bookCardHTML(b, false)).join('')
    : '<p style="color:var(--text-muted)">No books yet. Use the Import tab to add your library!</p>';
}

// ── RENDER WISHLIST ──
async function renderWishlist() {
  const grid = document.getElementById('wishlistGrid');
  grid.innerHTML = '<p style="color:var(--text-muted)">Loading wishlist...</p>';
  const books = await getBooksByStatus('wishlist');
  grid.innerHTML = books.length
    ? books.map(b => bookCardHTML(b, true)).join('')
    : '<p style="color:var(--text-muted)">Your wishlist is empty.</p>';
  attachWishlistActions();
}

// ── RENDER SERIES ──
async function renderSeries() {
  const grid = document.getElementById('seriesGrid');
  grid.innerHTML = '<p style="color:var(--text-muted)">Loading series...</p>';
  const books = await getAllBooks();
  const seriesMap = {};

  // Build series map from owned books
  books.forEach(book => {
    if (!book.series) return;
    if (!seriesMap[book.series]) {
      seriesMap[book.series] = {
        author: book.author,
        owned: [],
        missing: [],
        upcoming: []
      };
    }
    if (book.status === 'owned') seriesMap[book.series].owned.push(book);
    if (book.status === 'missing') seriesMap[book.series].missing.push(book);
    if (book.status === 'upcoming') seriesMap[book.series].upcoming.push(book);
  });

  const names = Object.keys(seriesMap);
  if (!names.length) {
    grid.innerHTML = '<p style="color:var(--text-muted)">No series found. Import books with series data or use "+ Track New Series" above.</p>';
    return;
  }

  grid.innerHTML = names.map(name => {
    const s = seriesMap[name];
    const total = s.owned.length + s.missing.length + s.upcoming.length;
    const pct = total ? Math.round((s.owned.length / total) * 100) : 0;
    return `
      <div class="series-card" data-series="${name}">
        <div class="series-title">${name}</div>
        <div class="series-author">by ${s.author || 'Unknown'}</div>
        <div class="series-progress-bar">
          <div class="series-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="series-count">
          ✅ ${s.owned.length} owned
          ${s.missing.length ? `· ❌ ${s.missing.length} missing` : ''}
          ${s.upcoming.length ? `· 🔜 ${s.upcoming.length} upcoming` : ''}
          · ${pct}% complete
        </div>
        <div class="series-books">
          ${s.owned.map(b => miniBookCard(b, 'owned')).join('')}
          ${s.missing.map(b => miniBookCard(b, 'missing')).join('')}
          ${s.upcoming.map(b => miniBookCard(b, 'upcoming')).join('')}
        </div>
        <button class="btn-secondary series-refresh-btn" data-series="${name}" data-author="${s.author}" style="margin-top:14px;font-size:0.8rem;padding:6px 14px;">
          🔍 Find Missing Books
        </button>
      </div>`;
  }).join('');

  // Attach refresh buttons
  document.querySelectorAll('.series-refresh-btn').forEach(btn => {
    btn.addEventListener('click', () => findMissingBooks(btn.dataset.series, btn.dataset.author));
  });
}

// ── MINI BOOK CARD (inside series view) ──
function miniBookCard(book, status) {
  const cover = book.coverUrl
    ? `<img src="${book.coverUrl}" alt="${book.title}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;background:var(--bg-secondary);border-radius:6px;">🎧</div>`;

  const overlay = status === 'missing'
    ? `<div style="position:absolute;inset:0;background:rgba(44,26,14,0.6);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:var(--accent-warm);font-weight:700;">MISSING</div>`
    : status === 'upcoming'
    ? `<div style="position:absolute;inset:0;background:rgba(44,26,14,0.6);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:var(--accent-gold);font-weight:700;">UPCOMING</div>`
    : '';

  return `<div style="position:relative;width:60px;height:90px;flex-shrink:0;" title="${book.title}">
    ${cover}${overlay}
  </div>`;
}

// ── FIND MISSING BOOKS IN A SERIES ──
async function findMissingBooks(seriesName, author) {
  const btn = document.querySelector(`.series-refresh-btn[data-series="${seriesName}"]`);
  if (btn) { btn.textContent = '🔍 Searching...'; btn.disabled = true; }

  const results = await searchSeries(seriesName);
  const ownedBooks = await getBooksByStatus('owned');
  const ownedTitles = ownedBooks.map(b => b.title.toLowerCase());

  let added = 0;
  for (const book of results) {
    const isOwned = ownedTitles.some(t => t.includes(book.title.toLowerCase()) || book.title.toLowerCase().includes(t));
    if (!isOwned) {
      const isUpcoming = book.publishedDate && new Date(book.publishedDate) > new Date();
      book.status = isUpcoming ? 'upcoming' : 'missing';
      book.series = seriesName;
      book.author = author || book.author;
      const result = await upsertBook(book);
      if (result === 'added') added++;
    }
  }

  saveLog(`Series refresh: "${seriesName}" — found ${added} new missing/upcoming books`);
  if (btn) { btn.textContent = '🔍 Find Missing Books'; btn.disabled = false; }
  renderSeries();

  if (added === 0) alert(`✅ No new missing books found for "${seriesName}" — your series looks complete!`);
  else alert(`📚 Found ${added} missing/upcoming books for "${seriesName}" and added them to your series view!`);
}

// ── RENDER LOGS ──
async function renderLogs() {
  const viewer = document.getElementById('logViewer');
  const logs = await getAllLogs();
  viewer.textContent = logs.length
    ? logs.sort((a, b) => b.timestamp - a.timestamp).map(l => `[${l.date}] ${l.message}`).join('\n')
    : 'No log entries yet. Import a file to see activity here.';
}

// ── SHARE LOG ──
document.getElementById('shareLogBtn')?.addEventListener('click', async () => {
  const logs = await getAllLogs();
  const content = logs.sort((a, b) => b.timestamp - a.timestamp).map(l => `[${l.date}] ${l.message}`).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  a.download = `aurelia-echoes-log-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
});

// ── BOOK CARD HTML ──
function bookCardHTML(book, isWishlist) {
  const cover = book.coverUrl
    ? `<img class="book-cover" src="${book.coverUrl}" alt="${book.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=book-cover-placeholder>🎧</div>'">`
    : `<div class="book-cover-placeholder">🎧</div>`;

  const wishlistActions = isWishlist ? `
    <div class="wishlist-actions">
      <button class="btn-own" data-id="${book.id}" title="Mark as Purchased">✅ Purchased</button>
      <button class="btn-remove" data-id="${book.id}" title="Remove from Wishlist">🗑️ Remove</button>
    </div>` : '';

  return `
    <div class="book-card" data-id="${book.id}">
      ${cover}
      <div class="book-info">
        <div class="book-title">${book.title}</div>
        <div class="book-author">${book.author || ''}</div>
        ${book.series ? `<div class="book-series">📖 ${book.series}${book.seriesNumber ? ` #${book.seriesNumber}` : ''}</div>` : ''}
      </div>
      ${wishlistActions}
    </div>`;
}

// ── WISHLIST ACTIONS ──
function attachWishlistActions() {
  document.querySelectorAll('.btn-own').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await markBookAsOwned(btn.dataset.id);
      saveLog(`Moved to library: book ID ${btn.dataset.id}`);
      renderWishlist();
    });
  });

  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Remove this book from your wishlist?')) {
        await deleteBook(btn.dataset.id);
        saveLog(`Removed from wishlist: book ID ${btn.dataset.id}`);
        renderWishlist();
      }
    });
  });
}

// ── ADD SERIES DIALOG ──
const seriesOverlay = document.getElementById('seriesDialogOverlay');
const seriesNameInput = document.getElementById('seriesNameInput');
const seriesAuthorInput = document.getElementById('seriesAuthorInput');

document.getElementById('addSeriesBtn')?.addEventListener('click', () => {
  seriesNameInput.value = '';
  seriesAuthorInput.value = '';
  seriesOverlay.classList.remove('hidden');
  setTimeout(() => seriesNameInput.focus(), 100);
});

document.getElementById('cancelSeriesBtn')?.addEventListener('click', () => {
  seriesOverlay.classList.add('hidden');
});

document.getElementById('confirmSeriesBtn')?.addEventListener('click', () => {
  const name = seriesNameInput.value.trim();
  const author = seriesAuthorInput.value.trim();
  if (!name) {
    seriesNameInput.style.borderColor = 'var(--accent-warm)';
    return;
  }
  seriesOverlay.classList.add('hidden');
  findMissingBooks(name, author);
});

// Close dialog if clicking outside it
seriesOverlay?.addEventListener('click', (e) => {
  if (e.target === seriesOverlay) seriesOverlay.classList.add('hidden');
});

// Allow pressing Enter to confirm
seriesAuthorInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('confirmSeriesBtn').click();
});

// ── SEARCH BAR ──
document.getElementById('searchBar')?.addEventListener('input', async (e) => {
  const q = e.target.value.toLowerCase();
  const books = await getAllBooks();
  const filtered = books.filter(b =>
    (b.title || '').toLowerCase().includes(q) ||
    (b.author || '').toLowerCase().includes(q) ||
    (b.series || '').toLowerCase().includes(q)
  );
  document.getElementById('libraryGrid').innerHTML = filtered.length
    ? filtered.filter(b => b.status === 'owned').map(b => bookCardHTML(b, false)).join('')
    : '<p style="color:var(--text-muted)">No results found.</p>';
});

// ── SERVICE WORKER ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/aureliaechoes/sw.js')
    .then(() => console.log('✅ Service Worker registered'));
}

// ── INITIALIZE ──
document.addEventListener('DOMContentLoaded', async () => {
  await openLocalDB();
  pruneOldLogs();
  renderLibrary();
  console.log('🎧 Aurelia Echoes Phase 2 running!');
});
