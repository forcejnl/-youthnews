const SUPABASE_URL = "https://wtbdzydyxwqjcizudewc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XWfnXO78YNB-H_S1CjBL5g_Tnvf9dv7";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const $ = id => document.getElementById(id);

const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m])
  );

async function api(u) {
  const r = await fetch(u);
  if (!r.ok) throw new Error("API error");
  return r.json();
}

function articleCard(a) {
  return `
    <a class="newsCard" href="/article.html?slug=${encodeURIComponent(a.slug)}">
      <div class="thumb">
        ${a.image ? `<img src="${esc(a.image)}">` : ""}
      </div>

      <div class="newsInfo">
        <b>${esc(a.category_name || "NEWS")}</b>

        <h3>${esc(a.title)}</h3>

        <small>
          ${Math.max(
            1,
            Math.ceil(String(a.content || "").split(/\s+/).length / 180)
          )} min read ·
          ${
            a.published_at
              ? new Date(a.published_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric"
                })
              : "Today"
          }
        </small>
      </div>
    </a>
  `;
}

function heroCard(a, button) {
  return `
    <article
      class="heroCard"
      ${
        a.image
          ? `style="background-image:linear-gradient(90deg,rgba(10,18,12,.2),rgba(0,0,0,.8)),url('${esc(a.image)}')"`
          : ""
      }
    >
      <div>
        <span class="limeTag">
          ${esc(a.category_name || "FEATURED")}
        </span>

        <h1>${esc(a.title)}</h1>

        <p>${esc(a.excerpt || "")}</p>

        <a
          href="/article.html?slug=${encodeURIComponent(a.slug)}"
          class="limeBtn"
        >
          ${esc(button || "Read More")}
        </a>
      </div>
    </article>
  `;
}

async function init() {
  const [
    settings,
    nav,
    trending,
    events,
    cats,
    sections,
    featured,
    latest
  ] = await Promise.all([
    api("/api/settings"),
    api("/api/navigation"),
    api("/api/trending"),
    api("/api/events"),
    api("/api/categories"),
    api("/api/sections"),
    api("/api/articles?featured=1&limit=3"),
    api("/api/articles?limit=8")
  ]);

  /*
   * SEARCH
   */
  $("searchInput").placeholder =
    settings.search_placeholder ||
    "Search news, people, or topics...";


  /*
   * LEFT NAVIGATION
   */
  $("sideNav").innerHTML = nav
    .map(
      (n, i) => `
        <a
          class="${i === 0 ? "active" : ""}"
          href="${esc(n.url)}"
        >
          ${
            i === 0
              ? "⌂"
              : i === 1
              ? "♧"
              : i === 2
              ? "◉"
              : i === 3
              ? "◇"
              : i === 4
              ? "⌕"
              : i === 5
              ? "♧"
              : "◌"
          }

          <span>${esc(n.label)}</span>
        </a>
      `
    )
    .join("");


  /*
   * HERO
   */
  const f = featured[0] || latest[0];

  $("hero").innerHTML = f
    ? heroCard(f, settings.hero_button)
    : "";


  /*
   * TRENDING NOW
   */
  $("trending").innerHTML = trending
    .map(
      t => `
        <a href="/?search=${encodeURIComponent(
          t.label.replace(/^#/, "")
        )}">
          ${esc(t.label)}
        </a>
      `
    )
    .join("");


  /*
   * TRENDING TOPICS
   */
  $("trendingBottom").innerHTML =
    $("trending").innerHTML;


  /*
   * NEWS CATEGORIES
   */
  $("categories").innerHTML = cats
    .map(
      c => `
        <li>
          <a href="/?category=${encodeURIComponent(c.slug)}">
            ${esc(c.name)}
          </a>
        </li>
      `
    )
    .join("");


  /*
   * UPCOMING EVENTS
   */
  $("events").innerHTML = events
    .map(
      e => `
        <div class="event">
          <strong>
            ${esc(e.day)}
            <span>${esc(e.month)}</span>
          </strong>

          <div>
            ${esc(e.title)}
            <small>${esc(e.details || "")}</small>
          </div>
        </div>
      `
    )
    .join("");


  /*
   * QUICK NEWS
   */
  $("quickGrid").innerHTML = latest
    .slice(0, 4)
    .map(
      (a, i) => `
        <a
          href="/article.html?slug=${encodeURIComponent(a.slug)}"
          class="quickCard"
        >
          <b>${String(i + 1).padStart(2, "0")}</b>
          <span>${esc(a.title)}</span>
        </a>
      `
    )
    .join("");


  /*
   * FILTER PILLS
   */
  $("filterPills").innerHTML =
    `<a class="selected" href="/">All stories</a>` +
    cats
      .map(
        c => `
          <a href="/?category=${encodeURIComponent(c.slug)}">
            ${esc(c.name)}
          </a>
        `
      )
      .join("");


  /*
   * HOMEPAGE SECTIONS
   *
   * ดึงข้อมูลจาก Admin เหมือนเดิม
   */
  $("sections").innerHTML = await Promise.all(
    sections.map(async s => {
      const a = await api(
        `/api/articles?category=${encodeURIComponent(
          s.category_slug || ""
        )}&limit=${s.article_limit || 2}`
      );

      return `
        <section class="newsSection">

          <div class="sectionTitle">
            <h2>${esc(s.title)}</h2>

            <a
              href="/?category=${encodeURIComponent(
                s.category_slug || ""
              )}"
            >
              See all
            </a>
          </div>

          <div class="newsGrid cols${Math.min(
            Math.max(Number(s.columns) || 2, 1),
            4
          )}">
            ${a.map(articleCard).join("")}
          </div>

        </section>
      `;
    })
  ).then(x => x.join(""));


  /*
   * FOOTER
   */
  $("footer").textContent =
    settings.footer_text ||
    "© Youth News · Stories for the next generation.";


  /*
   * URL PARAMETERS
   */
  const params = new URLSearchParams(
    location.search
  );


  /*
   * CATEGORY PAGE
   *
   * สำคัญ:
   * - ไม่ซ่อน Trending Now
   * - ไม่ซ่อน News Categories
   * - ไม่ซ่อน Upcoming Events
   * - ไม่ซ่อน Quick News
   * - ไม่ซ่อน Filter
   * - ไม่ซ่อน Trending Topics
   *
   * เปลี่ยนเฉพาะ #sections
   * ให้แสดงข่าวของหมวดที่เลือก
   */
  if (params.get("category")) {

    const categorySlug = params.get("category");

    const results = await api(
      "/api/articles?category=" +
      encodeURIComponent(categorySlug)
    );

    const category = cats.find(
      c => c.slug === categorySlug
    );

    $("sections").innerHTML = `
      <section class="newsSection">

        <div class="sectionTitle">
          <h2>
            ${esc(category?.name || "News")}
          </h2>
        </div>

        <div class="newsGrid cols2">

          ${
            results.map(articleCard).join("") ||
            "<p>No stories found.</p>"
          }

        </div>

      </section>
    `;
  }


  /*
   * SEARCH RESULTS
   */
  if (params.get("search")) {

    const results = await api(
      "/api/articles?search=" +
      encodeURIComponent(params.get("search"))
    );

    $("hero").innerHTML = "";

    $("sections").innerHTML = `
      <section class="newsSection">

        <div class="sectionTitle">
          <h2>Search results</h2>
        </div>

        <div class="newsGrid cols2">

          ${
            results.map(articleCard).join("") ||
            "<p>No stories found.</p>"
          }

        </div>

      </section>
    `;
  }


  /*
   * ALL STORIES
   */
  if (params.get("all")) {

    const results = await api(
      "/api/articles?limit=100"
    );

    $("hero").innerHTML = "";

    $("sections").innerHTML = `
      <section class="newsSection">

        <div class="sectionTitle">
          <h2>All stories</h2>
        </div>

        <div class="newsGrid cols2">

          ${
            results.map(articleCard).join("") ||
            "<p>No stories found.</p>"
          }

        </div>

      </section>
    `;
  }
}


/*
 * SEARCH FUNCTION
 */
function doSearch() {
  const q = $("searchInput").value.trim();

  if (q) {
    location.href =
      "/?search=" + encodeURIComponent(q);
  }
}


/*
 * START
 */
init().catch(e => {
  console.error(e);

  document.getElementById("hero").innerHTML = `
    <div class="heroCard">
      <div>
        <h1>Unable to load YouthNews</h1>
        <p>
          Check that the server is running and
          the API is available.
        </p>
      </div>
    </div>
  `;
});
