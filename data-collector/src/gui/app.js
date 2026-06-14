// ===========================
// Glowist Scraper view (secondary)
// Relies on auth.js for authedFetch / getToken / toast / esc.
// ===========================

const SELECTOR_FIELDS = [
  { key: 'name', label: 'Product Name', placeholder: 'h1.product-title' },
  { key: 'brand', label: 'Brand', placeholder: '.brand-name' },
  { key: 'description', label: 'Description', placeholder: '.product-description' },
  { key: 'image', label: 'Image (img element)', placeholder: '.product-image img' },
  { key: 'ingredients', label: 'Ingredients', placeholder: '.ingredients-list' },
  { key: 'size', label: 'Size', placeholder: '.product-size' },
  { key: 'howToUse', label: 'How To Use', placeholder: '.how-to-use' },
  { key: 'claims', label: 'Claims / Badges', placeholder: '.product-badges span' },
  { key: 'spf', label: 'SPF', placeholder: '.product-spf' },
  { key: 'shelfLife', label: 'Shelf Life', placeholder: '.product-pao' },
  { key: 'category', label: 'Category (breadcrumbs)', placeholder: 'nav.breadcrumb' },
];

let editingId = null;
let scraperSSE = null;

window.ScraperView = {
  init() {
    buildSelectorFields();
    loadSites();
    loadResults();
    connectSSE();
  },
};

// ── Site Grid ──
async function loadSites() {
  const res = await authedFetch('/api/sites');
  const sites = await res.json();
  const grid = document.getElementById('sitesGrid');

  if (sites.length === 0) {
    grid.innerHTML = `<div class="empty-state card"><div class="empty-state-icon">&#128270;</div><div class="empty-state-text">No sites registered yet. Click "Add Site" to get started.</div></div>`;
    return;
  }

  grid.innerHTML = sites.map(site => `
    <div class="card site-card">
      <div class="site-card-header">
        <span class="site-card-name">${esc(site.name)}</span>
        <span class="site-card-badge">${esc(site.strategy)}</span>
      </div>
      <div class="site-card-url">${esc(site.baseUrl)}</div>
      <div class="site-card-meta">
        <span>&#128196; Max ${site.listing?.maxProducts ?? '?'} products</span>
        <span>&#9201; ${site.rateLimit?.delayMs ?? 2000}ms delay</span>
      </div>
      <div class="site-card-output">
        <label class="form-label" style="margin-bottom:4px;">Output</label>
        <select class="form-input form-select" id="output-${esc(site.id)}" style="font-size:12px;padding:5px 8px;">
          <option value="json">JSON File</option>
          <option value="supabase">Supabase DB</option>
          <option value="both">Both</option>
        </select>
      </div>
      <div class="site-card-actions">
        <button class="btn btn-success btn-sm" onclick="startScrape('${esc(site.id)}')">&#9654; Scrape</button>
        <button class="btn btn-secondary btn-sm" onclick="editSite('${esc(site.id)}')">&#9998; Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteSite('${esc(site.id)}')">&#128465; Delete</button>
      </div>
    </div>
  `).join('');
}

// ── Results Table ──
async function loadResults() {
  const res = await authedFetch('/api/scrape/results');
  const results = await res.json();
  const body = document.getElementById('resultsBody');

  if (results.length === 0) {
    body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px;">No results yet</td></tr>';
    return;
  }

  body.innerHTML = results.map(r => `
    <tr>
      <td><code style="font-size:11px;">${esc(r.filename)}</code></td>
      <td>${esc(r.site)}</td>
      <td><strong>${r.productCount}</strong></td>
      <td>${r.errorCount > 0 ? `<span style="color:var(--error)">${r.errorCount}</span>` : '0'}</td>
      <td style="font-size:12px;color:var(--text-secondary)">${r.scrapedAt ? new Date(r.scrapedAt).toLocaleString() : '—'}</td>
    </tr>
  `).join('');
}

// ── Editor ──
function buildSelectorFields() {
  const container = document.getElementById('selectorsContainer');
  container.innerHTML = SELECTOR_FIELDS.map(f => `
    <div class="form-group">
      <label class="form-label">${f.label}</label>
      <input class="form-input" name="selectors.${f.key}" placeholder="${f.placeholder}" />
    </div>
  `).join('');
}

function showEditor(site = null) {
  editingId = site?.id ?? null;
  document.getElementById('scraperDashboard').style.display = 'none';
  document.getElementById('editor').classList.add('active');
  document.getElementById('editorTitle').textContent = site ? `Edit: ${site.name}` : 'Add New Site';

  const form = document.getElementById('siteForm');
  form.reset();

  if (site) {
    setFormValue(form, 'id', site.id);
    form.querySelector('[name="id"]').disabled = true;
    setFormValue(form, 'name', site.name);
    setFormValue(form, 'baseUrl', site.baseUrl);
    setFormValue(form, 'strategy', site.strategy);
    setFormValue(form, 'listing.urlTemplate', site.listing?.urlTemplate);
    setFormValue(form, 'listing.productLinkSelector', site.listing?.productLinkSelector);
    setFormValue(form, 'listing.maxPages', site.listing?.maxPages);
    setFormValue(form, 'listing.maxProducts', site.listing?.maxProducts);
    setFormValue(form, 'rateLimit.concurrency', site.rateLimit?.concurrency ?? 1);
    setFormValue(form, 'rateLimit.delayMs', site.rateLimit?.delayMs ?? 2000);

    if (site.selectors) {
      for (const [key, val] of Object.entries(site.selectors)) {
        setFormValue(form, `selectors.${key}`, val);
      }
    }

    const list = document.getElementById('preactionsList');
    list.innerHTML = '';
    if (site.preActions?.length) {
      site.preActions.forEach(a => addPreaction(a));
    }
  } else {
    form.querySelector('[name="id"]').disabled = false;
    document.getElementById('preactionsList').innerHTML = '';
  }
}

function hideEditor() {
  document.getElementById('editor').classList.remove('active');
  document.getElementById('scraperDashboard').style.display = '';
  editingId = null;
}

async function editSite(id) {
  const res = await authedFetch(`/api/sites/${id}`);
  const site = await res.json();
  showEditor(site);
}

async function saveSite() {
  const form = document.getElementById('siteForm');
  const config = {
    id: getFormValue(form, 'id'),
    name: getFormValue(form, 'name'),
    baseUrl: getFormValue(form, 'baseUrl'),
    strategy: getFormValue(form, 'strategy'),
    listing: {
      urlTemplate: getFormValue(form, 'listing.urlTemplate'),
      productLinkSelector: getFormValue(form, 'listing.productLinkSelector'),
      maxPages: parseInt(getFormValue(form, 'listing.maxPages')) || 5,
      maxProducts: parseInt(getFormValue(form, 'listing.maxProducts')) || 50,
    },
    selectors: {},
    preActions: getPreactions(),
    rateLimit: {
      concurrency: parseInt(getFormValue(form, 'rateLimit.concurrency')) || 1,
      delayMs: parseInt(getFormValue(form, 'rateLimit.delayMs')) || 2000,
    },
  };

  for (const f of SELECTOR_FIELDS) {
    config.selectors[f.key] = getFormValue(form, `selectors.${f.key}`);
  }

  if (!config.id || !config.name || !config.baseUrl) {
    toast('Please fill in ID, Name, and Base URL', 'error');
    return;
  }

  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? `/api/sites/${editingId}` : '/api/sites';

  const res = await authedFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (res.ok) {
    toast(`Site "${config.name}" saved!`, 'success');
    hideEditor();
    loadSites();
  } else {
    const err = await res.json();
    toast(err.error || 'Failed to save', 'error');
  }
}

async function deleteSite(id) {
  if (!confirm(`Delete site "${id}"?`)) return;
  await authedFetch(`/api/sites/${id}`, { method: 'DELETE' });
  toast('Site deleted', 'success');
  loadSites();
}

// ── Pre-actions ──
function addPreaction(data = null) {
  const list = document.getElementById('preactionsList');
  const row = document.createElement('div');
  row.className = 'preaction-row';
  row.innerHTML = `
    <select class="form-input form-select" style="width:110px" data-field="type">
      <option value="click" ${data?.type === 'click' ? 'selected' : ''}>Click</option>
      <option value="scroll" ${data?.type === 'scroll' ? 'selected' : ''}>Scroll</option>
      <option value="wait" ${data?.type === 'wait' ? 'selected' : ''}>Wait</option>
    </select>
    <input class="form-input" data-field="selector" placeholder="Selector (optional)" value="${esc(data?.selector ?? '')}" />
    <input class="form-input" data-field="timeout" type="number" placeholder="Timeout ms" value="${data?.timeout ?? ''}" style="width:100px" />
    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">&#10005;</button>
  `;
  list.appendChild(row);
}

function getPreactions() {
  const rows = document.querySelectorAll('#preactionsList .preaction-row');
  return Array.from(rows).map(row => {
    const obj = { type: row.querySelector('[data-field="type"]').value };
    const sel = row.querySelector('[data-field="selector"]').value.trim();
    const timeout = parseInt(row.querySelector('[data-field="timeout"]').value);
    if (sel) obj.selector = sel;
    if (!isNaN(timeout)) obj.timeout = timeout;
    return obj;
  });
}

// ── Scrape ──
async function startScrape(siteId) {
  const outputSelect = document.getElementById(`output-${siteId}`);
  const output = outputSelect ? outputSelect.value : 'json';

  const res = await authedFetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, output }),
  });

  if (res.ok) {
    toast(`Scrape started for ${siteId}`, 'success');
    showProgress(siteId);
  } else {
    const err = await res.json();
    toast(err.error || 'Scrape failed to start', 'error');
  }
}

function showProgress(siteId) {
  const bar = document.getElementById('progressBar');
  bar.classList.add('active');
  document.getElementById('progressSite').textContent = `Scraping: ${siteId}`;
  document.getElementById('progressPercent').textContent = '...';
  document.getElementById('progressFill').style.width = '10%';
  document.getElementById('progressStatus').textContent = 'Starting scrape...';
}

// ── SSE ──
function connectSSE() {
  if (scraperSSE) return; // already connected
  const token = getToken();
  scraperSSE = new EventSource(`/api/scrape/status?token=${encodeURIComponent(token || '')}`);
  scraperSSE.onmessage = (e) => {
    const data = JSON.parse(e.data);
    const bar = document.getElementById('progressBar');

    if (data.type === 'started') {
      showProgress(data.siteId);
    } else if (data.type === 'complete') {
      document.getElementById('progressPercent').textContent = '100%';
      document.getElementById('progressFill').style.width = '100%';
      document.getElementById('progressStatus').textContent =
        `Done! ${data.stats.normalized} products, ${data.stats.failed} errors in ${(data.stats.durationMs / 1000).toFixed(1)}s`;
      setTimeout(() => { bar.classList.remove('active'); loadResults(); }, 4000);
    } else if (data.type === 'error') {
      document.getElementById('progressStatus').textContent = `Error: ${data.error}`;
      document.getElementById('progressFill').style.background = 'var(--error)';
      setTimeout(() => bar.classList.remove('active'), 5000);
    } else if (data.type === 'state' && data.running) {
      showProgress(data.siteId);
    }
  };
}

// ── Selector Test ──
async function testSelector() {
  const url = document.getElementById('testUrl').value.trim();
  const selector = document.getElementById('testSelector').value.trim();
  const strategy = document.querySelector('[name="strategy"]').value;
  const resultDiv = document.getElementById('testResult');

  if (!url || !selector) {
    resultDiv.innerHTML = '<span class="error">Enter both URL and selector</span>';
    resultDiv.classList.add('active');
    return;
  }

  resultDiv.innerHTML = 'Testing...';
  resultDiv.classList.add('active');

  try {
    const res = await authedFetch('/api/test-selector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, selector, strategy }),
    });
    const data = await res.json();

    if (data.error) {
      resultDiv.innerHTML = `<span class="error">${esc(data.error)}</span>`;
    } else {
      resultDiv.innerHTML = `<div class="count">${data.count} element(s) found</div>` +
        data.texts.map(t => `<div class="text-item">${esc(t)}</div>`).join('');
    }
  } catch (err) {
    resultDiv.innerHTML = `<span class="error">${esc(err.message)}</span>`;
  }
}

// ── Scraper form helpers (scoped to the site form) ──
function setFormValue(form, name, value) {
  const el = form.querySelector(`[name="${name}"]`);
  if (el) el.value = value ?? '';
}

function getFormValue(form, name) {
  const el = form.querySelector(`[name="${name}"]`);
  return el?.value?.trim() ?? '';
}
