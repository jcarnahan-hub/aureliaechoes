// ── AURELIA ECHOES: Backup & Restore System ──

const LAST_BACKUP_KEY = 'ae-last-backup';

// ── OPEN / CLOSE MODAL ──
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('backupOverlay');

  document.getElementById('openBackupBtn')?.addEventListener('click', () => {
    updateLastBackupLabel();
    overlay.style.display = 'flex';
    overlay.classList.remove('hidden');
  });

  document.getElementById('closeBackupBtn')?.addEventListener('click', () => {
    overlay.style.display = 'none';
    overlay.classList.add('hidden');
  });

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
      overlay.classList.add('hidden');
    }
  });

  // ── EXPORT BUTTON ──
  document.getElementById('exportBackupBtn')?.addEventListener('click', exportBackup);

  // ── RESTORE FILE PICKER ──
  const restoreInput = document.getElementById('restoreFileInput');
  const restoreLabel = document.querySelector('label[for="restoreFileInput"]');
  restoreInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && restoreLabel) {
      restoreLabel.textContent = `📂 ${file.name}`;
    }
  });

  // ── RESTORE BUTTON ──
  document.getElementById('runRestoreBtn')?.addEventListener('click', restoreBackup);
});

// ── UPDATE LAST BACKUP LABEL ──
function updateLastBackupLabel() {
  const label = document.getElementById('lastBackupLabel');
  const last = localStorage.getItem(LAST_BACKUP_KEY);
  if (label) {
    label.textContent = last
      ? `Last backup: ${new Date(last).toLocaleString()}`
      : 'Last backup: Never';
  }
}

// ── EXPORT BACKUP ──
async function exportBackup() {
  try {
    showToast('Preparing your backup...', 'info');

    const books = await getAllBooks();
    const logs = await getAllLogs();
    const theme = localStorage.getItem('ae-theme') || 'light';

    const backup = {
      version: '1.0',
      appName: 'AureliaEchoes',
      exportDate: new Date().toISOString(),
      totalBooks: books.length,
      data: {
        books,
        logs,
        settings: { theme }
      }
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const today = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `AureliaEchoes_Backup_${today}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const now = new Date().toISOString();
    localStorage.setItem(LAST_BACKUP_KEY, now);
    updateLastBackupLabel();

    saveLog(`Backup exported: ${books.length} books saved to file`);
    showToast(`Backup complete! ${books.length} books exported.`, 'success');

  } catch (err) {
    showToast('Backup failed. Please try again.', 'error');
    saveLog(`BACKUP ERROR: ${err.message}`);
  }
}

// ── RESTORE BACKUP ──
async function restoreBackup() {
  const fileInput = document.getElementById('restoreFileInput');
  const resultBox = document.getElementById('restoreResult');

  if (!fileInput.files[0]) {
    showToast('Please choose a backup file first.', 'warning');
    return;
  }

  try {
    showToast('Reading backup file...', 'info');
    const text = await fileInput.files[0].text();
    const backup = JSON.parse(text);

    if (!backup.appName || backup.appName !== 'AureliaEchoes') {
      showToast('This does not appear to be an Aurelia Echoes backup file.', 'error');
      return;
    }

    if (!backup.data || !backup.data.books) {
      showToast('Backup file appears to be empty or corrupted.', 'error');
      return;
    }

    const books = backup.data.books || [];
    showToast(`Processing ${books.length} books...`, 'info');

    let added = 0;
    let skipped = 0;

    for (const book of books) {
      try {
        const existing = await getBookById(book.id);
        if (existing) {
          skipped++;
        } else {
          await upsertBook(book);
          added++;
        }
      } catch (e) {
        skipped++;
      }
    }

    if (backup.data.logs && backup.data.logs.length > 0) {
      for (const log of backup.data.logs) {
        try { saveLog(`[RESTORED] ${log.message}`); } catch (e) { /* skip */ }
      }
    }

    if (backup.data.settings?.theme) {
      if (typeof applyTheme === 'function') {
        applyTheme(backup.data.settings.theme);
      }
    }

    const resultMsg = `✅ ${added} books added · ⏭️ ${skipped} skipped (already exist)`;
    saveLog(`Backup restored: ${resultMsg} from ${backup.exportDate}`);

    if (resultBox) {
      resultBox.textContent = resultMsg;
      resultBox.classList.remove('hidden');
    }

    showToast(`Restore complete! ${added} books added.`, 'success');

    if (typeof renderLibrary === 'function') renderLibrary();
    if (typeof renderSeries === 'function') renderSeries();

  } catch (err) {
    showToast('Restore failed. Is this a valid backup file?', 'error');
    saveLog(`RESTORE ERROR: ${err.message}`);
  }
}
