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
const UPLOADS = path.join(ROOT, "public", "uploads");
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

const db = new Database(path.join(DATA, "youthnews.db"));
db.pragma("journal_mode = WAL");
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
  slug TEXT UNIQUE NOT NULL
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
  FOREIGN KEY(category_id) REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

const hash = s => crypto.createHash("sha256").update(s).digest("hex");
const adminUser = process.env.ADMIN_USER || "admin";
const adminPass = process.env.ADMIN_PASSWORD || "change-me-now";
if (!db.prepare("SELECT id FROM users WHERE username=?").get(adminUser)) {
  db.prepare("INSERT INTO users(username,password_hash) VALUES(?,?)").run(adminUser, hash(adminPass));
}
const catSeed = [
  ["ข่าวเด่น","featured"],["การศึกษา","education"],["มหาวิทยาลัย","university"],
  ["กิจกรรมนักศึกษา","student-life"],["สังคม","society"],["ไลฟ์สไตล์","lifestyle"]
];
for (const [name, slug] of catSeed)
  db.prepare("INSERT OR IGNORE INTO categories(name,slug) VALUES(?,?)").run(name,slug);

const settings = [
  ["site_name","YouthNews"],["tagline","ข่าวสารคนรุ่นใหม่ รู้ไว เข้าใจง่าย"],
  ["breaking","ติดตามข่าวเด่นและเรื่องราวที่คนรุ่นใหม่กำลังพูดถึง"],
  ["facebook","#"],["instagram","#"],["contact","news@youthnews.local"]
];
for (const [k,v] of settings) db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)").run(k,v);

if (db.prepare("SELECT COUNT(*) c FROM articles").get().c === 0) {
  const cats = Object.fromEntries(db.prepare("SELECT id,slug FROM categories").all().map(x=>[x.slug,x.id]));
  const sample = [
    ["เปิดพื้นที่ข่าวสำหรับคนรุ่นใหม่","เปิดพื้นที่ข่าวที่เล่าเรื่องการศึกษา มหาวิทยาลัย กิจกรรมนักศึกษา และประเด็นสังคมด้วยภาษาที่เข้าใจง่าย","บทความตัวอย่างสำหรับเริ่มต้นระบบ คุณสามารถแก้ไข ลบ หรือเพิ่มข่าวใหม่ได้จากหลังบ้าน","/uploads/placeholder.svg",cats.university,1],
    ["เทคโนโลยีเปลี่ยนห้องเรียนอย่างไร","รวมประเด็นน่ารู้เกี่ยวกับการเรียนยุคดิจิทัลและเครื่องมือที่ช่วยให้นักศึกษาเรียนได้คล่องขึ้น","เนื้อหาตัวอย่างสำหรับทดสอบระบบจัดการข่าวของ YouthNews","/uploads/placeholder.svg",cats.education,0],
    ["รวมกิจกรรมที่นักศึกษาไม่ควรพลาด","อัปเดตกิจกรรมและโอกาสสำหรับนักศึกษาในช่วงนี้","เนื้อหาตัวอย่าง สามารถแทนที่ด้วยข่าวจริงจากกองบรรณาธิการ","/uploads/placeholder.svg",cats["student-life"],0]
  ];
  const ins = db.prepare(`INSERT INTO articles(title,slug,excerpt,content,image,category_id,featured) VALUES(?,?,?,?,?,?,?)`);
  for (const a of sample) ins.run(a[0], slugify(a[0]), a[1], a[2], a[3], a[4], a[5]);
}

function slugify(s) {
  return s.toString().trim().toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9]+/g,"-").replace(/^-|-$/g,"") || crypto.randomBytes(5).toString("hex");
}
function articleRow(a) {
  return {...a, featured: !!a.featured};
}
function requireAuth(req,res,next){ if(req.session.user) return next(); res.status(401).json({error:"ต้องเข้าสู่ระบบก่อน"}); }

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET || "replace-this-secret-in-production",
  resave:false, saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:1000*60*60*8}
}));
app.use(express.static(path.join(ROOT,"public")));

app.get("/api/settings",(req,res)=>{
  res.json(Object.fromEntries(db.prepare("SELECT key,value FROM settings").all().map(x=>[x.key,x.value])));
});
app.get("/api/categories",(req,res)=>res.json(db.prepare("SELECT * FROM categories ORDER BY id").all()));

app.get("/api/articles",(req,res)=>{
  const {category, search, featured, limit=30, page=1} = req.query;
  const where=["a.status='published'"]; const args=[];
  if(category){ where.push("c.slug=?"); args.push(category); }
  if(featured==="1"){ where.push("a.featured=1"); }
  if(search){ where.push("(a.title LIKE ? OR a.excerpt LIKE ? OR a.content LIKE ?)"); const q=`%${search}%`; args.push(q,q,q); }
  const lim=Math.min(Number(limit)||30,100), off=(Math.max(Number(page)||1,1)-1)*lim;
  const rows=db.prepare(`SELECT a.*,c.name category_name,c.slug category_slug
    FROM articles a LEFT JOIN categories c ON c.id=a.category_id
    WHERE ${where.join(" AND ")} ORDER BY a.featured DESC,a.published_at DESC LIMIT ? OFFSET ?`).all(...args,lim,off);
  res.json(rows.map(articleRow));
});

app.get("/api/articles/:slug",(req,res)=>{
  const a=db.prepare(`SELECT a.*,c.name category_name,c.slug category_slug
    FROM articles a LEFT JOIN categories c ON c.id=a.category_id WHERE a.slug=? AND a.status='published'`).get(req.params.slug);
  if(!a) return res.status(404).json({error:"ไม่พบข่าว"});
  db.prepare("UPDATE articles SET views=views+1 WHERE id=?").run(a.id);
  res.json(articleRow(a));
});

app.post("/api/login",(req,res)=>{
  const {username,password}=req.body;
  const u=db.prepare("SELECT * FROM users WHERE username=? AND password_hash=?").get(username,hash(password||""));
  if(!u) return res.status(401).json({error:"ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"});
  req.session.user={id:u.id,username:u.username}; res.json({ok:true,username:u.username});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>res.json(req.session.user||null));

const storage=multer.diskStorage({
  destination:(_,__,cb)=>cb(null,UPLOADS),
  filename:(_,file,cb)=>cb(null,Date.now()+"-"+crypto.randomBytes(4).toString("hex")+path.extname(file.originalname).toLowerCase())
});
const upload=multer({storage,limits:{fileSize:8*1024*1024},fileFilter:(_,f,cb)=>cb(null,/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(f.mimetype))});
app.post("/api/upload",requireAuth,upload.single("image"),(req,res)=>{
  if(!req.file) return res.status(400).json({error:"กรุณาเลือกไฟล์ภาพ"});
  res.json({url:"/uploads/"+req.file.filename});
});

app.post("/api/articles",requireAuth,(req,res)=>{
  const {title,excerpt,content,image,category_id,author,status="published",featured=false}=req.body;
  if(!title) return res.status(400).json({error:"กรุณาใส่พาดหัวข่าว"});
  const slug=slugify(title)+"-"+Date.now().toString().slice(-5);
  const info=db.prepare(`INSERT INTO articles(title,slug,excerpt,content,image,category_id,author,status,featured)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(title,slug,excerpt||"",content||"",image||"/uploads/placeholder.svg",category_id||null,author||"YouthNews",status,featured?1:0);
  res.json(db.prepare("SELECT * FROM articles WHERE id=?").get(info.lastInsertRowid));
});

app.put("/api/articles/:id",requireAuth,(req,res)=>{
  const {title,excerpt,content,image,category_id,author,status,featured}=req.body;
  db.prepare(`UPDATE articles SET title=?,excerpt=?,content=?,image=?,category_id=?,author=?,status=?,featured=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(title,excerpt||"",content||"",image||"",category_id||null,author||"YouthNews",status||"published",featured?1:0,req.params.id);
  res.json({ok:true});
});
app.delete("/api/articles/:id",requireAuth,(req,res)=>{
  db.prepare("DELETE FROM articles WHERE id=?").run(req.params.id); res.json({ok:true});
});
app.put("/api/settings",requireAuth,(req,res)=>{
  const up=db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  const tx=db.transaction(obj=>Object.entries(obj).forEach(([k,v])=>up.run(k,String(v))));
  tx(req.body); res.json({ok:true});
});

app.get("/admin",(req,res)=>res.sendFile(path.join(ROOT,"public","admin.html")));
app.get("*",(req,res)=>{
  if(req.path.startsWith("/api/")) return res.status(404).end();
  res.sendFile(path.join(ROOT,"public","index.html"));
});

app.listen(PORT,()=>console.log(`YouthNews running at http://localhost:${PORT}`));
