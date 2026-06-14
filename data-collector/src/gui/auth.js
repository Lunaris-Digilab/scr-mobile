// ===========================
// Auth + shell navigation
// ===========================

const TOKEN_KEY = 'glowist_admin_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

// Fetch wrapper that attaches the bearer token and handles auth failures.
async function authedFetch(url, opts = {}) {
  const token = getToken();
  const headers = Object.assign({}, opts.headers, token ? { Authorization: `Bearer ${token}` } : {});
  const res = await fetch(url, Object.assign({}, opts, { headers }));
  if (res.status === 401) {
    setToken(null);
    showLogin();
    throw new Error('Oturum sona erdi, tekrar giriş yap');
  }
  return res;
}

// JSON helper: returns parsed body or throws with server error message.
async function apiJson(url, opts) {
  const res = await authedFetch(url, opts);
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error(body?.error || `İstek başarısız (${res.status})`);
  return body;
}

// ── Screens ──
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appShell').style.display = 'none';
}

function showApp(email) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  document.getElementById('currentUser').textContent = email || '';
  switchView('products');
}

// ── View switching (lazy init per view) ──
const viewInitDone = {};
function switchView(view) {
  document.querySelectorAll('.nav-item').forEach((b) =>
    b.classList.toggle('active', b.dataset.view === view),
  );
  document.querySelectorAll('.view').forEach((v) =>
    v.classList.toggle('active', v.id === `view-${view}`),
  );

  const initers = {
    products: () => window.ProductsView?.init(),
    brands: () => window.BrandsView?.init(),
    ingredients: () => window.IngredientsView?.init(),
    scraper: () => window.ScraperView?.init(),
  };
  // products re-loads each time (fresh list); others init once.
  if (view === 'products') {
    window.ProductsView?.init();
  } else if (!viewInitDone[view]) {
    viewInitDone[view] = true;
    initers[view]?.();
  }
}

// ── Login flow ──
async function doLogin(e) {
  e?.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'E-posta ve şifre gerekli'; return; }

  btn.disabled = true;
  btn.textContent = 'Giriş yapılıyor…';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) { errEl.textContent = body?.error || 'Giriş başarısız'; return; }
    setToken(body.access_token);
    showApp(body.email);
  } catch (err) {
    errEl.textContent = 'Bağlantı hatası';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Giriş yap';
  }
}

function logout() {
  setToken(null);
  // reset one-time view init so they reload after next login
  for (const k of Object.keys(viewInitDone)) delete viewInitDone[k];
  showLogin();
}

// ── Toast ──
function toast(message, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── HTML escape ──
function esc(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('loginForm').addEventListener('submit', doLogin);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.querySelectorAll('.nav-item').forEach((b) =>
    b.addEventListener('click', () => switchView(b.dataset.view)),
  );

  // Restore session if a token exists and is still valid.
  if (getToken()) {
    try {
      const me = await apiJson('/api/auth/me');
      showApp(me?.email);
      return;
    } catch { /* fall through to login */ }
  }
  showLogin();
});
