/**
 * VN Solar – Admin JS
 * Handles: page/URL CRUD, lead management, settings, auth guard
 */

/* ── Auth Guard ──────────────────────────────────── */
(function authGuard() {
    const isLogin = window.location.pathname.includes('login');
    const token   = sessionStorage.getItem('vns_admin_token');
    if (!isLogin && !token) {
        window.location.href = 'login.html';
    }
    if (isLogin && token) {
        window.location.href = 'index.html';
    }
})();

/* ── DB (localStorage persistence) ──────────────── */
const DB_KEY = 'vnsolar_admin_db';

function getDB() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
    // Seed from db.json if empty
    return null;
}

async function initDB() {
    let db = getDB();
    if (!db) {
        try {
            const res = await fetch('db.json');
            db = await res.json();
            localStorage.setItem(DB_KEY, JSON.stringify(db));
        } catch (e) {
            db = { pages: [], leads: [], settings: {} };
            localStorage.setItem(DB_KEY, JSON.stringify(db));
        }
    }
    return db;
}

function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/* ── Alert helper ────────────────────────────────── */
function showAlert(msg, type = 'success', duration = 3000) {
    const el = document.getElementById('adminAlert');
    if (!el) return;
    el.textContent = msg;
    el.className = `alert show alert-${type}`;
    setTimeout(() => { el.className = 'alert'; }, duration);
}

/* ── URL / Pages Manager ─────────────────────────── */
let editingId = null;

async function renderPages(filter = '') {
    const db   = await initDB();
    const tbody = document.getElementById('pagesBody');
    if (!tbody) return;

    const pages = db.pages.filter(p =>
        !filter || p.title.toLowerCase().includes(filter) || p.slug.toLowerCase().includes(filter)
    );

    tbody.innerHTML = pages.length === 0
        ? `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#aaa">Không có trang nào.</td></tr>`
        : pages.map(p => `
            <tr>
              <td><strong>${escHtml(p.title)}</strong><br><span style="color:#888;font-size:.78rem">${escHtml(p.meta_desc || '')}</span></td>
              <td><code style="background:#f3f4f6;padding:.1rem .4rem;border-radius:.3rem;font-size:.78rem">${escHtml(p.slug)}</code></td>
              <td><a href="../${escHtml(p.url)}" target="_blank" style="color:#16a34a;font-size:.82rem">${escHtml(p.url)}</a></td>
              <td><span class="badge badge-${p.status}">${p.status}</span></td>
              <td style="color:#888;font-size:.78rem">${p.updated_at ? new Date(p.updated_at).toLocaleDateString('vi-VN') : '-'}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="openEditPage('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deletePage('${p.id}')"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>`).join('');

    // Stats
    const total    = document.getElementById('statTotal');
    const active   = document.getElementById('statActive');
    const drafts   = document.getElementById('statDraft');
    if (total)  total.textContent  = db.pages.length;
    if (active) active.textContent = db.pages.filter(p => p.status === 'active').length;
    if (drafts) drafts.textContent = db.pages.filter(p => p.status === 'draft').length;
}

async function openEditPage(id) {
    const db   = await initDB();
    const page = db.pages.find(p => p.id === id);
    if (!page) return;
    editingId = id;

    document.getElementById('editId').value         = page.id;
    document.getElementById('editTitle').value      = page.title;
    document.getElementById('editSlug').value       = page.slug;
    document.getElementById('editUrl').value        = page.url;
    document.getElementById('editStatus').value     = page.status;
    document.getElementById('editMetaTitle').value  = page.meta_title || '';
    document.getElementById('editMetaDesc').value   = page.meta_desc  || '';

    document.getElementById('pageModal').classList.add('open');
}

function openNewPage() {
    editingId = null;
    ['editId','editTitle','editSlug','editUrl','editMetaTitle','editMetaDesc'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const sel = document.getElementById('editStatus');
    if (sel) sel.value = 'draft';
    document.getElementById('pageModal').classList.add('open');
}

function closePageModal() {
    document.getElementById('pageModal').classList.remove('open');
    editingId = null;
}

async function savePageForm(e) {
    e.preventDefault();
    const db   = await initDB();

    const data = {
        id:         editingId || 'pg_' + Date.now(),
        title:      document.getElementById('editTitle').value.trim(),
        slug:       document.getElementById('editSlug').value.trim().replace(/\s+/g,'-').toLowerCase(),
        url:        document.getElementById('editUrl').value.trim(),
        status:     document.getElementById('editStatus').value,
        meta_title: document.getElementById('editMetaTitle').value.trim(),
        meta_desc:  document.getElementById('editMetaDesc').value.trim(),
        updated_at: new Date().toISOString(),
    };

    if (!data.title || !data.slug || !data.url) {
        showAlert('Vui lòng điền đầy đủ tiêu đề, slug và URL.', 'danger');
        return;
    }

    if (editingId) {
        const idx = db.pages.findIndex(p => p.id === editingId);
        if (idx > -1) db.pages[idx] = data;
    } else {
        data.created_at = data.updated_at;
        db.pages.push(data);
    }

    saveDB(db);
    closePageModal();
    renderPages();
    showAlert(editingId ? 'Đã cập nhật trang thành công.' : 'Đã thêm trang mới.');
    exportDB(); // auto re-export
}

async function deletePage(id) {
    if (!confirm('Xoá trang này?')) return;
    const db  = await initDB();
    db.pages  = db.pages.filter(p => p.id !== id);
    saveDB(db);
    renderPages();
    showAlert('Đã xoá trang.', 'success');
    exportDB();
}

/* Auto-generate slug from title */
function autoSlug() {
    const title = document.getElementById('editTitle')?.value || '';
    const slug  = title.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/đ/g,'d').replace(/[^a-z0-9\s-]/g,'')
        .replace(/\s+/g,'-').replace(/-+/g,'-').trim('-');
    const el = document.getElementById('editSlug');
    if (el && !el.value) el.value = slug;

    const urlEl = document.getElementById('editUrl');
    if (urlEl && !urlEl.value) urlEl.value = `pages/${slug}.html`;
}

/* ── Leads Manager ───────────────────────────────── */
async function renderLeads(filter = '') {
    const leads = JSON.parse(localStorage.getItem('vnsolar_leads') || '[]');
    const tbody = document.getElementById('leadsBody');
    if (!tbody) return;

    const filtered = filter ? leads.filter(l =>
        (l.name||'').toLowerCase().includes(filter) ||
        (l.phone||'').includes(filter)
    ) : leads;

    tbody.innerHTML = filtered.length === 0
        ? `<tr><td colspan="5" style="text-align:center;padding:2rem;color:#aaa">Chưa có lead nào.</td></tr>`
        : filtered.map((l, i) => `
            <tr>
              <td>${escHtml(l.name||'-')}</td>
              <td><strong>${escHtml(l.phone||'-')}</strong></td>
              <td style="font-size:.8rem">${escHtml(l.service||'-')}</td>
              <td style="font-size:.78rem;color:#888">${l.time ? new Date(l.time).toLocaleString('vi-VN') : '-'}</td>
              <td><button class="btn btn-danger btn-sm" onclick="deleteLead(${i})"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`).join('');

    const statLeads = document.getElementById('statLeads');
    if (statLeads) statLeads.textContent = leads.length;
}

function deleteLead(idx) {
    const leads = JSON.parse(localStorage.getItem('vnsolar_leads') || '[]');
    leads.splice(idx, 1);
    localStorage.setItem('vnsolar_leads', JSON.stringify(leads));
    renderLeads();
}

function clearLeads() {
    if (!confirm('Xoá toàn bộ leads?')) return;
    localStorage.removeItem('vnsolar_leads');
    renderLeads();
}

/* ── Export db.json ──────────────────────────────── */
function exportDB() {
    const db = getDB();
    if (!db) return;
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'db.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

/* ── Login / Logout ──────────────────────────────── */
window.doLogin = function(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser')?.value;
    const pass = document.getElementById('loginPass')?.value;
    // Simple demo credentials – replace with server auth in production
    if (user === 'admin' && pass === 'vnsolar2025') {
        sessionStorage.setItem('vns_admin_token', 'demo_token_' + Date.now());
        window.location.href = 'index.html';
    } else {
        showAlert('Sai tên đăng nhập hoặc mật khẩu.', 'danger');
    }
};

window.doLogout = function() {
    sessionStorage.removeItem('vns_admin_token');
    window.location.href = 'login.html';
};

/* ── Helpers ─────────────────────────────────────── */
function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Init on page load ───────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pagesBody'))  renderPages();
    if (document.getElementById('leadsBody'))  renderLeads();

    // Search handler
    const search = document.getElementById('searchInput');
    if (search) {
        search.addEventListener('input', () => {
            if (document.getElementById('pagesBody'))  renderPages(search.value.toLowerCase());
            if (document.getElementById('leadsBody'))  renderLeads(search.value.toLowerCase());
        });
    }

    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar       = document.querySelector('.admin-sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // Active nav
    const path = window.location.pathname.split('/').pop();
    document.querySelectorAll('.admin-sidebar nav a').forEach(a => {
        if (a.getAttribute('href') === path) a.classList.add('active');
    });
});

/* Expose globals */
window.renderPages    = renderPages;
window.openEditPage   = openEditPage;
window.openNewPage    = openNewPage;
window.closePageModal = closePageModal;
window.savePageForm   = savePageForm;
window.deletePage     = deletePage;
window.autoSlug       = autoSlug;
window.renderLeads    = renderLeads;
window.deleteLead     = deleteLead;
window.clearLeads     = clearLeads;
window.exportDB       = exportDB;
