"use strict";

const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// ── DB Path ───────────────────────────────────────────────────────
const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "../../data/fa2m.db");
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Open DB ───────────────────────────────────────────────────────
const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    price       REAL    NOT NULL,
    old_price   REAL,
    badge       TEXT,
    short_desc  TEXT,
    long_desc   TEXT,
    image       TEXT,
    images      TEXT    DEFAULT '[]',
    rating      REAL    DEFAULT 4.5,
    reviews     INTEGER DEFAULT 0,
    stock       INTEGER DEFAULT 10,
    specs       TEXT    DEFAULT '[]',
    active      INTEGER DEFAULT 1,
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY,
    prenom          TEXT NOT NULL,
    nom             TEXT NOT NULL,
    telephone       TEXT NOT NULL,
    adresse         TEXT NOT NULL,
    quartier        TEXT,
    ville           TEXT DEFAULT 'Dakar',
    items           TEXT NOT NULL,
    total           REAL NOT NULL,
    status          TEXT DEFAULT 'nouvelle',
    payment_method  TEXT DEFAULT 'whatsapp',
    payment_status  TEXT DEFAULT 'pending',
    payment_ref     TEXT,
    wave_checkout_id TEXT,
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    last_login    TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  );
`);

// ── Seed Admin User ───────────────────────────────────────────────
const adminCount = db.prepare("SELECT COUNT(*) AS cnt FROM admin_users").get();
if (adminCount.cnt === 0) {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "fa2m2024";

  if (!process.env.ADMIN_PASSWORD) {
    console.warn(
      "\n⚠️  ATTENTION: Mot de passe admin par défaut utilisé (fa2m2024).",
    );
    console.warn("   Définissez ADMIN_PASSWORD dans votre fichier .env !\n");
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
  ).run(username, hash);
  console.log(`✓  Compte admin créé : ${username}`);
}

// ── Default Products ──────────────────────────────────────────────
const DEFAULT_PRODUCTS = [
  {
    name: "Montre Connectée Smart X",
    category: "accessoires",
    price: 89000,
    old_price: 125000,
    badge: "Populaire",
    short_desc:
      "Montre connectée premium — écran AMOLED, suivi santé 24h/24, bracelet cuir véritable.",
    long_desc:
      "La Smart X combine élégance et technologie de pointe. Boîtier en acier inoxydable 316L résistant à l'eau 5ATM. Suivi cardiaque, SpO2 et sommeil en temps réel. Autonomie 7 jours. Compatible iOS et Android.",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
      "https://images.unsplash.com/photo-1548171916-c8fd108eba62?w=600&q=80",
      "https://images.unsplash.com/photo-1617043786394-f977fa12eddf?w=600&q=80",
      "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80",
    ]),
    rating: 4.8,
    reviews: 142,
    stock: 15,
    specs: JSON.stringify([
      ["Boîtier", "Acier inoxydable 316L"],
      ["Écran", 'AMOLED 1.4"'],
      ["Étanchéité", "5 ATM (50 m)"],
      ["Autonomie", "7 jours"],
      ["Compatibilité", "iOS & Android"],
    ]),
  },
  {
    name: "Sac à Main Élégance Paris",
    category: "sacs",
    price: 45000,
    old_price: 65000,
    badge: "Promo",
    short_desc:
      "Sac à main en cuir grainé — design parisien, bandoulière amovible, toutes occasions.",
    long_desc:
      "Confectionné en cuir grainé de qualité supérieure, ce sac allie style et praticité. Doublure en satin, nombreuses poches intérieures. Bandoulière amovible et réglable.",
    image:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80",
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80",
    ]),
    rating: 4.6,
    reviews: 89,
    stock: 20,
    specs: JSON.stringify([
      ["Matière", "Cuir grainé"],
      ["Dimensions", "32 × 24 × 12 cm"],
      ["Fermeture", "Zip doré"],
      ["Bandoulière", "Amovible"],
      ["Doublure", "Satin"],
    ]),
  },
  {
    name: "Parfum Oud Royal Collection",
    category: "beaute",
    price: 35000,
    old_price: 50000,
    badge: "Nouveau",
    short_desc:
      "Parfum oriental luxueux — notes de oud, rose et ambre. Tenue exceptionnelle 12h.",
    long_desc:
      "Une fragrance envoûtante inspirée des grands parfums d'Orient. Ouverture boisée-épicée, cœur floral de rose de Damas, fond d'ambre et de musc blanc.",
    image:
      "https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80",
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=80",
      "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&q=80",
    ]),
    rating: 4.9,
    reviews: 213,
    stock: 30,
    specs: JSON.stringify([
      ["Volume", "100 ml"],
      ["Famille olfactive", "Oriental boisé"],
      ["Tenue", "8 – 12 heures"],
      ["Notes de tête", "Épices, bergamote"],
      ["Notes de fond", "Oud, ambre, musc blanc"],
    ]),
  },
  {
    name: "Sneakers Urbain Pro",
    category: "chaussures",
    price: 55000,
    old_price: 75000,
    badge: "Populaire",
    short_desc:
      "Sneakers haut de gamme — tige cuir pleine fleur, semelle amorti, style urbain moderne.",
    long_desc:
      "Design contemporain alliant performance et élégance. Tige en cuir pleine fleur, semelle en caoutchouc vulcanisé avec technologie d'amorti avancée.",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
      "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=600&q=80",
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80",
    ]),
    rating: 4.7,
    reviews: 156,
    stock: 12,
    specs: JSON.stringify([
      ["Tige", "Cuir pleine fleur"],
      ["Semelle", "Caoutchouc vulcanisé"],
      ["Pointures disponibles", "40 – 46"],
      ["Fermeture", "Lacets plats"],
      ["Usage", "Ville / Sport léger"],
    ]),
  },
  {
    name: "Grand Boubou Bazin Riche",
    category: "vetements",
    price: 75000,
    old_price: 95000,
    badge: "Nouveau",
    short_desc:
      "Boubou en bazin riche brodé main — tenue de cérémonie élégante, fabrication artisanale.",
    long_desc:
      "Taillé dans du bazin riche de première qualité, orné de broderies dorées faites main par nos artisans. Coupe ample et confortable pour mariages et cérémonies.",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
    ]),
    rating: 4.9,
    reviews: 67,
    stock: 8,
    specs: JSON.stringify([
      ["Tissu", "Bazin riche importé"],
      ["Broderie", "Dorée, faite main"],
      ["Coupe", "Ample — 3 pièces"],
      ["Tailles", "S à XXXL"],
      ["Entretien", "Lavage délicat à la main"],
    ]),
  },
  {
    name: "Bracelet Or 18 Carats",
    category: "accessoires",
    price: 120000,
    old_price: 150000,
    badge: "Luxe",
    short_desc:
      "Bracelet certifié en or 18 carats — finition polie miroir, fermoir sécurisé, écrin offert.",
    long_desc:
      "Bijou d'exception fabriqué en or 18 carats (750‰). Chaque pièce est certifiée et poinçonnée. Maillage souple pour un confort optimal. Livré dans un écrin luxueux.",
    image:
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80",
      "https://images.unsplash.com/photo-1573408301185-9519f94f76b0?w=600&q=80",
      "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600&q=80",
    ]),
    rating: 4.9,
    reviews: 38,
    stock: 5,
    specs: JSON.stringify([
      ["Titre", "Or 18 carats (750‰)"],
      ["Longueur", "19 cm ajustable"],
      ["Poids", "8,5 g"],
      ["Fermoir", "Mousqueton sécurisé"],
      ["Certificat", "Poinçon officiel inclus"],
    ]),
  },
  {
    name: "Sac Cuir Business Premium",
    category: "sacs",
    price: 68000,
    old_price: 85000,
    badge: null,
    short_desc:
      'Porte-documents cuir vieilli — compartiment laptop 15", organisation complète.',
    long_desc:
      "Sac professionnel pour cadres modernes. Compartiment rembourré pour ordinateur jusqu'à 15\", organisation interne complète. Cuir pleine fleur vieilli.",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
      "https://images.unsplash.com/photo-1524498577532-e90c90e4fdc7?w=600&q=80",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
    ]),
    rating: 4.5,
    reviews: 54,
    stock: 10,
    specs: JSON.stringify([
      ["Matière", "Cuir pleine fleur vieilli"],
      ["Dimensions", "42 × 30 × 10 cm"],
      ["Laptop", "Jusqu'à 15\""],
      ["Compartiments", "5 poches organisées"],
      ["Bandoulière", "Réglable incluse"],
    ]),
  },
  {
    name: "Robe Wax Moderne Couture",
    category: "vetements",
    price: 28000,
    old_price: 40000,
    badge: null,
    short_desc:
      "Robe wax 100% coton coupée par nos couturiers — motifs exclusifs édition limitée.",
    long_desc:
      "Magnifique robe en wax authentique taillée par nos couturiers locaux. Tissu 100% coton respirant, idéal pour le climat sénégalais. Coupe trapèze flatteuse.",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
    ]),
    rating: 4.7,
    reviews: 91,
    stock: 18,
    specs: JSON.stringify([
      ["Tissu", "Wax 100% coton"],
      ["Coupe", "Trapèze moderne"],
      ["Tailles", "XS à XL"],
      ["Lavage", "Machine 30°C"],
      ["Motif", "Édition limitée"],
    ]),
  },
];

// ── seedDefaultProducts ───────────────────────────────────────────
function seedDefaultProducts() {
  db.exec("DELETE FROM products");

  const insert = db.prepare(`
    INSERT INTO products
      (name, category, price, old_price, badge, short_desc, long_desc,
       image, images, rating, reviews, stock, specs, active)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  db.exec("BEGIN TRANSACTION");
  try {
    for (const p of DEFAULT_PRODUCTS) {
      insert.run(
        p.name,
        p.category,
        p.price,
        p.old_price ?? null,
        p.badge ?? null,
        p.short_desc ?? null,
        p.long_desc ?? null,
        p.image ?? null,
        p.images,
        p.rating,
        p.reviews,
        p.stock,
        p.specs,
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  console.log(`✓  ${DEFAULT_PRODUCTS.length} produits par défaut insérés.`);
}

// ── Auto-seed products if empty ───────────────────────────────────
const productCount = db.prepare("SELECT COUNT(*) AS cnt FROM products").get();
if (productCount.cnt === 0) {
  seedDefaultProducts();
}

module.exports = { db, seedDefaultProducts };
