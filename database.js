const Database = require('better-sqlite3');

// Create or open database file
const { app } = require("electron");
const path = require("path");


// get safe path
const dbPath = path.join(app.getPath("userData"), "salon.db");

const db = new Database(dbPath);

// Create tables if not exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT UNIQUE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    services TEXT,
    total INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    price INTEGER
  )
`).run();

db.prepare(`
  INSERT OR IGNORE INTO services (name, price)
  VALUES 
    ('Haircut', 150),
    ('Beard', 50)
`).run();

module.exports = db;