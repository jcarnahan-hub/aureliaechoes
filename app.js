// ── FIND MISSING BOOKS ──
async function findMissingBooks(seriesName, author) {
  const btn = document.querySelector(`.series-refresh-btn[data-series="${seriesName}"]`);
  if (btn) { btn.textContent = '🔍 Searching...'; btn.disabled = true; }
  showToast(`Searching for missing books in "${seriesName}"...`, 'info');

  const results = await searchSeries(seriesName);
  const ownedBooks = await getBooksByStatus('owned');
  const ownedTitles = ownedBooks.map(b => b.title.toLowerCase());

  let added = 0;
  for (const book of results) {
    const isOwned = ownedTitles.some(t =>
      t.includes(book.title.toLowerCase()) ||
      book.title.toLowerCase().includes(t)
    );
    if (!isOwned) {
      const isUpcoming = book.publishedDate &&
        new Date(book.publishedDate) > new Date();
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

  // ── STYLED TOAST INSTEAD OF ALERT ──
  if (added === 0) {
    showToast(`"${seriesName}" looks complete — no new books found!`, 'success');
  } else {
    showToast(`Found ${added} missing/upcoming books for "${seriesName}"!`, 'success');
  }
}
