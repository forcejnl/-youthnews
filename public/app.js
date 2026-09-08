const $ = id => document.getElementById(id);

const esc = s =>
String(s ?? “”).replace(
/[&<>”’]/g,
m => ({
“&”: “&”,
“<”: “<”,
“>”: “>”,
‘”’: “"”,
“’”: “'”
}[m])
);

async function api(url) {
const r = await fetch(url);

if (!r.ok) {
throw new Error(“API error”);
}

return r.json();
}

/* =========================
ARTICLE CARD
========================= */

function articleCard(a) {

return `
  <div class="thumb">
    ${
      a.image
        ? `<img src="${esc(a.image)}">`
        : ""
    }
  </div>
  <div class="newsInfo">
    <b>
      ${esc(a.category_name || "NEWS")}
    </b>
    <h3>
      ${esc(a.title)}
    </h3>
    <small>
      ${
        Math.max(
          1,
          Math.ceil(
            String(a.content || "")
              .split(/\s+/)
              .length / 180
          )
        )
      } min read
      ·
      ${
        a.published_at
          ? new Date(a.published_at).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric"
              }
            )
          : "Today"
      }
    </small>
  </div>
</a>

`;
}

/* =========================
HERO CARD
========================= */

function heroCard(a, button) {

return `
<article
class=“heroCard”

  ${
    a.image
      ? `style="background-image:
          linear-gradient(
            90deg,
            rgba(10,18,12,.2),
            rgba(0,0,0,.8)
          ),
          url('${esc(a.image)}')"`
      : ""
  }
>
  <div>
    <span class="limeTag">
      ${esc(a.category_name || "FEATURED")}
    </span>
    <h1>
      ${esc(a.title)}
    </h1>
    <p>
      ${esc(a.excerpt || "")}
    </p>
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

/* =========================
INIT
========================= */

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

/* =========================
URL PARAMETERS
========================= */

const params =
new URLSearchParams(location.search);

const categorySlug =
params.get(“category”);

const searchQuery =
params.get(“search”);

const allStories =
params.get(“all”);

/* =========================
SEARCH
========================= */

$(“searchInput”).placeholder =
settings.search_placeholder ||
“Search news, people, or topics…”;

/* =========================
LEFT NAVIGATION
========================= */

$(“sideNav”).innerHTML = nav
.map((n, i) => {

  const isHome =
    !categorySlug &&
    !searchQuery &&
    !allStories &&
    (n.url === "/" || n.url === "");
  const isCategory =
    categorySlug &&
    n.url &&
    n.url.includes(
      "category=" +
      encodeURIComponent(categorySlug)
    );
  const active =
    isHome || isCategory
      ? "active"
      : "";
  return `
    <a
      class="${active}"
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
      <span>
        ${esc(n.label)}
      </span>
    </a>
  `;
})
.join("");

/* =========================
HERO
========================= */

const f =
featured[0] ||
latest[0];

$(“hero”).innerHTML =
f
? heroCard(
f,
settings.hero_button
)
: “”;

/* =========================
TRENDING NOW
========================= */

$(“trending”).innerHTML =
trending
.map(
t => <a href="/?search=${encodeURIComponent( String(t.label || "").replace(/^#/, "") )}" > ${esc(t.label)} </a>
)
.join(””);

/* =========================
TRENDING BOTTOM
========================= */

$(“trendingBottom”).innerHTML =
`
🔥 TRENDING TOPICS

  <div class="pills">
    ${
      trending
        .map(
          t => `
            <a
              href="/?search=${encodeURIComponent(
                String(t.label || "").replace(/^#/, "")
              )}"
            >
              ${esc(t.label)}
            </a>
          `
        )
        .join("")
    }
  </div>
`;

/* =========================
NEWS CATEGORIES
========================= */

$(“categories”).innerHTML =
cats
.map(
c => `
        <a
          href="/?category=${encodeURIComponent(c.slug)}"
        >
          ${esc(c.name)}
        </a>
      </li>
    `
  )
  .join("");

/* =========================
UPCOMING EVENTS
========================= */

$(“events”).innerHTML =
events
.map(e => {

    let dateText = "";
    if (e.event_date) {
      const d =
        new Date(
          e.event_date + "T00:00:00"
        );
      dateText =
        d.toLocaleDateString(
          "en-US",
          {
            day: "numeric"
          }
        );
    }
    let monthText = "";
    if (e.event_date) {
      const d =
        new Date(
          e.event_date + "T00:00:00"
        );
      monthText =
        d.toLocaleDateString(
          "en-US",
          {
            month: "short"
          }
        ).toUpperCase();
    }
    return `
      <div class="event">
        <strong>
          ${esc(dateText)}
          <span>
            ${esc(monthText)}
          </span>
        </strong>
        <div>
          ${esc(e.title)}
          <small>
            ${
              e.event_time
                ? esc(e.event_time)
                : ""
            }
            ${
              e.location
                ? " · " + esc(e.location)
                : ""
            }
            ${
              e.description
                ? " · " + esc(e.description)
                : ""
            }
          </small>
        </div>
      </div>
    `;
  })
  .join("");

/* =========================
QUICK NEWS
========================= */

$(“quickGrid”).innerHTML =
latest
.slice(0, 4)
.map(
(a, i) => `
        <b>
          ${String(i + 1).padStart(2, "0")}
        </b>
        <span>
          ${esc(a.title)}
        </span>
      </a>
    `
  )
  .join("");

/* =========================
FILTER PILLS
========================= */

$(“filterPills”).innerHTML =

`
  <a
    class="${!categorySlug && !searchQuery && !allStories ? "selected" : ""}"
    href="/"
  >
    All stories
  </a>
`
+
cats
  .map(
    c => `
      <a
        class="${
          categorySlug === c.slug
            ? "selected"
            : ""
        }"
        href="/?category=${encodeURIComponent(c.slug)}"
      >
        ${esc(c.name)}
      </a>
    `
  )
  .join("");

/* =========================
HOMEPAGE SECTIONS
========================= */

$(“sections”).innerHTML =
await Promise.all(

  sections.map(
    async s => {
      const category =
        s.category_slug
          ? `&category=${encodeURIComponent(
              s.category_slug
            )}`
          : "";
      const a =
        await api(
          `/api/articles?limit=${
            s.article_limit || 2
          }${category}`
        );
      return `
        <section class="newsSection">
          <div class="sectionTitle">
            <h2>
              ${esc(s.title)}
            </h2>
            ${
              s.category_slug
                ? `
                  <a
                    href="/?category=${encodeURIComponent(
                      s.category_slug
                    )}"
                  >
                    See all
                  </a>
                `
                : ""
            }
          </div>
          <div
            class="newsGrid cols${Math.min(
              Math.max(
                Number(
                  s.columns_count
                ) || 2,
                1
              ),
              4
            )}"
          >
            ${
              a.map(articleCard).join("")
              ||
              "<p>No stories found.</p>"
            }
          </div>
        </section>
      `;
    }
  )
)
.then(x => x.join(""));

/* =========================
FOOTER
========================= */

$(“footer”).textContent =
settings.footer_text ||
“© Youth News · Stories for the next generation.”;

/* =====================================================
CATEGORY PAGE
===================================================== */

if (categorySlug) {

const results =
  await api(
    "/api/articles?category=" +
    encodeURIComponent(categorySlug)
  );
const category =
  cats.find(
    c => c.slug === categorySlug
  );
/*
 * IMPORTANT
 *
 * We only replace #sections.
 *
 * We DO NOT remove:
 * - Trending Now
 * - News Categories
 * - Upcoming Events
 * - Quick News
 * - Filter Pills
 * - Trending Topics
 */
$("sections").innerHTML = `
  <section class="newsSection">
    <div class="sectionTitle">
      <h2>
        ${esc(
          category?.name ||
          "News"
        )}
      </h2>
    </div>
    <div class="newsGrid cols2">
      ${
        results.map(articleCard).join("")
        ||
        "<p>No stories found.</p>"
      }
    </div>
  </section>
`;

}

/* =====================================================
SEARCH PAGE
===================================================== */

if (searchQuery) {

const results =
  await api(
    "/api/articles?search=" +
    encodeURIComponent(searchQuery)
  );
$("hero").innerHTML = "";
$("sections").innerHTML = `
  <section class="newsSection">
    <div class="sectionTitle">
      <h2>
        Search results
      </h2>
    </div>
    <div class="newsGrid cols2">
      ${
        results.map(articleCard).join("")
        ||
        "<p>No stories found.</p>"
      }
    </div>
  </section>
`;

}

/* =====================================================
ALL STORIES
===================================================== */

if (allStories) {

const results =
  await api(
    "/api/articles?limit=100"
  );
$("hero").innerHTML = "";
$("sections").innerHTML = `
  <section class="newsSection">
    <div class="sectionTitle">
      <h2>
        All stories
      </h2>
    </div>
    <div class="newsGrid cols2">
      ${
        results.map(articleCard).join("")
        ||
        "<p>No stories found.</p>"
      }
    </div>
  </section>
`;

}

}

/* =========================
SEARCH
========================= */

function doSearch() {

const q =
$(“searchInput”).value.trim();

if (!q) return;

location.href =
“/?search=” +
encodeURIComponent(q);

}

/* =========================
START
========================= */

init().catch(e => {

console.error(e);

const hero =
document.getElementById(“hero”);

if (hero) {

hero.innerHTML = `
  <div class="heroCard">
    <div>
      <h1>
        Unable to load YouthNews
      </h1>
      <p>
        Check that the server is running
        and the API is available.
      </p>
    </div>
  </div>
`;

}

});
