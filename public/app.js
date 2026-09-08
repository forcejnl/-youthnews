const $ = id => document.getElementById(id);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
}

function safeUrl(value, fallback = "#") {
  const raw = String(value || fallback);
  if (raw.startsWith("/") || raw.startsWith("#") || raw.startsWith("?") || /^https?:\/\//i.test(raw)) return raw;
  return fallback;
}

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}

function articleCard(a) {
  const image = a.image ? `<img loading="lazy" src="${esc(a.image)}" alt="">` : "";
  const date = a.published_at ? new Date(a.published_at).toLocaleDateString("en-US", { month:"short", day:"numeric" }) : "Today";
  const minutes = Math.max(1, Math.ceil(String(a.content || "").trim().split(/\s+/).filter(Boolean).length / 180));
  return `<a class="newsCard" href="/article.html?slug=${encodeURIComponent(a.slug)}">
    <div class="thumb">${image}</div>
    <div class="newsInfo"><b>${esc(a.category_name || "NEWS")}</b><h3>${esc(a.title)}</h3><small>${minutes} min read · ${esc(date)}</small></div>
  </a>`;
}

function heroCard(a, button) {
  const background = a.image ? ` style="background-image:linear-gradient(90deg,rgba(10,18,12,.18),rgba(0,0,0,.84)),url('${esc(a.image)}')"` : "";
  return `<article class="heroCard"${background}><div><span class="limeTag">${esc(a.category_name || "FEATURED")}</span><h1>${esc(a.title)}</h1><p>${esc(a.excerpt || "")}</p><a href="/article.html?slug=${encodeURIComponent(a.slug)}" class="limeBtn">${esc(button || "Read More")}</a></div></article>`;
}

function eventCard(e) {
  let day = "—", month = "";
  if (e.event_date) {
    const d = new Date(`${String(e.event_date).slice(0,10)}T00:00:00`);
    if (!Number.isNaN(d.getTime())) { day = d.getDate(); month = d.toLocaleDateString("en-US", { month:"short" }).toUpperCase(); }
  }
  const meta = [e.event_time, e.location].filter(Boolean).join(" · ");
  return `<div class="event"><strong>${esc(day)}<span>${esc(month)}</span></strong><div>${esc(e.title)}<small>${esc(meta || e.description || "")}</small></div></div>`;
}

async function loadAll() {
  const jobs = [
    ["settings", "/api/settings"], ["nav", "/api/navigation"], ["trending", "/api/trending"],
    ["events", "/api/events"], ["cats", "/api/categories"], ["sections", "/api/sections"],
    ["featured", "/api/articles?featured=1&limit=3"], ["latest", "/api/articles?limit=8"]
  ];
  const settled = await Promise.allSettled(jobs.map(([, url]) => api(url)));
  const out = {};
  settled.forEach((result, i) => { out[jobs[i][0]] = result.status === "fulfilled" ? result.value : []; if (result.status === "rejected") console.error(jobs[i][1], result.reason); });
  out.settings = out.settings && !Array.isArray(out.settings) ? out.settings : {};
  for (const key of ["nav","trending","events","cats","sections","featured","latest"]) if (!Array.isArray(out[key])) out[key] = [];
  return out;
}

async function renderSections(sections) {
  const valid = sections.filter(s => s.enabled !== false);
  const html = await Promise.all(valid.map(async s => {
    try {
      const category = s.category_slug ? `&category=${encodeURIComponent(s.category_slug)}` : "";
      const limit = Math.min(Math.max(Number(s.article_limit) || 2, 1), 12);
      const articles = await api(`/api/articles?limit=${limit}${category}`);
      const cols = Math.min(Math.max(Number(s.columns_count) || 2, 1), 4);
      return `<section class="newsSection"><div class="sectionTitle"><h2>${esc(s.title)}</h2>${s.category_slug ? `<a href="/?category=${encodeURIComponent(s.category_slug)}">See all</a>` : ""}</div><div class="newsGrid cols${cols}">${articles.length ? articles.map(articleCard).join("") : `<p class="empty">No stories found.</p>`}</div></section>`;
    } catch (e) {
      console.error("section", e);
      return `<section class="newsSection"><div class="sectionTitle"><h2>${esc(s.title)}</h2></div><p class="empty">Stories are temporarily unavailable.</p></section>`;
    }
  }));
  $("sections").innerHTML = html.join("");
}

function setActiveNav(nav) {
  const params = new URLSearchParams(location.search);
  const category = params.get("category");
  const search = params.get("search");
  $("sideNav").innerHTML = nav.map((n, i) => {
    const href = safeUrl(n.url, "/");
    const active = category ? href.includes(`category=${encodeURIComponent(category)}`) : (!category && !search && href === "/");
    const icon = ["⌂","♧","◉","◇","⌕","♧","◌"][i] || "◌";
    return `<a class="${active ? "active" : ""}" href="${esc(href)}" onclick="document.body.classList.remove('menuOpen')">${icon}<span>${esc(n.label)}</span></a>`;
  }).join("");
}

async function init() {
  const data = await loadAll();
  const { settings, nav, trending, events, cats, sections, featured, latest } = data;
  $("searchInput").placeholder = settings.search_placeholder || "Search news, people, or topics...";
  setActiveNav(nav);

  const hero = featured[0] || latest[0];
  $("hero").innerHTML = hero ? heroCard(hero, settings.hero_button) : `<div class="heroCard"><div><span class="limeTag">YOUTH NEWS</span><h1>Stories for the next generation.</h1><p>Fresh stories from the campus community.</p></div></div>`;

  const trendHtml = trending.map(t => `<a href="/?search=${encodeURIComponent(String(t.label || "").replace(/^#/, ""))}">${esc(t.label)}</a>`).join("");
  $("trending").innerHTML = trendHtml || `<span class="muted">No trending topics yet.</span>`;
  $("trendingBottom").innerHTML = trendHtml || `<span class="muted">No trending topics yet.</span>`;

  $("categories").innerHTML = cats.map(c => `<li><a href="/?category=${encodeURIComponent(c.slug)}">${esc(c.name)}</a></li>`).join("") || `<li>No categories yet.</li>`;
  $("events").innerHTML = events.slice(0, 6).map(eventCard).join("") || `<p class="muted">No upcoming events.</p>`;
  $("quickGrid").innerHTML = latest.slice(0,4).map((a,i) => `<a href="/article.html?slug=${encodeURIComponent(a.slug)}" class="quickCard"><b>${String(i+1).padStart(2,"0")}</b><span>${esc(a.title)}</span></a>`).join("") || `<p class="empty">No published stories yet.</p>`;

  const params = new URLSearchParams(location.search);
  const categorySlug = params.get("category");
  const search = params.get("search");
  const all = params.get("all");
  $("filterPills").innerHTML = `<a class="${!categorySlug && !search && !all ? "selected" : ""}" href="/">All stories</a>` + cats.map(c => `<a class="${categorySlug === c.slug ? "selected" : ""}" href="/?category=${encodeURIComponent(c.slug)}">${esc(c.name)}</a>`).join("");

  if (categorySlug) {
    const results = await api(`/api/articles?category=${encodeURIComponent(categorySlug)}&limit=100`);
    const category = cats.find(c => c.slug === categorySlug);
    $("sections").innerHTML = `<section class="newsSection"><div class="sectionTitle"><h2>${esc(category?.name || "News")}</h2></div><div class="newsGrid cols2">${results.map(articleCard).join("") || `<p class="empty">No stories found in this category.</p>`}</div></section>`;
  } else if (search) {
    const results = await api(`/api/articles?search=${encodeURIComponent(search)}&limit=100`);
    $("hero").innerHTML = "";
    $("sections").innerHTML = `<section class="newsSection"><div class="sectionTitle"><h2>Search results</h2><span class="muted">${esc(search)}</span></div><div class="newsGrid cols2">${results.map(articleCard).join("") || `<p class="empty">No stories found.</p>`}</div></section>`;
  } else if (all) {
    const results = await api("/api/articles?limit=100");
    $("hero").innerHTML = "";
    $("sections").innerHTML = `<section class="newsSection"><div class="sectionTitle"><h2>All stories</h2></div><div class="newsGrid cols2">${results.map(articleCard).join("") || `<p class="empty">No stories found.</p>`}</div></section>`;
  } else {
    await renderSections(sections);
  }

  $("footer").textContent = settings.footer_text || "© Youth News · Stories for the next generation.";
}

function doSearch() {
  const q = $("searchInput").value.trim();
  if (q) location.href = `/?search=${encodeURIComponent(q)}`;
}

init().catch(error => {
  console.error(error);
  $("hero").innerHTML = `<div class="heroCard"><div><h1>Unable to load YouthNews</h1><p>The website is online, but some content is temporarily unavailable. Please refresh and try again.</p></div></div>`;
});
