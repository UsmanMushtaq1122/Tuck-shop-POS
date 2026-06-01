const express = require('express');
const fs = require('fs');
const path = require('path');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();
const BACKUP_DIR = path.join(__dirname, '../../backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const backups = await getAll('SELECT * FROM backups ORDER BY created_at DESC');
    res.json({ backups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/create', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.db`);
    const dbPath = path.join(__dirname, '../../local-db/pos.db');

    fs.copyFileSync(dbPath, backupFile);
    const stats = fs.statSync(backupFile);

    const backupId = `backup-${Date.now()}`;
    await runQuery(
      'INSERT INTO backups (id, type, file_path, size, status) VALUES (?, ?, ?, ?, ?)',
      [backupId, 'manual', backupFile, stats.size, 'completed']
    );

    res.json({ message: 'Backup created', id: backupId, size: stats.size });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/auto', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const existingBackup = await getOne("SELECT * FROM backups WHERE type = 'auto' AND date(created_at) = ?", [today]);

    if (existingBackup) {
      return res.json({ message: 'Auto backup already created today' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `auto-backup-${timestamp}.db`);
    const dbPath = path.join(__dirname, '../../local-db/pos.db');

    fs.copyFileSync(dbPath, backupFile);
    const stats = fs.statSync(backupFile);

    const backupId = `backup-auto-${Date.now()}`;
    await runQuery(
      'INSERT INTO backups (id, type, file_path, size, status) VALUES (?, ?, ?, ?, ?)',
      [backupId, 'auto', backupFile, stats.size, 'completed']
    );

    res.json({ message: 'Auto backup created', id: backupId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const backup = await getOne('SELECT * FROM backups WHERE id = ?', [req.params.id]);
    if (backup && fs.existsSync(backup.file_path)) {
      fs.unlinkSync(backup.file_path);
    }
    await runQuery('DELETE FROM backups WHERE id = ?', [req.params.id]);
    res.json({ message: 'Backup deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/restore/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const backup = await getOne('SELECT * FROM backups WHERE id = ?', [req.params.id]);
    if (!backup || !fs.existsSync(backup.file_path)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    const dbPath = path.join(__dirname, '../../local-db/pos.db');
    fs.copyFileSync(backup.file_path, dbPath);

    res.json({ message: 'Database restored from backup' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
