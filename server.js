const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const helmet = require("helmet");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const PUBLIC = path.join(ROOT, "public");
const UPLOADS = path.join(PUBLIC, "uploads");

fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

const db = new Database(path.join(DATA, "youthnews.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  image TEXT DEFAULT '',
  category_id INTEGER,
  author TEXT DEFAULT 'YouthNews',
  status TEXT DEFAULT 'published',
  featured INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  published_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category_id INTEGER,
  columns INTEGER DEFAULT 2,
  article_limit INTEGER DEFAULT 2,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  month TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS trending (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS navigation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  category_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);
`);

const hash = s => crypto.createHash("sha256").update(String(s)).digest("hex");
const slugify = s => String(s || "").trim().toLowerCase()
  .replace(/[^\u0E00-\u0E7Fa-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || crypto.randomBytes(5).toString("hex");

const adminUser = process.env.ADMIN_USER || "admin";
const adminPass = process.env.ADMIN_PASSWORD || "change-me-now";
if (!db.prepare("SELECT id FROM users WHERE username=?").get(adminUser)) {
  db.prepare("INSERT INTO users(username,password_hash) VALUES(?,?)")
    .run(adminUser, hash(adminPass));
}

const seedCategories = [
  ["RMUTK News", "rmutk-news"], ["General", "general"],
  ["Training News", "training-news"], ["Career", "career"],
  ["Student Voice", "student-voice"]
];
for (const [name, slug] of seedCategories) {
  db.prepare("INSERT OR IGNORE INTO categories(name,slug,sort_order,active) VALUES(?,?,?,1)")
    .run(name, slug, seedCategories.findIndex(x => x[1] === slug) + 1);
}

const seedSettings = [
  ["site_name", "YouthNews"],
  ["tagline", "Stories for the next generation."],
  ["search_placeholder", "Search news, people, or topics..."],
  ["hero_button", "Read More"],
  ["contact", "news@youthnews.local"],
  ["footer_text", "© 2025 Youth News · Stories for the next generation."]
];
for (const [k, v] of seedSettings)
  db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)").run(k, v);

if (db.prepare("SELECT COUNT(*) c FROM articles").get().c === 0) {
  const cats = Object.fromEntries(
    db.prepare("SELECT id,slug FROM categories").all().map(x => [x.slug, x.id])
  );
  const sample = [
    ["RMUTK Open House 2025", "Explore your future at RMUTK — one campus, countless possibilities.",
     "Discover programs, student life, clubs, and opportunities at RMUTK. This sample story can be replaced from the admin dashboard.",
     "", cats["rmutk-news"], "YouthNews", "published", 1],
    ["RMUTK students shine at International Innovation Competition 2025", "Students represent RMUTK on an international stage.",
     "A sample campus story for testing the YouthNews CMS. Replace this article with your real report.",
     "", cats["rmutk-news"], "YouthNews", "published", 0],
    ["How AI is changing the world in 2025", "What students should know about AI and learning.",
     "A sample General article. Add your own content from the CMS.",
     "", cats.general, "YouthNews", "published", 0],
    ["Japan faces a shortage of young workers", "A look at changing opportunities for young people.",
     "A sample Training News story for the new website.",
     "", cats["training-news"], "YouthNews", "published", 0],
    ["Top 5 Skills Employers Want in 2026", "Skills that can help students become work ready.",
     "A sample Career story for testing categories and sections.",
     "", cats.career, "YouthNews", "published", 0],
    ["What I learned from my first semester", "A student perspective on campus life.",
     "A sample Student Voice article. Edit it in the admin dashboard.",
     "", cats["student-voice"], "Nicha", "published", 0]
  ];
  const insert = db.prepare(`INSERT INTO articles
    (title,slug,excerpt,content,image,category_id,author,status,featured)
    VALUES(?,?,?,?,?,?,?,?,?)`);
  for (const a of sample)
    insert.run(a[0], slugify(a[0]) + "-" + Date.now().toString().slice(-5), ...a.slice(1));
}

if (db.prepare("SELECT COUNT(*) c FROM sections").get().c === 0) {
  const cats = Object.fromEntries(
    db.prepare("SELECT id,slug FROM categories").all().map(x => [x.slug, x.id])
  );
  const sections = [
    ["RMUTK NEWS", cats["rmutk-news"], 2, 2, 1],
    ["GENERAL", cats.general, 2, 2, 2],
    ["TRAINING NEWS", cats["training-news"], 2, 2, 3],
    ["CAREER", cats.career, 2, 2, 4],
    ["STUDENT VOICE", cats["student-voice"], 1, 1, 5]
  ];
  const ins = db.prepare(`INSERT INTO sections
    (title,category_id,columns,article_limit,sort_order,active)
    VALUES(?,?,?,?,?,1)`);
  sections.forEach(x => ins.run(...x));
}

if (db.prepare("SELECT COUNT(*) c FROM events").get().c === 0) {
  const ins = db.prepare("INSERT INTO events(day,month,title,details,sort_order,active) VALUES(?,?,?,?,?,1)");
  ins.run("22", "MAR", "RMUTK Job Fair 2025", "09:00 – 16:00 · Main Hall", 1);
  ins.run("28", "MAR", "English Workshop", "13:00 – 15:00 · Room L203", 2);
  ins.run("05", "JUN", "Startup Pitching Day", "09:00 – 15:00 · Co-working Space", 3);
}

if (db.prepare("SELECT COUNT(*) c FROM trending").get().c === 0) {
  const ins = db.prepare("INSERT INTO trending(label,sort_order,active) VALUES(?,?,1)");
  ["#RMUTK", "#CampusLife", "#AI", "#Scholarship", "#Internship"].forEach((x, i) => ins.run(x, i + 1));
}

if (db.prepare("SELECT COUNT(*) c FROM navigation").get().c === 0) {
  const cats = Object.fromEntries(
    db.prepare("SELECT id,slug FROM categories").all().map(x => [x.slug, x.id])
  );
  const nav = [
    ["Home", "/", null, 1],
    ["RMUTK News", "/?category=rmutk-news", cats["rmutk-news"], 2],
    ["General", "/?category=general", cats.general, 3],
    ["Training News", "/?category=training-news", cats["training-news"], 4],
    ["Career", "/?category=career", cats.career, 5],
    ["Student Voice", "/?category=student-voice", cats["student-voice"], 6],
    ["Trending", "/?trending=1", null, 7]
  ];
  const ins = db.prepare(`INSERT INTO navigation(label,url,category_id,sort_order,active)
    VALUES(?,?,?,?,1)`);
  nav.forEach(x => ins.run(...x));
}

function articleRow(a) { return { ...a, featured: !!a.featured }; }
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  return res.status(401).json({ error: "Please log in first." });
}
function getSettings() {
  return Object.fromEntries(
    db.prepare("SELECT key,value FROM settings").all().map(x => [x.key, x.value])
  );
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8
  }
}));
app.use(express.static(PUBLIC));

app.get("/api/settings", (req, res) => res.json(getSettings()));

app.get("/api/categories", (req, res) => {
  const admin = req.query.admin === "1" && req.session.user;
  const sql = admin
    ? "SELECT * FROM categories ORDER BY sort_order,id"
    : "SELECT * FROM categories WHERE active=1 ORDER BY sort_order,id";
  res.json(db.prepare(sql).all());
});

app.get("/api/navigation", (req, res) => {
  res.json(db.prepare("SELECT * FROM navigation WHERE active=1 ORDER BY sort_order,id").all());
});

app.get("/api/trending", (req, res) => {
  res.json(db.prepare("SELECT * FROM trending WHERE active=1 ORDER BY sort_order,id").all());
});

app.get("/api/events", (req, res) => {
  res.json(db.prepare("SELECT * FROM events WHERE active=1 ORDER BY sort_order,id LIMIT 10").all());
});

app.get("/api/sections", (req, res) => {
  const admin = req.query.admin === "1" && req.session.user;
  const sql = admin
    ? `SELECT s.*,c.name category_name,c.slug category_slug
       FROM sections s LEFT JOIN categories c ON c.id=s.category_id
       ORDER BY s.sort_order,s.id`
    : `SELECT s.*,c.name category_name,c.slug category_slug
       FROM sections s LEFT JOIN categories c ON c.id=s.category_id
       WHERE s.active=1 ORDER BY s.sort_order,s.id`;
  res.json(db.prepare(sql).all());
});

app.get("/api/articles", (req, res) => {
  const { category, search, featured, status, limit = 30, page = 1 } = req.query;
  const where = [];
  const args = [];
  const admin = req.session.user && status !== undefined;

  if (!admin) where.push("a.status='published'");
  else if (status && status !== "all") { where.push("a.status=?"); args.push(status); }

  if (category) { where.push("c.slug=?"); args.push(category); }
  if (featured === "1") where.push("a.featured=1");
  if (search) {
    where.push("(a.title LIKE ? OR a.excerpt LIKE ? OR a.content LIKE ?)");
    const q = `%${search}%`; args.push(q, q, q);
  }

  const lim = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const pageNum = Math.max(Number(page) || 1, 1);
  const off = (pageNum - 1) * lim;
  const clause = where.length ? "WHERE " + where.join(" AND ") : "";
  const rows = db.prepare(`SELECT a.*,c.name category_name,c.slug category_slug
    FROM articles a LEFT JOIN categories c ON c.id=a.category_id
    ${clause}
    ORDER BY a.featured DESC,a.published_at DESC,a.id DESC
    LIMIT ? OFFSET ?`).all(...args, lim, off);
  res.json(rows.map(articleRow));
});

app.get("/api/articles/:slug", (req, res) => {
  const a = db.prepare(`SELECT a.*,c.name category_name,c.slug category_slug
    FROM articles a LEFT JOIN categories c ON c.id=a.category_id
    WHERE a.slug=? AND a.status='published'`).get(req.params.slug);
  if (!a) return res.status(404).json({ error: "Article not found." });
  db.prepare("UPDATE articles SET views=views+1 WHERE id=?").run(a.id);
  a.views += 1;
  res.json(articleRow(a));
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const u = db.prepare("SELECT * FROM users WHERE username=? AND password_hash=?")
    .get(username, hash(password || ""));
  if (!u) return res.status(401).json({ error: "Invalid username or password." });
  req.session.user = { id: u.id, username: u.username };
  res.json({ ok: true, username: u.username });
});
app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get("/api/me", (req, res) => res.json(req.session.user || null));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => cb(
    null,
    Date.now() + "-" + crypto.randomBytes(4).toString("hex") +
    path.extname(file.originalname).toLowerCase()
  )
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, f, cb) =>
    cb(null, /^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(f.mimetype))
});
app.post("/api/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Please choose an image." });
  res.json({ url: "/uploads/" + req.file.filename });
});

app.post("/api/articles", requireAuth, (req, res) => {
  const { title, excerpt, content, image, category_id, author, status = "published", featured = false } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title is required." });
  const slug = slugify(title) + "-" + Date.now().toString().slice(-6);
  const info = db.prepare(`INSERT INTO articles
    (title,slug,excerpt,content,image,category_id,author,status,featured)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(
      title.trim(), slug, excerpt || "", content || "",
      image || "", category_id || null, author || "YouthNews",
      status === "draft" ? "draft" : "published", featured ? 1 : 0
    );
  res.json(db.prepare("SELECT * FROM articles WHERE id=?").get(info.lastInsertRowid));
});

app.put("/api/articles/:id", requireAuth, (req, res) => {
  const { title, excerpt, content, image, category_id, author, status, featured } = req.body;
  db.prepare(`UPDATE articles SET title=?,excerpt=?,content=?,image=?,category_id=?,
    author=?,status=?,featured=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(
    title, excerpt || "", content || "", image || "", category_id || null,
    author || "YouthNews", status === "draft" ? "draft" : "published",
    featured ? 1 : 0, req.params.id
  );
  res.json({ ok: true });
});
app.delete("/api/articles/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM articles WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/categories", requireAuth, (req, res) => {
  const { name, slug, sort_order = 0, active = true } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Category name is required." });
  const finalSlug = slugify(slug || name);
  try {
    const info = db.prepare("INSERT INTO categories(name,slug,sort_order,active) VALUES(?,?,?,?)")
      .run(name.trim(), finalSlug, Number(sort_order) || 0, active ? 1 : 0);
    res.json(db.prepare("SELECT * FROM categories WHERE id=?").get(info.lastInsertRowid));
  } catch {
    res.status(400).json({ error: "Category name or slug already exists." });
  }
});
app.put("/api/categories/:id", requireAuth, (req, res) => {
  const { name, slug, sort_order = 0, active = true } = req.body;
  try {
    db.prepare("UPDATE categories SET name=?,slug=?,sort_order=?,active=? WHERE id=?")
      .run(name.trim(), slugify(slug || name), Number(sort_order) || 0, active ? 1 : 0, req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "Category name or slug already exists." });
  }
});
app.delete("/api/categories/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM categories WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/sections", requireAuth, (req, res) => {
  const { title, category_id, columns = 2, article_limit = 2, sort_order = 0, active = true } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Section title is required." });
  const cols = Math.min(Math.max(Number(columns) || 2, 1), 4);
  const lim = Math.min(Math.max(Number(article_limit) || 2, 1), 12);
  const info = db.prepare(`INSERT INTO sections
    (title,category_id,columns,article_limit,sort_order,active) VALUES(?,?,?,?,?,?)`)
    .run(title.trim(), category_id || null, cols, lim, Number(sort_order) || 0, active ? 1 : 0);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put("/api/sections/:id", requireAuth, (req, res) => {
  const { title, category_id, columns = 2, article_limit = 2, sort_order = 0, active = true } = req.body;
  db.prepare(`UPDATE sections SET title=?,category_id=?,columns=?,article_limit=?,sort_order=?,active=? WHERE id=?`)
    .run(title.trim(), category_id || null,
      Math.min(Math.max(Number(columns) || 2, 1), 4),
      Math.min(Math.max(Number(article_limit) || 2, 1), 12),
      Number(sort_order) || 0, active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});
app.delete("/api/sections/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM sections WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/events", requireAuth, (req, res) => {
  const { day, month, title, details, sort_order = 0, active = true } = req.body;
  if (!day || !month || !title) return res.status(400).json({ error: "Day, month and title are required." });
  const info = db.prepare(`INSERT INTO events(day,month,title,details,sort_order,active)
    VALUES(?,?,?,?,?,?)`).run(day, month, title, details || "", Number(sort_order) || 0, active ? 1 : 0);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put("/api/events/:id", requireAuth, (req, res) => {
  const { day, month, title, details, sort_order = 0, active = true } = req.body;
  db.prepare(`UPDATE events SET day=?,month=?,title=?,details=?,sort_order=?,active=? WHERE id=?`)
    .run(day, month, title, details || "", Number(sort_order) || 0, active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});
app.delete("/api/events/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM events WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/trending", requireAuth, (req, res) => {
  const { label, sort_order = 0, active = true } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: "Topic is required." });
  try {
    const info = db.prepare("INSERT INTO trending(label,sort_order,active) VALUES(?,?,?)")
      .run(label.trim(), Number(sort_order) || 0, active ? 1 : 0);
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch {
    res.status(400).json({ error: "This topic already exists." });
  }
});
app.put("/api/trending/:id", requireAuth, (req, res) => {
  const { label, sort_order = 0, active = true } = req.body;
  try {
    db.prepare("UPDATE trending SET label=?,sort_order=?,active=? WHERE id=?")
      .run(label.trim(), Number(sort_order) || 0, active ? 1 : 0, req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "This topic already exists." });
  }
});
app.delete("/api/trending/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM trending WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/navigation", requireAuth, (req, res) => {
  const { label, url, category_id, sort_order = 0, active = true } = req.body;
  if (!label?.trim() || !url?.trim()) return res.status(400).json({ error: "Label and URL are required." });
  const info = db.prepare(`INSERT INTO navigation(label,url,category_id,sort_order,active)
    VALUES(?,?,?,?,?)`).run(label.trim(), url.trim(), category_id || null, Number(sort_order) || 0, active ? 1 : 0);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put("/api/navigation/:id", requireAuth, (req, res) => {
  const { label, url, category_id, sort_order = 0, active = true } = req.body;
  db.prepare(`UPDATE navigation SET label=?,url=?,category_id=?,sort_order=?,active=? WHERE id=?`)
    .run(label.trim(), url.trim(), category_id || null, Number(sort_order) || 0, active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});
app.delete("/api/navigation/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM navigation WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.put("/api/settings", requireAuth, (req, res) => {
  const up = db.prepare(`INSERT INTO settings(key,value) VALUES(?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  const tx = db.transaction(obj => Object.entries(obj).forEach(([k, v]) => up.run(k, String(v))));
  tx(req.body || {});
  res.json({ ok: true });
});

app.get("/admin", (req, res) => res.sendFile(path.join(PUBLIC, "admin.html")));

/* Express 5: use a RegExp catch-all instead of app.get("*"). */
app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
  res.sendFile(path.join(PUBLIC, "index.html"));
});

app.listen(PORT, () => console.log(`YouthNews running on port ${PORT}`));
