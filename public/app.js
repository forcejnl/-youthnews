/* ==========================================
   USER AUTH
========================================== */
let authMode = "login";
/* ---------- OPEN LOGIN / SIGN UP ---------- */
function openAuth(mode = "login") {
  authMode = mode;
  const modal = document.getElementById("authModal");
  const title = document.getElementById("authTitle");
  const subtitle = document.getElementById("authSubtitle");
  const submit = document.querySelector(".authSubmit");
  const switchText = document.getElementById("authSwitchText");
  const switchBtn = document.getElementById("authSwitchBtn");
  const error = document.getElementById("authError");
  if (!modal) {
    console.error("authModal not found");
    return;
  }
  if (error) {
    error.textContent = "";
  }
  if (authMode === "login") {
    title.textContent = "Welcome to YouthNews";
    subtitle.textContent = "Log in to your account";
    submit.textContent = "Log in";
    switchText.textContent = "Don't have an account?";
    switchBtn.textContent = "Sign up";
  } else {
    title.textContent = "Join YouthNews";
    subtitle.textContent = "Create your account";
    submit.textContent = "Sign up";
    switchText.textContent = "Already have an account?";
    switchBtn.textContent = "Log in";
  }
  modal.classList.remove("hidden");
}
/* ---------- CLOSE AUTH ---------- */
function closeAuth() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.add("hidden");
  }
  const error = document.getElementById("authError");
  if (error) {
    error.textContent = "";
  }
}
/* ---------- SWITCH LOGIN / SIGN UP ---------- */
function toggleAuthMode() {
  openAuth(
    authMode === "login"
      ? "signup"
      : "login"
  );
}
/* ---------- EMAIL LOGIN / SIGN UP ---------- */
async function submitAuth() {
  const emailElement =
    document.getElementById("authEmail");
  const passwordElement =
    document.getElementById("authPassword");
  const error =
    document.getElementById("authError");
  const email =
    emailElement.value.trim();
  const password =
    passwordElement.value;
  error.textContent = "";
  if (!email || !password) {
    error.textContent =
      "Please enter your email and password.";
    return;
  }
  try {
    /* LOGIN */
    if (authMode === "login") {
      const { error: authError } =
        await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });
      if (authError) {
        throw authError;
      }
      closeAuth();
      await updateUserUI();
      return;
    }
    /* SIGN UP */
    const { data, error: authError } =
      await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo:
            window.location.origin
        }
      });
    if (authError) {
      throw authError;
    }
    if (!data.session) {
      error.textContent =
        "Account created. Please check your email to confirm your account.";
    } else {
      closeAuth();
      await updateUserUI();
    }
  } catch (e) {
    console.error("Authentication error:", e);
    error.textContent =
      e.message ||
      "Authentication failed.";
  }
}
/* ==========================================
   GOOGLE LOGIN
========================================== */
async function googleLogin() {
  const error =
    document.getElementById("authError");
  if (error) {
    error.textContent = "";
  }
  try {
    const { data, error: authError } =
      await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            window.location.origin
        }
      });
    if (authError) {
      throw authError;
    }
    console.log(
      "Google OAuth started:",
      data
    );
  } catch (e) {
    console.error(
      "Google login error:",
      e
    );
    if (error) {
      error.textContent =
        e.message ||
        "Google login failed.";
    }
  }
}
/* ==========================================
   UPDATE USER AREA
========================================== */
async function updateUserUI() {
  const userArea =
    document.getElementById("userArea");
  if (!userArea) {
    return;
  }
  try {
    const {
      data: { user },
      error
    } =
      await supabaseClient.auth.getUser();
    if (error) {
      console.error(
        "Get user error:",
        error
      );
      showLoggedOutUI();
      return;
    }
    /* NOT LOGGED IN */
    if (!user) {
      showLoggedOutUI();
      return;
    }
    /* LOGGED IN */
    const email =
      user.email || "User";
    userArea.innerHTML = `
      <div class="userLogged">
        <span class="userEmail">
          ${esc(email)}
        </span>
        <button
          type="button"
          onclick="userLogout()"
        >
          Sign out
        </button>
      </div>
    `;
  } catch (e) {
    console.error(
      "updateUserUI error:",
      e
    );
    showLoggedOutUI();
  }
}
/* ---------- LOGGED OUT UI ---------- */
function showLoggedOutUI() {
  const userArea =
    document.getElementById("userArea");
  if (!userArea) {
    return;
  }
  userArea.innerHTML = `
    <button
      type="button"
      onclick="openAuth('login')"
    >
      Log in
    </button>
  `;
}
/* ==========================================
   LOGOUT
========================================== */
async function userLogout() {
  try {
    const { error } =
      await supabaseClient.auth.signOut();
    if (error) {
      throw error;
    }
    await updateUserUI();
  } catch (e) {
    console.error(
      "Logout error:",
      e
    );
  }
}
/* ==========================================
   AUTH STATE LISTENER
========================================== */

supabaseClient.auth.onAuthStateChange(
  (event, session) => {

    console.log("Auth event:", event);
    console.log("Session:", session);

    if (
      event === "INITIAL_SESSION" ||
      event === "SIGNED_IN" ||
      event === "SIGNED_OUT" ||
      event === "USER_UPDATED" ||
      event === "TOKEN_REFRESHED"
    ) {
      setTimeout(() => {
        updateUserUI();
      }, 100);
    }
  }
);


/* ==========================================
   CHECK USER SESSION
========================================== */

async function checkUserSession() {
  try {

    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "Session error:",
        error
      );
      return;
    }

    console.log(
      "Current session:",
      session
    );

    await updateUserUI();

  } catch (e) {

    console.error(
      "Check session error:",
      e
    );

  }
}
/* ==========================================
   GENERAL HELPERS
========================================== */
const $ =
  id => document.getElementById(id);
const esc =
  s =>
    String(s ?? "").replace(
      /[&<>"']/g,
      m =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[m])
    );
async function api(u) {
  const r =
    await fetch(u);
  if (!r.ok) {
    throw new Error("API error");
  }
  return r.json();
}
/* ==========================================
   ARTICLE CARD
========================================== */
function articleCard(a) {
  return `
    <a
      class="newsCard"
      href="/article.html?slug=${encodeURIComponent(a.slug)}"
    >
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
          }
          min read ·
          ${
            a.published_at
              ? new Date(
                  a.published_at
                ).toLocaleDateString(
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
/* ==========================================
   HERO CARD
========================================== */
function heroCard(a, button) {
  return `
    <article
      class="heroCard"
      ${
        a.image
          ? `style="
              background-image:
              linear-gradient(
                90deg,
                rgba(10,18,12,.2),
                rgba(0,0,0,.8)
              ),
              url('${esc(a.image)}')
            "`
          : ""
      }
    >
      <div>
        <span class="limeTag">
          ${esc(
            a.category_name ||
            "FEATURED"
          )}
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
/* ==========================================
   LOAD WEBSITE
========================================== */
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
    api(
      "/api/articles?featured=1&limit=3"
    ),
    api(
      "/api/articles?limit=8"
    )
  ]);
  /* SEARCH */
  $("searchInput").placeholder =
    settings.search_placeholder ||
    "Search news, people, or topics...";
  /* SIDE NAV */
  $("sideNav").innerHTML =
    nav
      .map(
        (n, i) =>
          `<a
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
            <span>
              ${esc(n.label)}
            </span>
          </a>`
      )
      .join("");
  /* HERO */
  const f =
    featured[0] ||
    latest[0];
  $("hero").innerHTML =
    f
      ? heroCard(
          f,
          settings.hero_button
        )
      : "";
  /* TRENDING */
  $("trending").innerHTML =
    trending
      .map(
        t =>
          `<a
            href="/?search=${encodeURIComponent(
              t.label.replace(/^#/, "")
            )}"
          >
            ${esc(t.label)}
          </a>`
      )
      .join("");
  $("trendingBottom").innerHTML =
    $("trending").innerHTML;
  /* CATEGORIES */
  $("categories").innerHTML =
    cats
      .map(
        c =>
          `<li>
            <a
              href="/?category=${encodeURIComponent(
                c.slug
              )}"
            >
              ${esc(c.name)}
            </a>
          </li>`
      )
      .join("");
  /* EVENTS */
  $("events").innerHTML =
    events
      .map(
        e =>
          `<div class="event">
            <strong>
              ${esc(e.day)}
              <span>
                ${esc(e.month)}
              </span>
            </strong>
            <div>
              ${esc(e.title)}
              <small>
                ${esc(e.details || "")}
              </small>
            </div>
          </div>`
      )
      .join("");
  /* QUICK NEWS */
  $("quickGrid").innerHTML =
    latest
      .slice(0, 4)
      .map(
        (a, i) =>
          `<a
            href="/article.html?slug=${encodeURIComponent(
              a.slug
            )}"
            class="quickCard"
          >
            <b>
              ${String(i + 1).padStart(2, "0")}
            </b>
            <span>
              ${esc(a.title)}
            </span>
          </a>`
      )
      .join("");
  /* FILTER PILLS */
  $("filterPills").innerHTML =
    `<a
      class="selected"
      href="/"
    >
      All stories
    </a>` +
    cats
      .map(
        c =>
          `<a
            href="/?category=${encodeURIComponent(
              c.slug
            )}"
          >
            ${esc(c.name)}
          </a>`
      )
      .join("");
  /* HOMEPAGE SECTIONS */
  $("sections").innerHTML =
    await Promise.all(
      sections.map(
        async s => {
          const a =
            await api(
              `/api/articles?category=${encodeURIComponent(
                s.category_slug || ""
              )}&limit=${s.article_limit || 2}`
            );
          return `
            <section class="newsSection">
              <div class="sectionTitle">
                <h2>
                  ${esc(s.title)}
                </h2>
                <a
                  href="/?category=${encodeURIComponent(
                    s.category_slug || ""
                  )}"
                >
                  See all
                </a>
              </div>
              <div
                class="newsGrid cols${Math.min(
                  Math.max(
                    Number(s.columns) || 2,
                    1
                  ),
                  4
                )}"
              >
                ${a
                  .map(articleCard)
                  .join("")}
              </div>
            </section>
          `;
        }
      )
    )
    .then(x => x.join(""));
  /* FOOTER */
  $("footer").textContent =
    settings.footer_text ||
    "© Youth News · Stories for the next generation.";
  /* SEARCH / CATEGORY / ALL */
  const params =
    new URLSearchParams(
      location.search
    );
  if (
    params.get("search") ||
    params.get("category") ||
    params.get("all")
  ) {
    const query =
      params.get("search")
        ? `?search=${encodeURIComponent(
            params.get("search")
          )}`
        : params.get("category")
        ? `?category=${encodeURIComponent(
            params.get("category")
          )}`
        : "?limit=100";
    const results =
      await api(
        "/api/articles" + query
      );
    $("hero").innerHTML = "";
    $("sections").innerHTML = `
      <section class="newsSection">
        <div class="sectionTitle">
          <h2>
            ${
              params.get("search")
                ? "Search results"
                : "All stories"
            }
          </h2>
        </div>
        <div class="newsGrid cols2">
          ${
            results
              .map(articleCard)
              .join("") ||
            "<p>No stories found.</p>"
          }
        </div>
      </section>
    `;
  }
}
/* ==========================================
   SEARCH
========================================== */
function doSearch() {
  const q =
    $("searchInput")
      .value
      .trim();
  if (q) {
    location.href =
      "/?search=" +
      encodeURIComponent(q);
  }
}
/* ==========================================
   START
========================================== */

Promise.all([
  init(),
  checkUserSession()
])
  .catch(e => {

    console.error(e);

    document.getElementById(
      "hero"
    ).innerHTML = `
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

  });
