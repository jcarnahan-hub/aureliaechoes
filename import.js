// ── AURELIA ECHOES: Import Manager ──

let importFileData = null;

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileImport');
  const runBtn = document.getElementById('runImportBtn');
  if (fileInput) fileInput.addEventListener('change', (e) => { importFileData = e.target.files[0]; });
  if (runBtn) runBtn.addEventListener('click', runImport);
});

async function runImport() {
  if (!importFileData) { alert('Please choose a CSV or JSON file first.'); return; }

  const text = await importFileData.text();
  let books = [];

  try {
    books = importFileData.name.endsWith('.json') ? JSON.parse(text) : parseCSV(text);
  } catch (err) {
    alert('❌ Could not read this file. Please check the format and try again.');
    saveLog(`IMPORT ERROR: Could not parse file — ${err.message}`);
    return;
  }

  const { valid, errors } = validateBooks(books);

  if (errors.length > 0) {
    const proceed = confirm(
      `⚠️ Found ${errors.length} issue(s):\n\n` +
      errors.slice(0, 5).join('\n') +
      (errors.length > 5 ? `\n...and ${errors.length - 5} more.` : '') +
      `\n\nProceed with ${valid.length} valid entries?`
    );
    if (!proceed) return;
  }

  let added = 0, updated = 0, skipped = 0;
  for (const book of valid) {
    try {
      const result = await upsertBook(book);
      if (result === 'added') added++;
      else updated++;
    } catch (e) {
      skipped++;
      saveLog(`SKIP: "${book.title}" — ${e.message}`);
    }
  }

  const summary = `Import complete — Added: ${added}, Updated: ${updated}, Skipped: ${skipped + (books.length - valid.length)}`;
  saveLog(summary);

  document.getElementById('summaryText').textContent =
    `✅ Added ${added} · 🔄 Updated ${updated} · ⏭️ Skipped ${skipped + (books.length - valid.length)}`;
  document.getElementById('importSummary').classList.remove('hidden');
  if (typeof renderLibrary === 'function') renderLibrary();
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const book = {};
    headers.forEach((h, i) => { book[h] = values[i] || ''; });
    return book;
  });
}

function validateBooks(books) {
  const valid = [], errors = [];
  books.forEach((book, idx) => {
    const row = idx + 2;
    if (!book.title && !book.Title) { errors.push(`Row ${row}: Missing title`); return; }
    const normalized = {
      title: book.title || book.Title || '',
      author: book.author || book.Author || 'Unknown Author',
      series: book.series || book.Series || '',
      seriesNumber: book.seriesnumber || book['series number'] || '',
      status: (book.status || book.Status || 'owned').toLowerCase(),
      coverUrl: book.coverurl || book.cover || '',
      asin: book.asin || book.ASIN || ''
    };
    if (normalized.seriesNumber && isNaN(parseFloat(normalized.seriesNumber))) {
      errors.push(`Row ${row}: Series number "${normalized.seriesNumber}" is not valid`);
    }
    valid.push(normalized);
  });
  return { valid, errors };
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('closeSummaryBtn')?.addEventListener('click', () => {
    document.getElementById('importSummary').classList.add('hidden');
  });
});
