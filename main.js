// ======================
// 🚀 IMPORTS & SETUP
// ======================
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { getDb } = require('./database');

// Lazy proxy — getDb() only called after app is ready
const db = new Proxy({}, {
  get(_, prop) {
    return getDb()[prop];
  }
});

ipcMain.handle("get-dashboard-stats", () => {
  const today = new Date().toISOString().slice(0, 10);

  const rows = db.prepare(`
    SELECT total, payment_mode, staff, date
    FROM visits
  `).all();

  let todayTotal = 0;
  let weekTotal = 0;
  let monthTotal = 0;

  let upi = 0;
  let cash = 0;

  const staffStats = {};

  const now = new Date();

  rows.forEach(r => {
    const visitDate = new Date(r.date);
    const visitDay = visitDate.toISOString().slice(0, 10);

    // TODAY
    if (visitDay === today) {
      todayTotal += r.total;

      if (r.payment_mode === "UPI") upi += r.total;
      if (r.payment_mode === "Cash") cash += r.total;

      const staff = r.staff || "Unknown";
      if (!staffStats[staff]) staffStats[staff] = 0;
      staffStats[staff] += r.total;
    }

    // WEEK
    const diffDays = (now - visitDate) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) {
      weekTotal += r.total;
    }

    // MONTH
    if (
      visitDate.getMonth() === now.getMonth() &&
      visitDate.getFullYear() === now.getFullYear()
    ) {
      monthTotal += r.total;
    }
  });

  return {
    today: todayTotal,
    week: weekTotal,
    month: monthTotal,
    upi,
    cash,
    staffStats
  };
});
// ======================
// 🖥 WINDOW CREATION
// ======================
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
});


// ======================
// 👤 CUSTOMER MANAGEMENT
// ======================

// 🔍 Find customer by phone
ipcMain.handle('find-customer', (event, phone) => {
  return db.prepare(`
    SELECT * FROM customers WHERE phone = ?
  `).get(phone);
});

// 💾 Save new customer (ignore if already exists)
ipcMain.handle('save-customer', (event, { name, phone }) => {
  return db.prepare(`
    INSERT OR IGNORE INTO customers (name, phone)
    VALUES (?, ?)
  `).run(name, phone);
});


// ======================
// 💇 VISITS MANAGEMENT
// ======================

// 💾 Save visit entry
ipcMain.handle('save-visit', (event, { phone, services, total, paymentMode, staff }) => {
  let customer = db.prepare(`
    SELECT * FROM customers WHERE phone = ?
  `).get(phone);

  if (!customer) {
    return { success: false, message: "Customer not found" };
  }

  db.prepare(`
  INSERT INTO visits (customer_id, services, total, payment_mode, staff, date)
VALUES (?, ?, ?, ?, ?, ?)
`).run(
   customer.id,
  services.join(','),
  total,
  paymentMode,
  staff,
  new Date().toISOString()
);

  console.log("Saving visit:", phone, services, total);

  return { success: true };
});

// 🔁 Get last visit for repeat feature
ipcMain.handle('get-last-visit', (event, phone) => {
  const customer = db.prepare(`
    SELECT * FROM customers WHERE phone = ?
  `).get(phone);

  if (!customer) return null;

  const visit = db.prepare(`
    SELECT * FROM visits
    WHERE customer_id = ?
    ORDER BY date DESC
    LIMIT 1
  `).get(customer.id);

  return visit || null;
});


// ======================
// 📊 INCOME DASHBOARD
// ======================
ipcMain.handle('get-income', () => {
  const today = db.prepare(`
    SELECT SUM(total) as total FROM visits
    WHERE date(date, 'localtime') = date('now', 'localtime')
  `).get();

  const week = db.prepare(`
    SELECT SUM(total) as total FROM visits
    WHERE date(date, 'localtime') >= date('now', '-7 days', 'localtime')
  `).get();

  const month = db.prepare(`
    SELECT SUM(total) as total FROM visits
    WHERE strftime('%Y-%m', date, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
  `).get();

  return {
    today: today.total || 0,
    week: week.total || 0,
    month: month.total || 0
  };
});


// ======================
// 👥 CUSTOMER FILTERS
// ======================
ipcMain.handle('get-customers', (event, filter) => {

  // 🟢 Customers visited today
  if (filter === "today") {
    return db.prepare(`
      SELECT c.*, COUNT(v.id) as visit_count
      FROM customers c
      JOIN visits v ON c.id = v.customer_id
      WHERE date(v.date, 'localtime') = date('now', 'localtime')
      GROUP BY c.id
    `).all();
  }

  // 🟡 Customers visited this week
  if (filter === "week") {
    return db.prepare(`
      SELECT c.*, COUNT(v.id) as visit_count
      FROM customers c
      JOIN visits v ON c.id = v.customer_id
      WHERE date(v.date, 'localtime') >= date('now', '-7 days', 'localtime')
      GROUP BY c.id
    `).all();
  }

  // 🔴 Inactive customers (no visit in 60 days)
  if (filter === "inactive") {
    return db.prepare(`
      SELECT c.*, MAX(v.date) as last_visit, COUNT(v.id) as visit_count
      FROM customers c
      LEFT JOIN visits v ON c.id = v.customer_id
      GROUP BY c.id
      HAVING last_visit IS NULL 
         OR date(last_visit, 'localtime') <= date('now', '-60 days', 'localtime')
    `).all();
  }

  // ⚪ All customers
  return db.prepare(`
    SELECT c.*, COUNT(v.id) as visit_count
    FROM customers c
    LEFT JOIN visits v ON c.id = v.customer_id
    GROUP BY c.id
  `).all();
});


// ======================
// 📜 HISTORY & FILTERING
// ======================

// 📜 Full visit history for a customer
ipcMain.handle('get-visit-history', (event, phone) => {
  const customer = db.prepare(`
    SELECT * FROM customers WHERE phone = ?
  `).get(phone);

  if (!customer) return [];

  return db.prepare(`
    SELECT 
  services, 
  total, 
  payment_mode AS paymentMode, 
  staff, 
  date
    FROM visits
    WHERE customer_id = ?
    ORDER BY date DESC
  `).all(customer.id);
});

// 📅 Filter visits by date range for a specific customer
ipcMain.handle('filter-by-date', (event, { from, to, phone }) => {
  return db.prepare(`
    SELECT c.name, c.phone, v.services, v.total, v.date
    FROM visits v
    JOIN customers c ON v.customer_id = c.id
    WHERE date(v.date, 'localtime') 
      BETWEEN date(?, 'localtime') AND date(?, 'localtime')
      AND c.phone = ?
    ORDER BY v.date DESC
  `).all(from, to, phone);
});


// ======================
// 📦 BACKUP & DATA MANAGEMENT
// ======================

// 💾 Backup database
ipcMain.handle('backup-data', async () => {
  const result = await dialog.showSaveDialog({
    title: "Save Backup",
    defaultPath: "salon-backup.db"
  });

  if (result.canceled) return { success: false };

  try {
    const dbPath = path.join(app.getPath('userData'), 'salon.db');
    fs.copyFileSync(dbPath, result.filePath);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ♻️ Restore database
ipcMain.handle('restore-data', async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Backup File",
    properties: ['openFile'],
    filters: [{ name: 'Database Files', extensions: ['db'] }]
  });

  if (result.canceled) return { success: false };

  try {
    const dbPath = path.join(app.getPath('userData'), 'salon.db');
    fs.copyFileSync(result.filePaths[0], dbPath);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 🧹 Clear all data
ipcMain.handle('clear-data', () => {
  db.prepare('DELETE FROM visits').run();
  db.prepare('DELETE FROM customers').run();
  return { success: true };
});


// ======================
// 📤 EXPORTS
// ======================

// 📄 Export all visits
ipcMain.handle('export-visits', async () => {
  const result = await dialog.showSaveDialog({
    title: "Export Visits",
    defaultPath: "visits-data.csv"
  });

  if (result.canceled) return { success: false };

  try {
    const visits = db.prepare(`
      SELECT c.name, c.phone, v.services, v.total, v.payment_mode AS paymentMode, v.staff, v.date
      FROM visits v
      JOIN customers c ON v.customer_id = c.id
      ORDER BY v.date DESC
    `).all();

    let csv = "Name,Phone,Services,Total,Payment Mode,Staff,Date\n";

    visits.forEach(v => {
      const date = new Date(v.date).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata',
  dateStyle: 'medium',
  timeStyle: 'short'
})
      csv += `"${v.name}","${v.phone}","${v.services}",${v.total},"${v.paymentMode || "N/A"}","${v.staff}","${date}"\n`;
    });

    fs.writeFileSync(result.filePath, csv);

    return { success: true };

  } catch (err) {
    return { success: false, error: err.message };
  }
});


// 📊 Export filtered report with total
ipcMain.handle("export-report", async (event, { from, to }) => {
  const result = await dialog.showSaveDialog({
    title: "Save Report",
    defaultPath: "report.csv"
  });

  if (result.canceled) return;

  const rows = db.prepare(`
    SELECT c.name, c.phone, v.services, v.total, v.payment_mode AS paymentMode, v.staff, v.date
    FROM visits v
    JOIN customers c ON v.customer_id = c.id
    WHERE date(v.date) BETWEEN date(?) AND date(?)
  `).all(from, to);

  let csv = "Name,Phone,Services,Total,Payment Mode,Staff,Date\n";

  let upiTotal = 0;
  let cashTotal = 0;
  const staffStats = {};

  rows.forEach((r, index) => {
    const date = new Date(r.date).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata',
  dateStyle: 'medium',
  timeStyle: 'short'
})

    csv += `"${r.name}","${r.phone}","${r.services}",${r.total},"${r.paymentMode || "N/A"}","${r.staff || "N/A"}","${date}"\n`;

    // 💰 Payment aggregation
    if (r.paymentMode === "UPI") upiTotal += r.total;
    if (r.paymentMode === "Cash") cashTotal += r.total;

    // ✂️ Staff aggregation
    const staff = r.staff || "Unknown";
    if (!staffStats[staff]) staffStats[staff] = 0;
    staffStats[staff] += r.total;
  });

  // Excel total formula (Total column = D)
  const lastRow = rows.length + 1;
  csv += `\n,,Total,=SUM(D2:D${lastRow}),,,`;

  // 🔥 Add insights
  csv += `\n\n--- PAYMENT SUMMARY ---\n`;
  csv += `UPI Total,${upiTotal}\n`;
  csv += `Cash Total,${cashTotal}\n`;

  csv += `\n--- STAFF PERFORMANCE ---\n`;
  Object.entries(staffStats).forEach(([staff, total]) => {
    csv += `${staff},${total}\n`;
  });

  fs.writeFileSync(result.filePath, csv);

  return { success: true };
});

// ======================
// 💇 SERVICE MANAGEMENT
// ======================

// 📋 Get all services
ipcMain.handle('get-services', () => {
  return db.prepare(`SELECT * FROM services`).all();
});

// ➕ Add service
ipcMain.handle('add-service', (event, { name, price }) => {
  return db.prepare(`
    INSERT INTO services (name, price)
    VALUES (?, ?)
  `).run(name, price);
});

// ❌ Delete service
ipcMain.handle('delete-service', (event, id) => {
  return db.prepare(`
    DELETE FROM services WHERE id = ?
  `).run(id);
});

// ✏️ Update service price
ipcMain.handle('update-service', (event, { id, price }) => {
  return db.prepare(`
    UPDATE services SET price = ? WHERE id = ?
  `).run(price, id);
});


// ======================
// 🏆 ANALYTICS
// ======================

// 🥇 Top 5 customers by visits
ipcMain.handle('top-customers', () => {
  return db.prepare(`
    SELECT c.name, COUNT(v.id) as visits
    FROM customers c
    JOIN visits v ON c.id = v.customer_id
    GROUP BY c.id
    ORDER BY visits DESC
    LIMIT 5
  `).all();
});

// ======================
// 🆕 SERVICES BY GENDER (new — for Men/Women billing UI)
// ======================
ipcMain.handle('get-services-by-gender', (event, gender) => {
  return db.prepare(`
    SELECT * FROM services WHERE gender = ? ORDER BY category, name
  `).all(gender);
});
