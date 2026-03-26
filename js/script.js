// ============================================================
// AFBENESIA DM05 — SCRIPT.JS v2
// Google Sheets real-time sync via Apps Script Web App
// ============================================================

// ⚙️ KONFIGURASI — ISI URL APPS SCRIPT KAMU DI SINI
const APPS_SCRIPT_URL = 'PASTE_URL_APPS_SCRIPT_KAMU_DI_SINI';

const POLL_INTERVAL = 30000; // 30 detik
const ROWS_PER_PAGE = 20;

// STATE
let allPeserta   = [];
let filteredData = [];
let currentPage  = 1;
let currentFilter= 'semua';
let currentSort  = { col: 'no', dir: 'asc' };
let searchQuery  = '';
let pollTimer    = null;
let lastUpdated  = null;

// ============================================================
// FETCH — Apps Script atau fallback dummy
// ============================================================
async function fetchPeserta(silent = false) {
  const isConfigured = APPS_SCRIPT_URL && APPS_SCRIPT_URL !== 'https://script.google.com/macros/s/AKfycbxjJVG4UCOlacjAom8aICak8rRr4RxpMvfAKtxSkICHDI_pSvADpGa6gQxufmsbQX3-0g/exec';

  if (!isConfigured) {
    allPeserta  = [...DUMMY_PESERTA];
    lastUpdated = new Date();
    setLiveMode(false);
    if (!silent) showToast('📊 Mode Demo — 150 dummy peserta dimuat', 'info');
    applyFiltersAndRender();
    updateStats(allPeserta);
    return;
  }

  if (!silent) setLoadingState(true);

  try {
    const res  = await fetch(`${APPS_SCRIPT_URL}?action=getPeserta&_=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error');

    allPeserta  = json.peserta || [];
    lastUpdated = new Date(json.lastUpdated || Date.now());
    setLiveMode(true);
    if (!silent) showToast(`✅ Data dimuat — ${allPeserta.length} peserta`, 'success');

  } catch (err) {
    console.warn('Sheets fetch failed, fallback to dummy:', err.message);
    allPeserta  = [...DUMMY_PESERTA];
    lastUpdated = new Date();
    setLiveMode(false);
    if (!silent) showToast('⚠️ Gagal terhubung ke Sheets — Data demo aktif', 'warn');
  }

  if (!silent) setLoadingState(false);
  applyFiltersAndRender();
  updateStats(allPeserta);
  updateLastUpdatedUI();
}

// ============================================================
// POLLING
// ============================================================
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    fetchPeserta(true).then(updateLastUpdatedUI);
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ============================================================
// FILTER + SORT + SEARCH
// ============================================================
function applyFiltersAndRender() {
  let data = [...allPeserta];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    data = data.filter(p =>
      p.nama.toLowerCase().includes(q) ||
      p.institusi.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  }

  if (currentFilter === 'lunas')       data = data.filter(p => p.status === 'Lunas');
  if (currentFilter === 'belum-bayar') data = data.filter(p => p.status !== 'Lunas');

  data.sort((a, b) => {
    let va = a[currentSort.col] ?? '', vb = b[currentSort.col] ?? '';
    if (currentSort.col === 'no') { va = +va; vb = +vb; }
    if (va < vb) return currentSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return currentSort.dir === 'asc' ?  1 : -1;
    return 0;
  });

  filteredData = data;
  currentPage  = 1;
  renderTable();
  renderPagination();
  updateFilterCount();
}

// ============================================================
// RENDER TABLE
// ============================================================
function renderTable() {
  const tbody  = document.getElementById('tbody-peserta');
  const noData = document.getElementById('no-data');
  tbody.innerHTML = '';

  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const page  = filteredData.slice(start, start + ROWS_PER_PAGE);

  if (page.length === 0) { noData.style.display = 'block'; return; }
  noData.style.display = 'none';

  const frag = document.createDocumentFragment();
  page.forEach(p => {
    const isLunas = p.status === 'Lunas';
    const tr = document.createElement('tr');
    if (!isLunas) tr.classList.add('highlight-belum');
    const tgl = p.timestamp
      ? new Date(p.timestamp).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
      : '—';
    tr.innerHTML = `
      <td class="id-cell">${esc(p.id)}</td>
      <td class="name-cell">${esc(p.nama)}</td>
      <td class="inst-cell">${esc(p.institusi)}</td>
      <td><span class="badge-status ${isLunas?'badge-lunas':'badge-belum'}">${isLunas?'Lunas':'Belum Bayar'}</span></td>
      <td class="date-cell">${tgl}</td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

// ============================================================
// PAGINATION
// ============================================================
function renderPagination() {
  const container  = document.getElementById('pagination');
  container.innerHTML = '';
  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  if (totalPages <= 1) return;

  const start = (currentPage - 1) * ROWS_PER_PAGE + 1;
  const end   = Math.min(currentPage * ROWS_PER_PAGE, filteredData.length);

  const info = document.createElement('span');
  info.className   = 'page-info';
  info.textContent = `${start}–${end} dari ${filteredData.length}`;
  container.appendChild(info);

  const grp = document.createElement('div');
  grp.className = 'page-btns';

  grp.appendChild(mkBtn('←', currentPage === 1, () => goPage(currentPage - 1)));

  let s = Math.max(1, currentPage - 2);
  let e = Math.min(totalPages, s + 4);
  if (e - s < 4) s = Math.max(1, e - 4);

  if (s > 1) { grp.appendChild(mkBtn('1', false, () => goPage(1))); if (s > 2) grp.appendChild(mkDot()); }
  for (let i = s; i <= e; i++) {
    const b = mkBtn(String(i), false, () => goPage(i));
    if (i === currentPage) b.classList.add('active');
    grp.appendChild(b);
  }
  if (e < totalPages) { if (e < totalPages-1) grp.appendChild(mkDot()); grp.appendChild(mkBtn(String(totalPages), false, () => goPage(totalPages))); }

  grp.appendChild(mkBtn('→', currentPage === totalPages, () => goPage(currentPage + 1)));
  container.appendChild(grp);
}

function mkBtn(label, disabled, onClick) {
  const b = document.createElement('button');
  b.className = 'page-btn'; b.textContent = label; b.disabled = disabled;
  if (!disabled) b.addEventListener('click', onClick);
  return b;
}
function mkDot() { const s = document.createElement('span'); s.className='page-ellipsis'; s.textContent='…'; return s; }

function goPage(n) {
  const total = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  currentPage = Math.max(1, Math.min(n, total));
  renderTable();
  renderPagination();
  document.getElementById('peserta').scrollIntoView({ behavior:'smooth', block:'start' });
}

// ============================================================
// STATS
// ============================================================
function updateStats(peserta) {
  const total  = peserta.length;
  const lunas  = peserta.filter(p => p.status === 'Lunas').length;
  const belum  = total - lunas;
  const persen = total > 0 ? Math.round((lunas / total) * 100) : 0;

  anim(document.querySelector('[data-count="total"]'),  total);
  anim(document.querySelector('[data-count="persen"]'), persen, '%');
  anim(document.querySelector('[data-count="lunas"]'),  lunas);
  anim(document.querySelector('[data-count="belum"]'),  belum);

  const heroCount = document.getElementById('hero-count');
  if (heroCount) heroCount.textContent = total + ' Peserta';
  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = persen + '%';
}

function updateFilterCount() {
  const el = document.getElementById('filter-count');
  if (el) el.textContent = `Menampilkan ${filteredData.length} dari ${allPeserta.length} peserta`;
}

// ============================================================
// SORT HEADERS
// ============================================================
function initSortHeaders() {
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      currentSort = currentSort.col === col
        ? { col, dir: currentSort.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' };
      document.querySelectorAll('th[data-sort]').forEach(t => t.classList.remove('sort-asc','sort-desc'));
      th.classList.add(currentSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
      applyFiltersAndRender();
    });
  });
}

// ============================================================
// SEARCH
// ============================================================
function initSearch() {
  const inp = document.getElementById('search-input');
  if (!inp) return;
  let dbt;
  inp.addEventListener('input', () => {
    clearTimeout(dbt);
    dbt = setTimeout(() => { searchQuery = inp.value; applyFiltersAndRender(); }, 250);
  });
  const clr = document.getElementById('search-clear');
  if (clr) clr.addEventListener('click', () => { inp.value = ''; searchQuery = ''; applyFiltersAndRender(); inp.focus(); });
}

// ============================================================
// FILTER BUTTONS
// ============================================================
function initFilter() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFiltersAndRender();
    });
  });
}

// ============================================================
// REFRESH BUTTON
// ============================================================
function initRefreshBtn() {
  const btn = document.getElementById('btn-refresh');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.classList.add('spinning');
    btn.disabled = true;
    await fetchPeserta(false);
    setTimeout(() => { btn.classList.remove('spinning'); btn.disabled = false; }, 600);
  });
}

// ============================================================
// EXPORT CSV
// ============================================================
function initExportBtn() {
  const btn = document.getElementById('btn-export');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const data = filteredData.length < allPeserta.length ? filteredData : allPeserta;
    let csv = 'No,ID Peserta,Nama,Institusi,Status Pembayaran,Tanggal Daftar\n';
    data.forEach(p => {
      const tgl = p.timestamp ? new Date(p.timestamp).toLocaleDateString('id-ID') : '';
      csv += `${p.no},"${p.id}","${p.nama}","${p.institusi}","${p.status}","${tgl}"\n`;
    });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8;' })),
      download: `peserta-dm05-${new Date().toISOString().slice(0,10)}.csv`
    });
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`📥 Mengunduh ${data.length} data peserta...`, 'success');
  });
}

// ============================================================
// LIVE MODE + LOADING
// ============================================================
function setLiveMode(live) {
  const dot  = document.getElementById('live-dot');
  const text = document.getElementById('live-text');
  if (!dot || !text) return;
  dot.classList.toggle('live', live);
  text.textContent = live ? 'Live · Google Sheets' : 'Demo · Data Lokal';
}

function updateLastUpdatedUI() {
  const el = document.getElementById('last-updated');
  if (!el || !lastUpdated) return;
  el.textContent = 'Update: ' + lastUpdated.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
}

function setLoadingState(on) {
  const el = document.getElementById('table-loading');
  if (el) el.style.display = on ? 'flex' : 'none';
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
}

// ============================================================
// MODAL
// ============================================================
function showModal(icon, title, msg) {
  document.getElementById('modal-icon').textContent  = icon;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-msg').textContent   = msg;
  document.getElementById('modal-overlay').classList.add('visible');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('visible'); }

function initModal() {
  document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target===e.currentTarget) closeModal(); });
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-daftar').addEventListener('click', () =>
    showModal('🎉','Pendaftaran Ditutup!','Terima kasih! Pendaftaran Batch 05 telah ditutup. Pantau terus untuk Batch 06 ya!'));
  document.getElementById('btn-info').addEventListener('click', () =>
    showModal('📩','Hubungi Kami','Untuk informasi lebih lanjut, silakan hubungi panitia Afbenesia melalui media sosial resmi kami.'));
}

// ============================================================
// HAMBURGER
// ============================================================
function initHamburger() {
  const ham = document.getElementById('hamburger'), links = document.getElementById('nav-links');
  ham.addEventListener('click', () => { ham.classList.toggle('open'); links.classList.toggle('open'); });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { ham.classList.remove('open'); links.classList.remove('open'); }));
}

// ============================================================
// COUNTER ANIMATION
// ============================================================
function anim(el, target, suffix = '') {
  if (!el) return;
  let cur = 0, steps = 40, i = 0;
  const step = target / steps;
  clearInterval(el._t);
  el._t = setInterval(() => {
    i++; cur += step;
    if (i >= steps) { cur = target; clearInterval(el._t); }
    el.textContent = Math.round(cur) + suffix;
  }, 20);
}

// ============================================================
// FADE IN
// ============================================================
function initFadeIn() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
}

// ============================================================
// ACTIVE NAV
// ============================================================
function initActiveNav() {
  const links = document.querySelectorAll('.nav-links a[href^="#"]');
  new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); });
  }, { rootMargin:'-40% 0px -55% 0px' }).observe && document.querySelectorAll('section[id]').forEach(s =>
    new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); });
    }, { rootMargin:'-40% 0px -55% 0px' }).observe(s)
  );
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initHamburger(); initFilter(); initSearch(); initSortHeaders();
  initModal(); initFadeIn(); initActiveNav();
  initRefreshBtn(); initExportBtn();
  fetchPeserta(false).then(() => startPolling());
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling();
  else { fetchPeserta(true); startPolling(); }
});