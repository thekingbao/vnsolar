/**
 * VN Solar – Main JS
 * Handles: navbar scroll, mobile menu, modal, calculator, page-links from DB
 */

/* ── URL Database loader ─────────────────────────── */
let siteDB = null;

async function loadDB() {
    try {
        const res = await fetch('../admin/db.json');
        siteDB = await res.json();
        applyDBLinks();
    } catch (e) {
        console.warn('DB load failed, using static links.', e);
    }
}

function applyDBLinks() {
    if (!siteDB || !siteDB.pages) return;
    // Update all nav links dynamically from DB
    document.querySelectorAll('[data-page-slug]').forEach(el => {
        const slug = el.getAttribute('data-page-slug');
        const page = siteDB.pages.find(p => p.slug === slug);
        if (page && page.status === 'active') {
            el.href = page.url;
            if (page.title) el.title = page.title;
        }
    });
    // Update footer links
    document.querySelectorAll('[data-slug]').forEach(el => {
        const slug = el.getAttribute('data-slug');
        const page = siteDB.pages.find(p => p.slug === slug);
        if (page && page.status === 'active') {
            el.href = page.url;
        }
    });
}

/* ── Navbar ──────────────────────────────────────── */
(function initNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;

    // Scroll shadow
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 10);
        nav.classList.toggle('shadow-md', window.scrollY > 10);
    }, { passive: true });

    // Mobile toggle
    const btn  = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
        btn.addEventListener('click', () => {
            const open = !menu.classList.contains('hidden');
            menu.classList.toggle('hidden', open);
            btn.querySelector('i').className = open
                ? 'fa-solid fa-bars text-2xl'
                : 'fa-solid fa-xmark text-2xl';
        });
        // Close on outside click
        document.addEventListener('click', e => {
            if (!nav.contains(e.target)) menu.classList.add('hidden');
        });
    }
})();

/* ── Lead Modal ──────────────────────────────────── */
const modal = document.getElementById('leadModal');

window.openModal = function(service) {
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (service) {
        const sel = document.querySelector('#contactForm select');
        if (sel) {
            const opt = [...sel.options].find(o => o.value === service || o.text.toLowerCase().includes(service.toLowerCase()));
            if (opt) sel.value = opt.value;
        }
    }
};

window.closeModal = function() {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
};

// Close on backdrop
if (modal) {
    modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
    });
    // ESC key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}

/* ── Form Submit ─────────────────────────────────── */
window.submitForm = function(e) {
    e.preventDefault();
    const form   = e.target;
    const submitBtn  = form.querySelector('button[type="submit"]');
    const origHTML = submitBtn.innerHTML;

    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';
    submitBtn.disabled = true;

    // Collect data
    const data = {
        name:     form.querySelector('input[type="text"]')?.value,
        phone:    form.querySelector('input[type="tel"]')?.value,
        service:  form.querySelector('select')?.value,
        source:   window.location.pathname,
        time:     new Date().toISOString(),
    };

    // Save to localStorage as lead log (production: send to backend)
    const leads = JSON.parse(localStorage.getItem('vnsolar_leads') || '[]');
    leads.unshift(data);
    localStorage.setItem('vnsolar_leads', JSON.stringify(leads));

    setTimeout(() => {
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Đã Gửi Thành Công!';
        submitBtn.classList.replace('bg-solar-600', 'bg-green-600');
        submitBtn.classList.remove('hover:bg-solar-700');

        setTimeout(() => {
            closeModal();
            form.reset();
            submitBtn.innerHTML = origHTML;
            submitBtn.disabled = false;
            submitBtn.classList.replace('bg-green-600', 'bg-solar-600');
            submitBtn.classList.add('hover:bg-solar-700');
        }, 2000);
    }, 900);
};

/* ── Calculator ──────────────────────────────────── */
window.updateCalculator = function() {
    const slider = document.getElementById('billSlider');
    if (!slider) return;

    const billValue = parseInt(slider.value);
    const fmt = new Intl.NumberFormat('vi-VN');

    document.getElementById('billDisplay').innerText = fmt.format(billValue) + ' đ';

    let kwp = (billValue / 300000).toFixed(1);
    if (parseFloat(kwp) < 3) kwp = '3.0';

    const area        = Math.round(parseFloat(kwp) * 5);
    const yearlySave  = Math.round(billValue * 12 * 0.6);
    const trees       = Math.round(parseFloat(kwp) * 10);
    const payback     = (parseFloat(kwp) * 18000000 / yearlySave).toFixed(1);

    document.getElementById('powerResult').innerText  = `~ ${kwp} kWp`;
    document.getElementById('areaResult').innerText   = `~ ${area} m²`;
    document.getElementById('savingResult').innerText = `~ ${fmt.format(yearlySave)} đ`;
    document.getElementById('treeResult').innerText   = trees;

    const pr = document.getElementById('paybackResult');
    if (pr) pr.innerText = `~ ${payback} năm`;
};

/* ── Page init ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    // Page fade-in
    document.body.classList.add('page-fade');

    // Calculator init
    updateCalculator();

    // Load DB (non-blocking)
    loadDB();

    // Active nav link
    const path = window.location.pathname.split('/').pop();
    document.querySelectorAll('nav a').forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href && href !== '#' && href.includes(path) && path) {
            a.classList.add('text-solar-600', 'font-bold');
        }
    });
});
