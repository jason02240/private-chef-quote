// ============================================================
// 私廚晚宴報價系統 - 管理後台邏輯
// ============================================================

let editingId = null;

// ── 向量自動計算 ──────────────────────────────────────────────
function computeEmbedding() {
  const get = id => document.getElementById(id).checked ? 1 : 0;
  return [
    get('f-2-3'), get('f-4-5'), get('f-6-8'), get('f-9-10'),
    get('f-steak'), get('f-seafood'), get('f-wine'), get('f-special')
  ];
}

function updateVectorPreview() {
  const v = computeEmbedding();
  document.getElementById('vector-preview').textContent = '[' + v.join(', ') + ']';
}

// ── 載入全部方案 ──────────────────────────────────────────────
async function loadPackages() {
  const listEl = document.getElementById('package-list');
  listEl.innerHTML = '<p class="list-loading">載入中…</p>';

  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    listEl.innerHTML = `<p class="list-error">載入失敗：${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    listEl.innerHTML = '<p class="list-empty">尚無方案，請新增。</p>';
    return;
  }

  listEl.innerHTML = data.map(pkg => buildListItem(pkg)).join('');
}

function buildListItem(pkg) {
  const features = Array.isArray(pkg.features) ? pkg.features : JSON.parse(pkg.features || '[]');
  return `
    <div class="package-item" data-id="${pkg.id}">
      <img class="package-thumb" src="${pkg.image_url}"
           onerror="this.src='https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=60&fit=crop'" alt="">
      <div class="package-info">
        <h4>${pkg.name}</h4>
        <span>NT$ ${pkg.price_min.toLocaleString()} – ${pkg.price_max.toLocaleString()}</span>
        <div class="feature-tags" style="margin-top:4px">
          ${features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn-edit" onclick='startEdit(${JSON.stringify(pkg)})'>編輯</button>
        <button class="btn-delete" onclick="deletePackage('${pkg.id}')">刪除</button>
      </div>
    </div>`;
}

// ── 填入編輯資料 ──────────────────────────────────────────────
function startEdit(pkg) {
  editingId = pkg.id;
  document.getElementById('form-title').textContent = '編輯方案';
  document.getElementById('pkg-name').value = pkg.name;
  document.getElementById('pkg-desc').value = pkg.description;
  document.getElementById('pkg-image').value = pkg.image_url;
  document.getElementById('pkg-price-min').value = pkg.price_min;
  document.getElementById('pkg-price-max').value = pkg.price_max;

  const embed = Array.isArray(pkg.embedding) ? pkg.embedding : [];
  const ids = ['f-2-3','f-4-5','f-6-8','f-9-10','f-steak','f-seafood','f-wine','f-special'];
  ids.forEach((id, i) => { document.getElementById(id).checked = embed[i] === 1; });

  const preview = document.getElementById('image-preview');
  if (pkg.image_url) {
    preview.src = pkg.image_url;
    preview.classList.remove('hidden');
  }

  updateVectorPreview();
  document.querySelector('aside').scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  editingId = null;
  document.getElementById('form-title').textContent = '新增方案';
  document.getElementById('admin-form').reset();
  document.getElementById('image-preview').classList.add('hidden');
  updateVectorPreview();
}

// ── 新增 / 更新 ───────────────────────────────────────────────
async function savePackage(e) {
  e.preventDefault();

  const embedding = computeEmbedding();
  const features  = buildFeaturesArray();

  const payload = {
    name:        document.getElementById('pkg-name').value.trim(),
    description: document.getElementById('pkg-desc').value.trim(),
    image_url:   document.getElementById('pkg-image').value.trim(),
    price_min:   parseInt(document.getElementById('pkg-price-min').value, 10),
    price_max:   parseInt(document.getElementById('pkg-price-max').value, 10),
    features,
    embedding
  };

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = '儲存中…';

  let error;
  if (editingId) {
    ({ error } = await db.from('packages').update(payload).eq('id', editingId));
  } else {
    ({ error } = await db.from('packages').insert(payload));
  }

  btn.disabled = false;
  btn.textContent = '儲存方案';

  if (error) {
    showToast('儲存失敗：' + error.message, 'error');
    return;
  }

  showToast(editingId ? '方案已更新！' : '方案已新增！', 'success');
  resetForm();
  loadPackages();
}

// 根據勾選自動產生 features 標籤陣列
function buildFeaturesArray() {
  const map = [
    ['f-2-3', '2-3人'], ['f-4-5', '4-5人'], ['f-6-8', '6-8人'], ['f-9-10', '9-10人'],
    ['f-steak', '牛排'], ['f-seafood', '海鮮'], ['f-wine', '葡萄酒'], ['f-special', '特殊服務']
  ];
  return map.filter(([id]) => document.getElementById(id).checked).map(([, label]) => label);
}

// ── 刪除 ──────────────────────────────────────────────────────
async function deletePackage(id) {
  if (!confirm('確定要刪除這個方案嗎？')) return;

  const { error } = await db.from('packages').delete().eq('id', id);
  if (error) {
    showToast('刪除失敗：' + error.message, 'error');
    return;
  }
  showToast('方案已刪除', 'success');
  loadPackages();
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type === 'error' ? 'toast-error' : 'toast-success');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ── 初始化 ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadPackages();
  updateVectorPreview();

  document.getElementById('admin-form').addEventListener('submit', savePackage);
  document.getElementById('reset-btn').addEventListener('click', resetForm);

  document.querySelectorAll('.feature-check').forEach(cb => {
    cb.addEventListener('change', updateVectorPreview);
  });

  document.getElementById('pkg-image').addEventListener('input', e => {
    const preview = document.getElementById('image-preview');
    const url = e.target.value.trim();
    preview.src = url || '';
    preview.classList.toggle('hidden', !url);
  });
});
