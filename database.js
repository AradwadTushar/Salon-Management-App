const Database = require('better-sqlite3');
const { app }  = require('electron');
const path     = require('path');

let db;

function getDb() {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'salon.db');
  db = new Database(dbPath);

  // ── TABLES ──────────────────────────────────────────────
  db.prepare(`
    CREATE TABLE IF NOT EXISTS customers (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT,
      phone TEXT UNIQUE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS visits (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      services    TEXT,
      total       INTEGER,
      payment_mode TEXT,
      staff       TEXT,
      date        DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Safe migrations for existing installs
  try { db.prepare(`ALTER TABLE visits ADD COLUMN payment_mode TEXT`).run(); } catch(e) {}
  try { db.prepare(`ALTER TABLE visits ADD COLUMN staff TEXT`).run(); } catch(e) {}

  db.prepare(`
    CREATE TABLE IF NOT EXISTS services (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT UNIQUE,
      price    INTEGER,
      gender   TEXT DEFAULT 'men',
      category TEXT DEFAULT 'General'
    )
  `).run();

  try { db.prepare(`ALTER TABLE services ADD COLUMN gender TEXT DEFAULT 'men'`).run(); } catch(e) {}
  try { db.prepare(`ALTER TABLE services ADD COLUMN category TEXT DEFAULT 'General'`).run(); } catch(e) {}

  return db;
}

module.exports = { getDb };
