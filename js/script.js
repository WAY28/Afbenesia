// ============================================================
// AFBENESIA DM05 — SCRIPT.JS v3
// Google Sheets real-time sync via Apps Script Web App
// ============================================================

// ⚙️ KONFIGURASI — ISI URL APPS SCRIPT KAMU DI SINI
// Contoh: 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec'
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjJVG4UCOlacjAom8aICak8rRr4RxpMvfAKtxSkICHDI_pSvADpGa6gQxufmsbQX3-0g/exec';

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
// CEK APAKAH URL SUDAH DIKONFIGURASI
// ============================================================
function isURLConfigured() {
  return (
    APPS_SCRIPT_URL &&
    APPS_SCRIPT_URL.trim() !== '' &&
    APPS_SCRIPT_URL !== 'PASTE_URL_APPS_SCRIPT_KAMU_DI_SINI' &&
    APPS_SCRIPT_URL.startsWith('https://script.google.com/')
  );
}

// ============================================================
// FETCH — Apps Script (tidak ada fallback dummy)
// ============================================================
async function fetchPeserta(silent = false) {
  if (!isURLConfigured()) {
    setLoadingState(false);
    setLiveMode(false);
    showError('URL Apps Script belum diisi. Buka script.js dan isi variabel APPS_SCRIPT_URL dengan URL deployment kamu.');
    return;
  }

  if (!silent) setLoadingState(true);

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getPeserta&_=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Response tidak valid dari Apps Script');

    allPeserta  = json.peserta || [];
    lastUpdated = new Date(json.lastUpdated || Date.now());
    setLiveMode(true);
    hideError();
    if (!silent) showToast(`✅ Data dimuat — ${allPeserta.length} peserta`, 'success');

  } catch (err) {
    console.error('Sheets fetch error:', err.message);
    setLiveMode(false);
    showError(`Gagal mengambil data: ${err.message}. Pastikan URL Apps Script benar dan sudah di-deploy dengan akses "Anyone".`);
    if (!silent) showToast('⚠️ Gagal terhubung ke Google Sheets', 'warn');
  }

  if (!silent) setLoadingState(false);
  applyFiltersAndRender();
  updateStats(allPeserta);
  updateLastUpdatedUI();
}

// ============================================================
// ERROR BANNER
// ============================================================
function showError(msg) {
  let el = document.getElementById('fetch-error-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fetch-error-banner';
    el.style.cssText = `
      background:#fff3cd; color:#856404; border:1px solid #ffc107;
      border-radius:8px; padding:12px 16px; margin:16px 0;
      font-size:14px; line-height:1.5;
    `;
    const container = document.getElementById('filter-count');
    if (container) container.before(el);
  }
  el.textContent = '⚠️ ' + msg;
  el.style.display = 'block';
}

function hideError() {
  const el = document.getElementById('fetch-error-banner');
  if (el) el.style.display = 'none';
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
      (p.nama || '').toLowerCase().includes(q) ||
      (p.institusi || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q)
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

  document.querySelectorAll('[data-count="total"]').forEach(el => anim(el, total));
  document.querySelectorAll('[data-count="persen"]').forEach(el => anim(el, persen, '%'));
  document.querySelectorAll('[data-count="lunas"]').forEach(el => anim(el, lunas));
  document.querySelectorAll('[data-count="belum"]').forEach(el => anim(el, belum));

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
// EXPORT EXCEL (.xlsx) — pakai SheetJS
// ============================================================
function loadSheetJS(callback) {
  if (window.XLSX) { callback(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload = callback;
  document.head.appendChild(s);
}

function initExportBtn() {
  const btn = document.getElementById('btn-export');
  if (!btn) return;
  btn.addEventListener('click', () => {
    loadSheetJS(() => {
      const data = filteredData.length < allPeserta.length ? filteredData : allPeserta;
      const now  = new Date();

      const lunas = data.filter(p => p.status === 'Lunas').length;
      const belum = data.length - lunas;
      const pct   = data.length > 0 ? Math.round(lunas / data.length * 100) : 0;

      const infoRows = [
        ['Kelas Kilat Digital Marketing \u2013 Batch 05', '', '', '', '', ''],
        ['Afbenesia \u00b7 18 Oktober 2025', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        [`Total: ${data.length}`, `Lunas: ${lunas}`, `Belum Bayar: ${belum}`, `% Lunas: ${pct}%`, '', `Diunduh: ${now.toLocaleDateString('id-ID', {day:'2-digit',month:'long',year:'numeric'})}`],
        ['', '', '', '', '', ''],
      ];

      const headerRow = ['No', 'ID Peserta', 'Nama Lengkap', 'Institusi / Asal', 'Status Pembayaran', 'Tanggal Daftar'];

      const dataRows = data.map(p => [
        p.no,
        p.id,
        p.nama,
        p.institusi,
        p.status,
        p.timestamp ? new Date(p.timestamp).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'}) : '\u2014',
      ]);

      const allRows = [...infoRows, headerRow, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(allRows);

      ws['!cols'] = [
        { wch: 6 }, { wch: 17 }, { wch: 28 }, { wch: 30 }, { wch: 20 }, { wch: 24 }
      ];
      ws['!rows'] = [
        { hpt: 22 }, { hpt: 16 }, { hpt: 6 }, { hpt: 20 }, { hpt: 6 }, { hpt: 20 },
        ...dataRows.map(() => ({ hpt: 18 }))
      ];
      ws['!merges'] = [
        { s:{r:0,c:0}, e:{r:0,c:5} },
        { s:{r:1,c:0}, e:{r:1,c:5} },
      ];

      const styleHeader = {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { patternType: 'solid', fgColor: { rgb: '1B2A4A' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top:    { style: 'medium', color: { rgb: '1B2A4A' } },
          bottom: { style: 'medium', color: { rgb: '1B2A4A' } },
          left:   { style: 'thin',   color: { rgb: '1B2A4A' } },
          right:  { style: 'thin',   color: { rgb: '1B2A4A' } },
        }
      };
      const styleLunas = {
        font: { bold: true, sz: 10, color: { rgb: '166534' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'DCFCE7' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top:{style:'thin',color:{rgb:'D1D5DB'}}, bottom:{style:'thin',color:{rgb:'D1D5DB'}}, left:{style:'thin',color:{rgb:'D1D5DB'}}, right:{style:'thin',color:{rgb:'D1D5DB'}} }
      };
      const styleBelum = {
        font: { bold: true, sz: 10, color: { rgb: '991B1B' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'FEE2E2' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top:{style:'thin',color:{rgb:'D1D5DB'}}, bottom:{style:'thin',color:{rgb:'D1D5DB'}}, left:{style:'thin',color:{rgb:'D1D5DB'}}, right:{style:'thin',color:{rgb:'D1D5DB'}} }
      };
      const thinBorder = { top:{style:'thin',color:{rgb:'D1D5DB'}}, bottom:{style:'thin',color:{rgb:'D1D5DB'}}, left:{style:'thin',color:{rgb:'D1D5DB'}}, right:{style:'thin',color:{rgb:'D1D5DB'}} };

      const cols = ['A','B','C','D','E','F'];
      const HEADER_ROW = 6;

      if (ws['A1']) ws['A1'].s = { font:{ bold:true, sz:14, color:{rgb:'1D4ED8'} } };
      if (ws['A2']) ws['A2'].s = { font:{ sz:10, italic:true, color:{rgb:'6B7280'} } };
      ['A4','B4','C4','D4','F4'].forEach(addr => {
        if (ws[addr]) ws[addr].s = { font:{ bold:true, sz:10 } };
      });

      cols.forEach(c => {
        const addr = `${c}${HEADER_ROW}`;
        if (ws[addr]) ws[addr].s = styleHeader;
      });

      dataRows.forEach((row, i) => {
        const excelRow = HEADER_ROW + 1 + i;
        const isLunas  = row[4] === 'Lunas';
        const altBg    = i % 2 === 1 ? 'F1F5F9' : 'FFFFFF';
        cols.forEach((c, ci) => {
          const addr = `${c}${excelRow}`;
          if (!ws[addr]) return;
          if (ci === 4) {
            ws[addr].s = isLunas ? styleLunas : styleBelum;
          } else {
            ws[addr].s = {
              font: { sz: 10 },
              fill: { patternType: 'solid', fgColor: { rgb: altBg } },
              alignment: { horizontal: [0,1,4,5].includes(ci) ? 'center' : 'left', vertical: 'center' },
              border: thinBorder
            };
          }
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Daftar Peserta');

      const filename = `peserta-dm05-${now.toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, filename, { bookType: 'xlsx', cellStyles: true });

      showToast(`\ud83d\udce5 Mengunduh ${data.length} peserta sebagai Excel...`, 'success');
    });
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
  text.textContent = live ? 'Live · Google Sheets' : 'Offline · Cek Koneksi';
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
  document.querySelectorAll('section[id]').forEach(s =>
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
  fetchPeserta(false).then(() => { if (isURLConfigured()) startPolling(); });
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling();
  else if (isURLConfigured()) { fetchPeserta(true); startPolling(); }
});