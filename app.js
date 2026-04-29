// ── RENDER SERIES ──
async function renderSeries() {
  const grid = document.getElementById('seriesGrid');
  grid.innerHTML = '<p style="color:var(--text-muted)">Loading series...</p>';
  const books = await getAllBooks();
  const seriesMap = {};

  books.forEach(book => {
    // Skip books with no series or clearly bad series names
    if (!book.series) return;
    const seriesName = book.series.trim();
    if (!seriesName) return;
    if (seriesName.toLowerCase().startsWith('book ')) return;
    if (/^book\s*\d+$/i.test(seriesName)) return;

    if (!seriesMap[seriesName]) {
      seriesMap[seriesName] = {
        author: '',
        owned: [],
        missing: [],
        upcoming: []
      };
    }

    // Set author — prefer non-empty, non-Unknown value
    if (book.author && book.author !== 'Unknown Author') {
      seriesMap[seriesName].author = book.author;
    }

    if (book.status === 'owned') seriesMap[seriesName].owned.push(book);
    else if (book.status === 'missing') seriesMap[seriesName].missing.push(book);
    else if (book.status === 'upcoming') seriesMap[seriesName].upcoming.push(book);
  });

  // Sort series alphabetically
  const names = Object.keys(seriesMap).sort((a, b) => a.localeCompare(b));

  if (!names.length) {
    grid.innerHTML = '<p style="color:var(--text-muted)">No series found. Import books with series data or use "+ Track New Series".</p>';
    return;
  }

  grid.innerHTML = names.map(name => {
    const s = seriesMap[name];
    const total = s.owned.length + s.missing.length + s.upcoming.length;
    const pct = total ? Math.round((s.owned.length / total) * 100) : 0;
    const authorDisplay = s.author || 'Unknown Author';

    // Sort books by series number within each group
    const sortByNum = arr => arr.sort((a, b) => {
      const na = parseFloat(a.seriesNumber) || 0;
      const nb = parseFloat(b.seriesNumber) || 0;
      return na - nb;
    });

    return `
      <div class="series-card" data-series="${name}">
        <div class="series-title">${name}</div>
        <div class="series-author">by ${authorDisplay}</div>
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
          ${sortByNum(s.owned).map(b => miniBookCard(b, 'owned')).join('')}
          ${sortByNum(s.missing).map(b => miniBookCard(b, 'missing')).join('')}
          ${sortByNum(s.upcoming).map(b => miniBookCard(b, 'upcoming')).join('')}
        </div>
        <button class="btn-secondary series-refresh-btn"
          data-series="${name}" data-author="${authorDisplay}"
          style="margin-top:14px;font-size:0.8rem;padding:6px 14px;">
          🔍 Find Missing Books
        </button>
      </div>`;
  }).join('');

  document.querySelectorAll('.series-refresh-btn').forEach(btn => {
    btn.addEventListener('click', () =>
      findMissingBooks(btn.dataset.series, btn.dataset.author));
  });
}
