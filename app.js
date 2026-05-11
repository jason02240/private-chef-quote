// ============================================================
// 私廚晚宴報價系統 - 客戶端邏輯
// ============================================================

// 向量維度：[2-3人, 4-5人, 6-8人, 9-10人, 牛排, 海鮮, 酒水, 特殊服務]
function buildQueryVector(peopleGroup, mainDish) {
  const v = [0, 0, 0, 0, 0, 0, 0, 0];
  const peopleMap = { '2-3': 0, '4-5': 1, '6-8': 2, '9-10': 3 };
  if (peopleMap[peopleGroup] !== undefined) v[peopleMap[peopleGroup]] = 1;
  if (mainDish === 'steak'   || mainDish === 'both') v[4] = 1;
  if (mainDish === 'seafood' || mainDish === 'both') v[5] = 1;
  return v;
}

async function searchPackages(vector) {
  const { data, error } = await supabase.rpc('match_packages', {
    query_embedding: vector,
    match_count: 5
  });
  if (error) throw error;
  return data;
}

// 後處理：最高相似度 → 符合需求，找更低 price_min → 略為符合，找更高 price_min → 更多服務
function processResults(results) {
  if (!results || results.length === 0) return null;

  const best = results[0];
  const rest = results.slice(1);

  const lowerOpts  = rest.filter(r => r.price_min < best.price_min);
  const higherOpts = rest.filter(r => r.price_min > best.price_min);

  const lower = lowerOpts.length > 0
    ? lowerOpts.reduce((a, b) =>
        Math.abs(a.price_min - best.price_min) <= Math.abs(b.price_min - best.price_min) ? a : b)
    : rest[1] || null;

  const higher = higherOpts.length > 0
    ? higherOpts.reduce((a, b) =>
        Math.abs(a.price_min - best.price_min) <= Math.abs(b.price_min - best.price_min) ? a : b)
    : rest[2] || rest[1] || null;

  return { lower, match: best, higher };
}

function formatPrice(min, max) {
  const fmt = n => n >= 10000
    ? (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + '萬'
    : n.toLocaleString();
  return `NT$ ${fmt(min)} – ${fmt(max)}`;
}

function buildCard(pkg, tier) {
  if (!pkg) return '';

  const tierConfig = {
    lower:  { label: '略為符合',  labelClass: 'label-basic',   cardClass: '' },
    match:  { label: '最符合需求', labelClass: 'label-match',   cardClass: 'card-featured' },
    higher: { label: '更多服務',   labelClass: 'label-premium', cardClass: '' }
  };

  const { label, labelClass, cardClass } = tierConfig[tier];
  const pct = Math.round(Math.max(0, Math.min(1, pkg.similarity)) * 100);
  const features = Array.isArray(pkg.features) ? pkg.features : JSON.parse(pkg.features || '[]');

  return `
    <div class="card ${cardClass}">
      <div class="card-image">
        <img src="${pkg.image_url}" alt="${pkg.name}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80&fit=crop'">
      </div>
      <div class="card-content">
        <span class="label ${labelClass}">${label}</span>
        <h3 class="card-title">${pkg.name}</h3>
        <p class="card-desc">${pkg.description}</p>
        <div class="similarity">
          <div class="sim-header">
            <span class="sim-label">相符度</span>
            <span class="sim-pct">${pct}%</span>
          </div>
          <div class="sim-bar">
            <div class="sim-fill" style="width:0%" data-pct="${pct}"></div>
          </div>
        </div>
        <div class="feature-tags">
          ${features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
        </div>
        <p class="price-label">參考報價</p>
        <p class="price">${formatPrice(pkg.price_min, pkg.price_max)}</p>
        <button class="btn-inquiry" onclick="showInquiry('${pkg.name.replace(/'/g, "\\'")}')">了解更多</button>
      </div>
    </div>`;
}

function renderResults(cards) {
  const section = document.getElementById('results-section');
  const grid = document.getElementById('cards-grid');

  if (!cards || (!cards.lower && !cards.match && !cards.higher)) {
    grid.innerHTML = '<p class="no-results">找不到符合的方案，請調整篩選條件。</p>';
    section.classList.remove('hidden');
    return;
  }

  grid.innerHTML =
    buildCard(cards.lower, 'lower') +
    buildCard(cards.match, 'match') +
    buildCard(cards.higher, 'higher');

  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 觸發相似度進度條動畫
  requestAnimationFrame(() => {
    document.querySelectorAll('.sim-fill').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  });
}

function showInquiry(packageName) {
  document.getElementById('modal-package-name').textContent = packageName;
  document.getElementById('inquiry-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('inquiry-modal').classList.add('hidden');
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const form    = document.getElementById('quote-form');
  const loading = document.getElementById('loading');
  const results = document.getElementById('results-section');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const people = form.people.value;
    const dish   = form.dish.value;

    results.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
      const vector = buildQueryVector(people, dish);
      const raw    = await searchPackages(vector);
      const cards  = processResults(raw);
      renderResults(cards);
    } catch (err) {
      console.error(err);
      document.getElementById('cards-grid').innerHTML =
        '<p class="no-results">查詢失敗，請確認 Supabase 設定是否正確。</p>';
      results.classList.remove('hidden');
    } finally {
      loading.classList.add('hidden');
    }
  });

  // 點擊遮罩關閉 modal
  document.getElementById('inquiry-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
});
