// ===========================
// Products / Brands / Ingredients views
// ===========================

const PAGE_SIZE = 25;

const SIZE_UNITS = ['ml', 'g', 'oz', 'fl_oz', 'pcs'];
const TEXTURES = ['cream', 'gel', 'liquid', 'foam', 'oil', 'balm', 'serum', 'mist', 'paste', 'powder', 'lotion', 'spray', 'stick', 'patch', 'other'];
const USAGE_FREQUENCIES = ['daily', 'twice_daily', 'weekly', 'as_needed'];
const USAGE_TIMES = ['AM', 'PM', 'both'];
const TARGET_AREAS = ['face', 'eye', 'lip', 'body', 'hand', 'hair', 'nail', 'scalp', 'full_body'];

const FLAG_FIELDS = ['is_cruelty_free', 'is_vegan', 'is_fragrance_free', 'is_paraben_free', 'is_alcohol_free', 'is_private'];
const NUMBER_FIELDS = ['size_value', 'spf', 'ph_level', 'shelf_life_months'];
const TEXT_FIELDS = ['name', 'barcode', 'image_url', 'description', 'ingredients_text', 'usage_instructions', 'country_of_origin'];
const ENUM_FIELDS = ['size_unit', 'texture', 'usage_frequency', 'usage_time', 'target_area', 'category_id', 'company_id'];

let pState = { page: 0, total: 0, search: '', categoryId: '' };
let categoriesCache = [];
let companiesCache = [];
let skinTypesCache = [];
let concernsCache = [];
let ingredientTags = [];
let editingId = null;
let wired = false;

window.ProductsView = { init: initProducts };

async function initProducts() {
  showProductsList();
  if (!wired) {
    try {
      await loadTaxonomy();
      buildFormControls();
      wireControls();
      wired = true;
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
  }
  await loadProducts();
}

// ── Taxonomy ──
async function loadTaxonomy() {
  const [cats, companies, skins, concerns] = await Promise.all([
    apiJson('/api/categories'),
    apiJson('/api/companies?all=1'),
    apiJson('/api/skin-types'),
    apiJson('/api/skin-concerns'),
  ]);
  categoriesCache = cats || [];
  companiesCache = companies || [];
  skinTypesCache = skins || [];
  concernsCache = concerns || [];
}

function buildFormControls() {
  // Category filter + form select
  const filter = document.getElementById('productCategoryFilter');
  const formSelect = pField('category_id');
  for (const c of categoriesCache) {
    filter.appendChild(opt(c.id, c.name));
    formSelect.appendChild(opt(c.id, c.name));
  }
  // Brand select (registered companies only)
  const brandSelect = pField('company_id');
  for (const c of companiesCache) brandSelect.appendChild(opt(c.id, c.name));
  // Enum selects (with empty default)
  fillEnumSelect('size_unit', SIZE_UNITS);
  fillEnumSelect('texture', TEXTURES);
  fillEnumSelect('usage_frequency', USAGE_FREQUENCIES);
  fillEnumSelect('usage_time', USAGE_TIMES);
  fillEnumSelect('target_area', TARGET_AREAS);
  // Skin types / concerns checkboxes
  document.getElementById('skinTypesBox').innerHTML = skinTypesCache
    .map((s) => checkboxItem('skin_type', s.id, s.name))
    .join('');
  document.getElementById('concernsBox').innerHTML = concernsCache
    .map((s) => checkboxItem('concern', s.id, s.name))
    .join('');
}

function wireControls() {
  // List search + filter + pager
  document.getElementById('productSearch').addEventListener(
    'input',
    debounce((e) => { pState.search = e.target.value.trim(); pState.page = 0; loadProducts(); }, 300),
  );
  document.getElementById('productCategoryFilter').addEventListener('change', (e) => {
    pState.categoryId = e.target.value;
    pState.page = 0;
    loadProducts();
  });
  document.getElementById('prevPage').addEventListener('click', () => {
    if (pState.page > 0) { pState.page--; loadProducts(); }
  });
  document.getElementById('nextPage').addEventListener('click', () => {
    if ((pState.page + 1) * PAGE_SIZE < pState.total) { pState.page++; loadProducts(); }
  });

  // Image upload
  document.getElementById('uploadBtn').addEventListener('click', () =>
    document.getElementById('imageFile').click(),
  );
  document.getElementById('imageFile').addEventListener('change', (e) =>
    handleImageFile(e.target.files[0]),
  );
  pField('image_url').addEventListener('input', (e) => showPreview(e.target.value));

  // New brand
  document.getElementById('newBrandBtn').addEventListener('click', addNewBrand);

  // Ingredient tags
  const ingInput = document.getElementById('ingredientInput');
  ingInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addIngredient(ingInput.value); ingInput.value = ''; }
  });
  ingInput.addEventListener(
    'input',
    debounce((e) => fillDatalist('ingredientList', '/api/ingredients', e.target.value), 250),
  );
}

// ── List ──
async function loadProducts() {
  const params = new URLSearchParams();
  if (pState.search) params.set('search', pState.search);
  if (pState.categoryId) params.set('category_id', pState.categoryId);
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String(pState.page * PAGE_SIZE));

  const body = document.getElementById('productsBody');
  try {
    const data = await apiJson('/api/products?' + params.toString());
    pState.total = data.total || 0;
    renderProducts(data.items || []);
    renderPager();
  } catch (e) {
    body.innerHTML = `<tr><td colspan="5" class="table-empty">${esc(e.message)}</td></tr>`;
  }
}

function renderProducts(items) {
  const body = document.getElementById('productsBody');
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="5" class="table-empty">Ürün bulunamadı</td></tr>';
    return;
  }
  body.innerHTML = items
    .map((p) => {
      const brand = p.brand || p.companies?.name || '—';
      const cat = categoryName(p.category_id) || p.category || '—';
      const img = p.image_url
        ? `<img class="thumb" src="${esc(p.image_url)}" alt="" />`
        : '<div class="thumb thumb-empty"></div>';
      const priv = p.is_private ? ' <span class="badge-private">özel</span>' : '';
      return `<tr>
        <td>${img}</td>
        <td><strong>${esc(p.name)}</strong>${priv}</td>
        <td>${esc(brand)}</td>
        <td>${esc(cat)}</td>
        <td class="row-actions">
          <button class="icon-btn" title="Düzenle" onclick="editProduct('${p.id}')">&#9998;</button>
          <button class="icon-btn icon-danger" title="Sil" onclick="deleteProduct('${p.id}','${escAttr(p.name)}')">&#128465;</button>
        </td>
      </tr>`;
    })
    .join('');
}

function renderPager() {
  const totalPages = Math.max(1, Math.ceil(pState.total / PAGE_SIZE));
  document.getElementById('productsCount').textContent = `Toplam ${pState.total} ürün`;
  document.getElementById('pageInfo').textContent = `${pState.page + 1} / ${totalPages}`;
  document.getElementById('prevPage').disabled = pState.page === 0;
  document.getElementById('nextPage').disabled = pState.page + 1 >= totalPages;
}

// ── Form open/close ──
function showProductsList() {
  document.getElementById('productsList').style.display = '';
  document.getElementById('productForm').style.display = 'none';
}

function newProduct() {
  editingId = null;
  resetForm();
  document.getElementById('formTitle').textContent = 'Ürün Ekle';
  document.getElementById('productsList').style.display = 'none';
  document.getElementById('productForm').style.display = '';
}

async function editProduct(id) {
  try {
    const p = await apiJson(`/api/products/${id}`);
    editingId = id;
    resetForm();
    document.getElementById('formTitle').textContent = 'Ürün Düzenle';
    fillForm(p);
    document.getElementById('productsList').style.display = 'none';
    document.getElementById('productForm').style.display = '';
  } catch (e) {
    toast(e.message, 'error');
  }
}

function closeForm() {
  showProductsList();
}

function resetForm() {
  const form = document.getElementById('pForm');
  form.reset();
  pField('id').value = '';
  ingredientTags = [];
  renderTags();
  showPreview('');
  document.querySelectorAll('#skinTypesBox input, #concernsBox input').forEach((c) => (c.checked = false));
}

function fillForm(p) {
  pField('id').value = p.id || '';
  for (const f of TEXT_FIELDS) setVal(f, p[f]);
  for (const f of NUMBER_FIELDS) setVal(f, p[f]);
  for (const f of ENUM_FIELDS.filter((x) => x !== 'category_id')) setVal(f, p[f]);
  setVal('category_id', p.category_id || '');
  for (const f of FLAG_FIELDS) pField(f).checked = !!p[f];
  ingredientTags = Array.isArray(p.ingredients) ? p.ingredients.slice() : [];
  renderTags();
  const skinSet = new Set(p.skin_type_ids || []);
  const concernSet = new Set(p.concern_ids || []);
  document.querySelectorAll('#skinTypesBox input').forEach((c) => (c.checked = skinSet.has(c.value)));
  document.querySelectorAll('#concernsBox input').forEach((c) => (c.checked = concernSet.has(c.value)));
  showPreview(p.image_url || '');
}

// ── Save / delete ──
async function saveProduct() {
  const name = pField('name').value.trim();
  if (!name) { toast('Ürün adı gerekli', 'error'); return; }

  const input = { name };
  for (const f of TEXT_FIELDS.filter((x) => x !== 'name')) {
    input[f] = pField(f).value.trim() || null;
  }
  for (const f of NUMBER_FIELDS) {
    const v = pField(f).value.trim();
    input[f] = v === '' ? null : Number(v);
  }
  for (const f of ENUM_FIELDS) input[f] = pField(f).value || null;
  // Brand text mirrors the chosen registered company (select box).
  const brandSel = pField('company_id');
  input.brand = brandSel.value ? brandSel.options[brandSel.selectedIndex].text : null;
  for (const f of FLAG_FIELDS) input[f] = pField(f).checked;
  input.ingredients = ingredientTags.slice();
  input.skin_type_ids = checkedValues('#skinTypesBox');
  input.concern_ids = checkedValues('#concernsBox');

  const btn = document.getElementById('saveProductBtn');
  btn.disabled = true;
  try {
    if (editingId) {
      await apiJson(`/api/products/${editingId}`, jsonBody('PUT', input));
      toast('Ürün güncellendi');
    } else {
      await apiJson('/api/products', jsonBody('POST', input));
      toast('Ürün eklendi');
    }
    showProductsList();
    loadProducts();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`"${name}" ürününü silmek istediğine emin misin?`)) return;
  try {
    await apiJson(`/api/products/${id}`, { method: 'DELETE' });
    toast('Ürün silindi');
    // step back a page if the last item on the page was removed
    if (pState.page > 0 && pState.total - 1 <= pState.page * PAGE_SIZE) pState.page--;
    loadProducts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Ingredient tags ──
function addIngredient(raw) {
  const name = (raw || '').trim();
  if (!name) return;
  if (ingredientTags.some((t) => t.toLowerCase() === name.toLowerCase())) return;
  ingredientTags.push(name);
  renderTags();
}
function removeIngredient(i) {
  ingredientTags.splice(i, 1);
  renderTags();
}
function renderTags() {
  document.getElementById('ingredientTags').innerHTML = ingredientTags
    .map((t, i) => `<span class="tag">${i + 1}. ${esc(t)} <button type="button" onclick="removeIngredient(${i})">&times;</button></span>`)
    .join('');
}

// ── Image ──
async function handleImageFile(file) {
  if (!file) return;
  try {
    const dataUrl = await readAsDataURL(file);
    toast('Görsel yükleniyor…');
    const body = await apiJson('/api/upload', jsonBody('POST', {
      filename: file.name,
      contentType: file.type,
      data: dataUrl,
    }));
    setVal('image_url', body.url);
    showPreview(body.url);
    toast('Görsel yüklendi');
  } catch (e) {
    toast(e.message, 'error');
  }
}
function showPreview(url) {
  const img = document.getElementById('imagePreview');
  if (url) { img.src = url; img.style.display = 'block'; }
  else { img.removeAttribute('src'); img.style.display = 'none'; }
}
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ── Brands ──
async function createBrand(name) {
  const c = await apiJson('/api/companies', jsonBody('POST', { name }));
  if (!companiesCache.some((x) => x.id === c.id)) {
    companiesCache.push(c);
    companiesCache.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    if (wired) {
      const sel = pField('company_id');
      if (sel) sel.appendChild(opt(c.id, c.name));
    }
  }
  return c;
}

async function addNewBrand() {
  const name = (prompt('Yeni marka adı:') || '').trim();
  if (!name) return;
  try {
    const c = await createBrand(name);
    pField('company_id').value = c.id;
    toast('Marka eklendi');
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Datalist autocomplete ──
async function fillDatalist(listId, endpoint, term) {
  if (!term || term.length < 2) return;
  try {
    const data = await apiJson(`${endpoint}?search=${encodeURIComponent(term)}`);
    document.getElementById(listId).innerHTML = (data || [])
      .map((d) => `<option value="${escAttr(d.name)}"></option>`)
      .join('');
  } catch { /* ignore */ }
}

// ===========================
// Brands / Ingredients (browse)
// ===========================
window.BrandsView = {
  init() {
    const input = document.getElementById('brandSearch');
    input.addEventListener('input', debounce(() => loadLookup('/api/companies', 'brandsBody', input.value), 250));
    document.getElementById('addBrandBtn').addEventListener('click', async () => {
      const name = (prompt('Yeni marka adı:') || '').trim();
      if (!name) return;
      try {
        await createBrand(name);
        toast('Marka eklendi');
        loadLookup('/api/companies', 'brandsBody', input.value);
      } catch (e) {
        toast(e.message, 'error');
      }
    });
    loadLookup('/api/companies', 'brandsBody', '');
  },
};
window.IngredientsView = {
  init() {
    const input = document.getElementById('ingredientSearch');
    input.addEventListener('input', debounce(() => loadLookup('/api/ingredients', 'ingredientsBody', input.value), 250));
    loadLookup('/api/ingredients', 'ingredientsBody', '');
  },
};
async function loadLookup(endpoint, bodyId, q) {
  const body = document.getElementById(bodyId);
  try {
    const data = await apiJson(endpoint + (q ? '?search=' + encodeURIComponent(q) : ''));
    body.innerHTML = (data && data.length)
      ? data.map((d) => `<tr><td>${esc(d.name)}</td></tr>`).join('')
      : '<tr><td class="table-empty">Sonuç yok</td></tr>';
  } catch (e) {
    body.innerHTML = `<tr><td class="table-empty">${esc(e.message)}</td></tr>`;
  }
}

// ===========================
// Small helpers
// ===========================
function pField(name) {
  return document.querySelector(`#pForm [name="${name}"]`);
}
function setVal(name, value) {
  const el = pField(name);
  if (el) el.value = value == null ? '' : value;
}
function checkedValues(sel) {
  return Array.from(document.querySelectorAll(`${sel} input:checked`)).map((c) => c.value);
}
function categoryName(id) {
  if (!id) return null;
  return categoriesCache.find((c) => c.id === id)?.name || null;
}
function opt(value, label) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  return o;
}
function fillEnumSelect(name, values) {
  const sel = pField(name);
  sel.appendChild(opt('', '—'));
  for (const v of values) sel.appendChild(opt(v, v));
}
function checkboxItem(group, id, name) {
  return `<label class="check"><input type="checkbox" data-group="${group}" value="${id}" /> ${esc(name)}</label>`;
}
function jsonBody(method, obj) {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
function escAttr(s) {
  return String(s == null ? '' : s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
