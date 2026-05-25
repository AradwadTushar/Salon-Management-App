/**
 * IronStar Salon — Rate Card Seed Script
 * 
 * Run ONCE after first setup:
 *   Option A (recommended): $env:ELECTRON_RUN_AS_NODE=1; npx electron seed.js
 *   Option B:               node seed.js  (if npm rebuild better-sqlite3 done first)
 * 
 * Safe to re-run — uses INSERT OR IGNORE so nothing is overwritten.
 */

const path = require('path');
const os   = require('os');
const fs   = require('fs');

// ── Find the DB path ─────────────────────────────────────────
function getDbPath() {
  const platform = process.platform;
  // Electron stores userData here by default (app name = package.json "name")
  // Electron uses productName if set, else name
  const pkg = require('./package.json');
  const appName = pkg.build?.productName || pkg.name || 'salon_app';
  if (platform === 'win32')
    return path.join(process.env.APPDATA, appName, 'salon.db');
  if (platform === 'darwin')
    return path.join(os.homedir(), 'Library', 'Application Support', appName, 'salon.db');
  return path.join(os.homedir(), '.config', appName, 'salon.db');
}

// Check local path first (for when Electron ran at least once and DB is there)
const localPath = path.join(__dirname, 'salon.db');
const dbPath    = fs.existsSync(localPath) ? localPath : getDbPath();

console.log('\n📂 Using DB at:', dbPath);

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('\n❌ Could not load better-sqlite3.');
  console.error('Run: $env:ELECTRON_RUN_AS_NODE=1; npx electron seed.js\n');
  process.exit(1);
}

const db = new Database(dbPath);

// ── Ensure tables + columns exist ────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS services (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT UNIQUE,
  price    INTEGER,
  gender   TEXT DEFAULT 'men',
  category TEXT DEFAULT 'General'
)`).run();

try { db.prepare(`ALTER TABLE services ADD COLUMN gender TEXT DEFAULT 'men'`).run(); } catch(e) {}
try { db.prepare(`ALTER TABLE services ADD COLUMN category TEXT DEFAULT 'General'`).run(); } catch(e) {}

const insert = db.prepare(
  `INSERT OR IGNORE INTO services (name, price, gender, category) VALUES (?, ?, ?, ?)`
);

// ── All services from IronStar rate card ─────────────────────
const services = [
  // ═══ MEN — HAIRCUT ═══════════════════════════════════════
  ['[M] Stylist Haircut',                        200,  'men', 'Haircut'],
  ['[M] Senior Stylist Haircut',                 250,  'men', 'Haircut'],

  // ═══ MEN — STYLING ═══════════════════════════════════════
  ['[M] Wash & Plain Dry',                       150,  'men', 'Styling'],
  ['[M] Premium Hair Wash',                      200,  'men', 'Styling'],
  ['[M] Hair Styling',                            80,  'men', 'Styling'],

  // ═══ MEN — GROOMING ══════════════════════════════════════
  ['[M] Classic Shave',                          150,  'men', 'Grooming'],
  ['[M] Beard Trim',                             150,  'men', 'Grooming'],
  ['[M] Head Shave',                             230,  'men', 'Grooming'],

  // ═══ MEN — HAIR COLOR ════════════════════════════════════
  ['[M] Pre-lightening Per Foil',                150,  'men', 'Hair Color'],
  ['[M] Pre-lightening Global',                 1300,  'men', 'Hair Color'],
  ['[M] Global Hair Coloring',                   750,  'men', 'Hair Color'],
  ['[M] Beard Color',                            350,  'men', 'Hair Color'],
  ['[M] Beard Tint',                             100,  'men', 'Hair Color'],
  ['[M] Natural Global Hair Color',              850,  'men', 'Hair Color'],

  // ═══ MEN — HAIR TEXTURE ══════════════════════════════════
  ['[M] Straightening / Smoothening',           2400,  'men', 'Hair Texture'],
  ['[M] Cysteine Kera-Smooth',                  3200,  'men', 'Hair Texture'],
  ['[M] Collagen Treatment (Botox)',            3200,  'men', 'Hair Texture'],
  ['[M] QOD Treatment',                         4000,  'men', 'Hair Texture'],

  // ═══ MEN — HEAD MASSAGE ══════════════════════════════════
  ['[M] Regular Oil Massage',                    220,  'men', 'Head Massage'],
  ['[M] Ayurvedic Oil Massage',                  380,  'men', 'Head Massage'],
  ['[M] Moroccanoil Head Massage',               500,  'men', 'Head Massage'],

  // ═══ MEN — HAIR SPA ══════════════════════════════════════
  ['[M] Regular Spa',                            500,  'men', 'Hair Spa'],
  ['[M] Essential Hairfall Treatment',          1100,  'men', 'Hair Spa'],
  ['[M] Essential Rejuvenating',               1100,  'men', 'Hair Spa'],
  ['[M] Protein Rush Spa',                      1150,  'men', 'Hair Spa'],
  ['[M] Moroccanoil Spa',                       1400,  'men', 'Hair Spa'],
  ['[M] Destress Spa',                           800,  'men', 'Hair Spa'],

  // ═══ MEN — SKIN CARE ═════════════════════════════════════
  ['[M] Face & Neck Bleach',                     550,  'men', 'Skin Care'],
  ['[M] Face & Neck Detan',                      600,  'men', 'Skin Care'],
  ['[M] Regular Clean-Up',                       600,  'men', 'Skin Care'],
  ['[M] Fruit Clean-Up',                         900,  'men', 'Skin Care'],
  ['[M] Vita C+ Facial',                        1650,  'men', 'Skin Care'],
  ['[M] Fruit Facial',                          1600,  'men', 'Skin Care'],
  ['[M] AntiTan Facial',                        1650,  'men', 'Skin Care'],
  ['[M] Deep Cleansing Treatment',              1800,  'men', 'Skin Care'],

  // ═══ WOMEN — HAIRCUT ═════════════════════════════════════
  ['[W] Child Haircut',                          300, 'women', 'Haircut'],
  ['[W] Stylist Haircut',                        500, 'women', 'Haircut'],

  // ═══ WOMEN — HAIRSTYLING ═════════════════════════════════
  ['[W] Blow-dry (Shoulder)',                    300, 'women', 'Hairstyling'],
  ['[W] Blow-dry (Mid-Back)',                    400, 'women', 'Hairstyling'],
  ['[W] Blow-dry (Waist & Below)',               500, 'women', 'Hairstyling'],
  ['[W] Wash & Plain Dry (Shoulder)',            300, 'women', 'Hairstyling'],
  ['[W] Wash & Plain Dry (Mid-Back)',            400, 'women', 'Hairstyling'],
  ['[W] Wash & Plain Dry (Waist)',               450, 'women', 'Hairstyling'],
  ['[W] Wash & Blow Dry (Shoulder)',             350, 'women', 'Hairstyling'],
  ['[W] Wash & Blow Dry (Mid-Back)',             480, 'women', 'Hairstyling'],
  ['[W] Wash & Blow Dry (Waist)',                550, 'women', 'Hairstyling'],
  ['[W] Ironing (Shoulder)',                     500, 'women', 'Hairstyling'],
  ['[W] Ironing (Mid-Back)',                     700, 'women', 'Hairstyling'],
  ['[W] Ironing (Waist)',                        900, 'women', 'Hairstyling'],
  ['[W] Tongs (Mid-Back)',                       900, 'women', 'Hairstyling'],
  ['[W] Tongs (Waist & Below)',                 1100, 'women', 'Hairstyling'],

  // ═══ WOMEN — HAIR COLOR ══════════════════════════════════
  ['[W] Pre-lightening Per Foil (Shoulder)',     350, 'women', 'Hair Color'],
  ['[W] Pre-lightening Per Foil (Mid-Back)',     480, 'women', 'Hair Color'],
  ['[W] Pre-lightening Per Foil (Waist)',        550, 'women', 'Hair Color'],
  ['[W] Highlighting Per Foil (Shoulder)',       400, 'women', 'Hair Color'],
  ['[W] Highlighting Per Foil (Mid-Back)',       550, 'women', 'Hair Color'],
  ['[W] Highlighting Per Foil (Waist)',          800, 'women', 'Hair Color'],
  ['[W] Highlighting Global (Shoulder)',        2900, 'women', 'Hair Color'],
  ['[W] Highlighting Global (Mid-Back)',        3600, 'women', 'Hair Color'],
  ['[W] Highlighting Global (Waist)',           4200, 'women', 'Hair Color'],
  ['[W] Root Touch-up',                          950, 'women', 'Hair Color'],
  ['[W] Global Coloring (Shoulder)',            3500, 'women', 'Hair Color'],
  ['[W] Global Coloring (Mid-Back)',            4000, 'women', 'Hair Color'],
  ['[W] Global Coloring (Waist)',               5500, 'women', 'Hair Color'],
  ['[W] Natural Root Touch-up',                1200, 'women', 'Hair Color'],
  ['[W] Natural Global Coloring (Shoulder)',    4500, 'women', 'Hair Color'],
  ['[W] Natural Global Coloring (Mid-Back)',    5500, 'women', 'Hair Color'],
  ['[W] Natural Global Coloring (Waist)',       6600, 'women', 'Hair Color'],
  ['[W] Full Highlights (Shoulder)',            5000, 'women', 'Hair Color'],
  ['[W] Full Highlights (Mid-Back)',            6500, 'women', 'Hair Color'],
  ['[W] Full Highlights (Waist)',               7500, 'women', 'Hair Color'],
  ['[W] Global + Highlights (Shoulder)',        6000, 'women', 'Hair Color'],
  ['[W] Global + Highlights (Mid-Back)',        8000, 'women', 'Hair Color'],
  ['[W] Global + Highlights (Waist)',           9000, 'women', 'Hair Color'],

  // ═══ WOMEN — HAIR TEXTURE ════════════════════════════════
  ['[W] Straightening / Smoothening (Shoulder)',5000, 'women', 'Hair Texture'],
  ['[W] Straightening / Smoothening (Mid-Back)',7500, 'women', 'Hair Texture'],
  ['[W] Straightening / Smoothening (Waist)',   8000, 'women', 'Hair Texture'],
  ['[W] Kera-Smooth (Shoulder)',                7000, 'women', 'Hair Texture'],
  ['[W] Kera-Smooth (Mid-Back)',                8500, 'women', 'Hair Texture'],
  ['[W] Kera-Smooth (Waist)',                   9000, 'women', 'Hair Texture'],
  ['[W] QOD Treatment (Shoulder)',              8000, 'women', 'Hair Texture'],
  ['[W] QOD Treatment (Mid-Back)',              9000, 'women', 'Hair Texture'],
  ['[W] QOD Treatment (Waist)',                10000, 'women', 'Hair Texture'],
  ['[W] Collagen Treatment / Botox (Shoulder)', 6000, 'women', 'Hair Texture'],
  ['[W] Collagen Treatment / Botox (Mid-Back)', 8000, 'women', 'Hair Texture'],
  ['[W] Collagen Treatment / Botox (Waist)',    8500, 'women', 'Hair Texture'],

  // ═══ WOMEN — HAIR CARE ═══════════════════════════════════
  ['[W] Health Boost',                           500, 'women', 'Hair Care'],
  ['[W] Moisture Boost',                         500, 'women', 'Hair Care'],
  ['[W] Regular Oil Head Massage',               550, 'women', 'Hair Care'],
  ['[W] Ayurvedic Oil Head Massage',             850, 'women', 'Hair Care'],
  ['[W] Moroccanoil Head Massage',              1200, 'women', 'Hair Care'],

  // ═══ WOMEN — HAIR SPA ════════════════════════════════════
  ['[W] Essential Rejuvenating (Shoulder)',     1100, 'women', 'Hair Spa'],
  ['[W] Essential Rejuvenating (Mid-Back)',     1300, 'women', 'Hair Spa'],
  ['[W] Essential Rejuvenating (Waist)',        1500, 'women', 'Hair Spa'],
  ['[W] Essential Revitalising (Shoulder)',     1100, 'women', 'Hair Spa'],
  ['[W] Essential Revitalising (Mid-Back)',     1300, 'women', 'Hair Spa'],
  ['[W] Essential Revitalising (Waist)',        1500, 'women', 'Hair Spa'],
  ['[W] Regular Care Spa (Shoulder)',            800, 'women', 'Hair Spa'],
  ['[W] Regular Care Spa (Mid-Back)',            950, 'women', 'Hair Spa'],
  ['[W] Regular Care Spa (Waist)',              1050, 'women', 'Hair Spa'],
  ['[W] Destress Spa (Shoulder)',               1300, 'women', 'Hair Spa'],
  ['[W] Destress Spa (Mid-Back)',               1500, 'women', 'Hair Spa'],
  ['[W] Destress Spa (Waist)',                  1800, 'women', 'Hair Spa'],
  ['[W] Protein Spa (Shoulder)',                2000, 'women', 'Hair Spa'],
  ['[W] Protein Spa (Mid-Back)',                2500, 'women', 'Hair Spa'],
  ['[W] Protein Spa (Waist)',                   2900, 'women', 'Hair Spa'],
  ['[W] Moroccanoil Spa (Shoulder)',            2800, 'women', 'Hair Spa'],
  ['[W] Moroccanoil Spa (Mid-Back)',            3500, 'women', 'Hair Spa'],
  ['[W] Moroccanoil Spa (Waist)',               4000, 'women', 'Hair Spa'],

  // ═══ WOMEN — SKIN CARE ═══════════════════════════════════
  ['[W] Face & Neck Bleach',                     550, 'women', 'Skin Care'],
  ['[W] Face & Neck Detan',                      600, 'women', 'Skin Care'],
  ['[W] Regular Clean-Up',                       600, 'women', 'Skin Care'],
  ['[W] Fruit Clean-Up',                         900, 'women', 'Skin Care'],
  ['[W] Vita C+ Facial',                        1650, 'women', 'Skin Care'],
  ['[W] Fruit Facial',                          1600, 'women', 'Skin Care'],
  ['[W] AntiTan Facial',                        1650, 'women', 'Skin Care'],
  ['[W] Deep Cleansing Treatment',              1800, 'women', 'Skin Care'],
];

const seedAll = db.transaction(() => {
  let added = 0, skipped = 0;
  for (const [name, price, gender, category] of services) {
    const r = insert.run(name, price, gender, category);
    r.changes > 0 ? added++ : skipped++;
  }
  return { added, skipped };
});

const { added, skipped } = seedAll();
console.log(`\n✅ Done!`);
console.log(`   Added  : ${added} services`);
console.log(`   Skipped: ${skipped} (already existed)`);
console.log(`   Total in rate card: ${services.length}\n`);
db.close();
