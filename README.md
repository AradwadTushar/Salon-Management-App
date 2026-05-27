# 💈 IronStar POS
### Modern Salon Billing & CRM Desktop Application

> A fast, keyboard-first Point of Sale system built for real salon environments — not just demos.

---

## 🖼️ Preview

### Billing Screen
![Front Page](/screenshots/Billing_Screen.png)

### Admin Panel
![Admin Dashboard](/screenshots/Admin_Panel.png)
![Service Management](/screenshots/Sevice_Management.png)
![CRM & Offers](/screenshots/CRM&Offers.png)
![Data Control](/screenshots/Data&Reports.png)

---

## 🚀 Overview

IronStar POS started as a freelance billing solution for a working salon and evolved into a full-featured **desktop POS + CRM system**. Built with speed and simplicity at its core — every interaction is optimized for daily, high-volume use.

- ⚡ Minimal clicks, maximum speed
- ⌨️ Keyboard-first workflow — designed for real operators
- 🎨 Premium UI with dark/light mode and accent themes
- 🧠 Smart customer intelligence built in

---

## ✨ Features

### 💳 Smart Billing System
- Fast cart-based billing with real-time total updates
- Gender & category-based service filtering
- Repeat last visit in one click
- Keyboard shortcuts for rapid billing
- Auto total calculation with UPI / Cash split

### 👥 Customer Management (CRM)
- Customer autocomplete via phone number lookup
- Full visit history per customer
- VIP / inactive customer segmentation
- CRM search and filtering tools

### 📊 Analytics Dashboard
- Revenue tracking — Today / Week / Month
- UPI vs Cash payment breakdown (visual chart)
- Staff performance leaderboard
- Real-time business insights at a glance

### 💬 WhatsApp Integration
- Instant bill summary sent to customer
- Bulk promotional messaging
- Auto-generated formatted receipts:

  ```
  Hey [Customer Name], thanks for visiting 💈

  Services: Haircut, Beard Trim
  Total: ₹300
  Date: 27 April 2026

  We hope to see you again! ✨
  ```

### 🎨 Premium POS UI
- Dark & light mode toggle
- Multiple accent color themes
- Smooth animations and transitions
- Clean layout optimized for counter-top use

### 🛠️ Admin Tools
- Add, edit, and delete services
- Gender & category-based service organization
- CSV report exports
- Full database backup & restore
- Clear / reset data controls

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Select highlighted service |
| `Ctrl + S` | Save visit / generate bill |
| `Ctrl + H` | View customer history |
| `Ctrl + Backspace` | Clear cart |
| `Arrow Keys` | Navigate service list |

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Runtime | Electron.js |
| Backend Logic | Node.js |
| Database | SQLite (better-sqlite3) |
| Frontend | HTML, CSS, Vanilla JavaScript |
| Charts | Chart.js |

---

## 📦 Installation

```bash
git clone https://github.com/AradwadTushar/Salon-Management-App
cd ironstar-pos
npm install
npm start
```

---

## 📁 Project Structure

```
├── main.js          # Electron main process
├── renderer.js      # UI logic & event handling
├── index.html       # App layout & structure
├── style.css        # Theming & styling
├── database.js      # SQLite setup & queries
├── seed.js          # Stores Services
└── README.md
```

---

## 🚀 Roadmap

- [ ] Cloud sync & online backups
- [ ] PDF invoice generation
- [ ] Payment gateway (UPI / Card)
- [ ] Multi-device support
- [ ] Role-based staff accounts
- [ ] Appointment booking system
- [ ] Advanced analytics (peak hours, trends)

---

## 💡 Why I Built This

This project started as a real-world freelance solution for a local salon that needed something fast and reliable — no bloat, no complexity. Over time it grew into a full desktop POS system with CRM features, analytics, and a UI that actually feels good to use every day.

It's a real business tool. Built, tested, and improved in a real salon environment.

---

## 👨‍💻 Author

**Tushar Aradwad**

---

*Built for the grind. Designed for the counter.*