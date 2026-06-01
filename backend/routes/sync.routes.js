const express = require('express');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/queue', authenticateToken, async (req, res) => {
  try {
    const pending = await getAll("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100");
    const failed = await getAll("SELECT * FROM sync_queue WHERE status = 'failed' ORDER BY created_at ASC LIMIT 50");
    res.json({ pending, failed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', authenticateToken, async (req, res) => {
  try {
    const pending = await getOne("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'");
    const failed = await getOne("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed'");
    const synced = await getOne("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'synced'");
    res.json({
      pending: pending.count,
      failed: failed.count,
      synced: synced.count,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/enqueue', authenticateToken, async (req, res) => {
  try {
    const { table_name, record_id, action, data } = req.body;
    const syncId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await runQuery(
      'INSERT INTO sync_queue (id, table_name, record_id, action, data, status) VALUES (?, ?, ?, ?, ?, ?)',
      [syncId, table_name, record_id, action, JSON.stringify(data), 'pending']
    );

    res.status(201).json({ message: 'Sync queued', syncId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/process', authenticateToken, async (req, res) => {
  try {
    const pending = await getAll("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50");

    const results = [];
    for (const item of pending) {
      try {
        await runQuery("UPDATE sync_queue SET status = 'synced' WHERE id = ?", [item.id]);
        results.push({ id: item.id, status: 'synced' });
      } catch (error) {
        await runQuery(
          "UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1, error = ? WHERE id = ?",
          [error.message, item.id]
        );
        results.push({ id: item.id, status: 'failed', error: error.message });
      }
    }

    res.json({ processed: results.length, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/retry-failed', authenticateToken, async (req, res) => {
  try {
    await runQuery("UPDATE sync_queue SET status = 'pending', error = NULL WHERE status = 'failed' AND retry_count < 5");
    res.json({ message: 'Failed syncs queued for retry' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
