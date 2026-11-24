/* Math Analyst Visual Editor + Admin access gate
   Load after access.js. Admin editing is checked again on every save/upload/publish. */
(() => {
  'use strict';
  const sb = window.supabaseClient;
  const $ = (id, root = document) => root.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = v => JSON.parse(JSON.stringify(v));

  const defaults = {
    brand_label: 'MATH ANALYST RESOURCES',
    hero_title: 'Belajar Matematik\ndengan lebih yakin.',
    hero_subtitle: 'Latihan, kuiz dan simulasi peperiksaan dalam satu platform pembelajaran.',
    banner_url: '',
    background_color: '#17243b',
    accent_color: '#6857e8',
    host: {
      name: 'Teacher Ain',
      role: 'Pengasas & Pengajar Matematik',
      bio: 'Selamat datang ke Math Analyst Learning Hub.',
      image_url: ''
    },
    books: [
      {id:'algebra-berajah',title:'Kuasai Algebra Berajah',description:'Latihan algebra berajah untuk membina kefahaman konsep.',price:'RM16.90',url:'',image_url:'',visible:true},
      {id:'mini-algebra',title:'Mini Modul Algebra',description:'Modul ringkas bersaiz A5 untuk latihan kendiri.',price:'',url:'',image_url:'',visible:true},
      {id:'mini-geometri',title:'Mini Modul Geometri',description:'Koleksi latihan geometri dan kemahiran penyelesaian masalah.',price:'',url:'',image_url:'',visible:true},
      {id:'mind-booster',title:'Mind Booster Mathematics',description:'Latihan Matematik dwibahasa untuk Tahap 2.',price:'',url:'',image_url:'',visible:true}
    ],
    stickers: []
  };

  let cfg = clone(defaults);
  let editorMounted = false;
  let busy = false;

  function normalize(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};

    return {
      ...clone(defaults),
      ...raw,

      host: {
        ...clone(defaults.host),
        ...(raw.host || {})
      },

      books: Array.isArray(raw.books)
        ? raw.books.map((b, i) => ({
            id: b.id || `book-${i}`,
            title: b.title || '',
            description: b.description || '',
            price: b.price || '',
            url: b.url || '',
            image_url: b.image_url || '',
            visible: b.visible !== false
          }))
        : clone(defaults.books),

      stickers: Array.isArray(raw.stickers)
        ? raw.stickers.map((s, i) => ({
            id: s.id || `sticker-${i}`,
            image_url: s.image_url || '',
            alt: s.alt || 'Sticker Math Analyst',
            position: [
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right'
            ].includes(s.position) ? s.position : 'top-right',
            size: ['small','medium','large'].includes(s.size)
              ? s.size
              : 'medium'
          }))
        : []
    };
  }

  function status(msg, error = false) {
    const el = $('maVEStatus');
    if (el) {
      el.textContent = msg;
      el.style.color = error ? '#b42318' : '#64748b';
    }
  }

  // =========================================
  // 1. PENGESAHAN ADMIN
  // =========================================

  async function adminUser() {
    if (!sb) throw new Error('Supabase client tidak tersedia.');

    const {data, error} = await sb.auth.getUser();

    if (error) throw error;

    const user = data?.user;

    if (!user || user.is_anonymous) {
      throw new Error('Log masuk Admin diperlukan.');
    }

    const {data: profile, error: profileError} = await sb
      .from('profiles')
      .select('full_name,role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profile?.role !== 'admin') {
      throw new Error('Akses ditolak. Fungsi ini untuk Admin sahaja.');
    }

    return {user, profile};
  }

  // =========================================
  // 2. KAWALAN PAPARAN ADMIN
  // =========================================

  function gateStyles() {
    const s = document.createElement('style');
    s.id = 'maVisualEditorStyles';

    s.textContent = `
      #mainNav [data-page="admin"]:not(#maAdminNav) {
        display:none!important;
      }

      body:not(.ma-admin-authenticated) #page-admin {
        display:none!important;
      }

      body.ma-admin-authenticated #page-admin.active {
        display:block!important;
      }

      #page-admin>.page-intro,
      #page-admin>.admin-grid,
      #page-admin>.panel:not(.html-upload-panel) {
        display:none!important;
      }

      body.ma-admin-authenticated #page-admin .html-upload-panel {
        display:block!important;
      }

      #maAdminPanel #maAdminLogin {
        display:none!important;
      }

      #maAdminNav {display:none}

      body.ma-admin-authenticated #maAdminNav {
        display:flex!important;
      }

      #maAdminEntry {
        display:block;
        width:100%;
        margin-top:9px;
        padding:7px 8px;
        border:0;
        background:transparent;
        color:#9aa7ba;
        text-align:left;
        font-size:10px;
        cursor:pointer;
      }

      #maAdminGate {
        display:none;
        position:fixed;
        inset:0;
        z-index:100000;
        align-items:center;
        justify-content:center;
        padding:18px;
        background:#0c1423ad;
      }

      #maAdminGate .dialog {
        width:min(420px,100%);
        padding:24px;
        border-radius:16px;
        background:#fff;
        color:#172238;
        box-shadow:0 20px 60px #0003;
      }

      #maAdminGate h2 {margin:0 0 8px}

      #maAdminGate p,
      #maAdminGateStatus {
        font-size:12px;
        color:#68748a;
        line-height:1.5;
      }

      #maAdminGate label {
        display:block;
        margin:12px 0 5px;
        font-size:12px;
        font-weight:700;
      }

      #maAdminGate input {
        box-sizing:border-box;
        width:100%;
        padding:11px;
        border:1px solid #dfe4ed;
        border-radius:8px;
      }

      #maAdminGate button {
        border:0;
        border-radius:8px;
        padding:11px 14px;
        font-weight:700;
        cursor:pointer;
      }

      #maAdminGateClose {
        float:right;
        background:#edf0f6;
        color:#263348;
      }

      #maAdminGateSubmit {
        width:100%;
        margin-top:15px;
        background:#6857e8;
        color:#fff;
      }

      /* Visual editor */

      #maVisualEditor {
        margin:22px 0;
        padding:20px;
        border:1px solid #e4e8f0;
        border-radius:18px;
        background:#fff;
        color:#18243a;
      }

      #maVisualEditor * {box-sizing:border-box}

      #maVisualEditor h2 {
        font-size:22px;
        margin:0 0 7px;
      }

      #maVisualEditor h3 {
        font-size:16px;
        margin:0 0 12px;
      }

      #maVisualEditor p {
        font-size:12px;
        color:#68748a;
        line-height:1.5;
      }

      .ma-ve-sec {
        border:1px solid #e7ebf2;
        border-radius:12px;
        padding:15px;
        margin-top:14px;
      }

      .ma-ve-grid {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
      }

      .ma-ve-field {
        display:flex;
        flex-direction:column;
        gap:6px;
        margin:8px 0;
      }

      .ma-ve-field label {
        font-size:12px;
        font-weight:700;
        color:#344158;
      }

      .ma-ve-field input,
      .ma-ve-field textarea,
      .ma-ve-field select {
        width:100%;
        min-width:0;
        padding:10px;
        border:1px solid #dce2ec;
        border-radius:8px;
        font:inherit;
        font-size:13px;
        background:#fff;
        color:#172238;
      }

      .ma-ve-field textarea {
        resize:vertical;
        min-height:65px;
      }

      .ma-ve-field input[type=color] {
        height:42px;
        padding:4px;
      }

      .ma-ve-card {
        background:#fafbfe;
        border:1px solid #e7ebf2;
        border-radius:10px;
        padding:12px;
        margin:10px 0;
      }

      .ma-ve-head {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
      }

      .ma-ve-upload {
        display:flex;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
      }

      .ma-ve-thumb {
        width:84px;
        height:70px;
        object-fit:cover;
        border:1px solid #e2e6ee;
        border-radius:8px;
        background:#f3f5f9;
      }

      .ma-ve-thumb.square {
        width:68px;
        height:68px;
      }

      .ma-ve-btn {
        border:0;
        border-radius:8px;
        padding:10px 13px;
        background:#6857e8;
        color:#fff;
        font-weight:700;
        cursor:pointer;
      }

      .ma-ve-btn.secondary {
        background:#eef1f6;
        color:#263348;
      }

      .ma-ve-btn.publish {background:#16865b}
      .ma-ve-btn.danger {background:#fff0f0;color:#b42318}
      .ma-ve-btn:disabled {opacity:.55}

      .ma-ve-actions {
        display:flex;
        gap:9px;
        flex-wrap:wrap;
        margin-top:15px;
      }

      .ma-ve-status {
        font-size:12px;
        min-height:20px;
        margin-top:10px;
        white-space:pre-wrap;
      }

      .ma-ve-preview {
        margin-top:12px;
        padding:14px;
        border-radius:12px;
        background:#f0f3f8;
      }

      .ma-ve-hero {
        position:relative;
        overflow:hidden;
        min-height:170px;
        border-radius:10px;
        padding:20px;
        color:#fff;
        background-position:center;
        background-size:cover;
      }

      .ma-ve-hero h3 {
        font-size:23px;
        color:#fff;
        white-space:pre-line;
        margin:10px 0;
      }

      .ma-ve-host {
        width:60px;
        height:60px;
        object-fit:cover;
        border-radius:50%;
        border:2px solid white;
        vertical-align:middle;
        margin-right:9px;
      }

      .ma-ve-books {
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:9px;
        margin-top:10px;
      }

      .ma-ve-book {
        font-size:11px;
        background:#fff;
        border-radius:8px;
        padding:8px;
        min-width:0;
      }

      .ma-ve-book img {
        width:100%;
        height:86px;
        object-fit:contain;
        background:#f2f4f8;
        border-radius:5px;
      }

      .ma-home-host {
        display:flex;
        gap:10px;
        align-items:center;
        position:relative;
        z-index:2;
        margin-top:12px;
        color:#fff;
      }

      .ma-home-host img {
        width:76px;
        height:76px;
        object-fit:cover;
        border-radius:50%;
        border:3px solid white;
      }

      .ma-home-host strong,
      .ma-home-host span {display:block}

      .ma-home-host span {
        font-size:11px;
        margin-top:3px;
      }

      .ma-home-sticker {
        position:absolute;
        z-index:3;
        object-fit:contain;
        pointer-events:none;
        filter:drop-shadow(0 4px 7px #0002);
      }

      .ma-home-sticker.small {width:52px;height:52px}
      .ma-home-sticker.medium {width:76px;height:76px}
      .ma-home-sticker.large {width:102px;height:102px}

      .ma-home-sticker.top-left {top:10px;left:10px}
      .ma-home-sticker.top-right {top:10px;right:10px}
      .ma-home-sticker.bottom-left {bottom:10px;left:10px}
      .ma-home-sticker.bottom-right {bottom:10px;right:10px}

      @media(max-width:700px) {
        .ma-ve-grid {grid-template-columns:1fr}
        .ma-ve-books {grid-template-columns:repeat(2,minmax(0,1fr))}
        #maVisualEditor {padding:14px}
      }
    `;

    document.head.appendChild(s);
  }

  // =========================================
  // 3. ADMIN LOGIN DAN PORTAL
  // =========================================

  function buildGate() {
    const bottom = document.querySelector('.sidebar-bottom');

    if (bottom && !$('maAdminEntry')) {
      const b = document.createElement('button');
      b.id = 'maAdminEntry';
      b.type = 'button';
      b.textContent = 'Akses Admin';

      b.onclick = async () => {
        try {
          const info = await adminUser();
          revealAdmin(info);
          openAdmin();
        } catch {
          $('maAdminGate').style.display = 'flex';
          $('maAdminGateEmail').focus();
        }
      };

      bottom.appendChild(b);
    }

    if ($('maAdminGate')) return;

    const modal = document.createElement('div');
    modal.id = 'maAdminGate';

    modal.innerHTML = `
      <div class="dialog" role="dialog" aria-modal="true">
        <button id="maAdminGateClose" type="button" style="float:right">✕</button>
        <h2>Portal Admin</h2>
        <p>Log masuk menggunakan akaun Admin Math Analyst. Akaun pelajar tidak mempunyai akses pengurusan.</p>

        <form id="maAdminGateForm">
          <label for="maAdminGateEmail">E-mel Admin</label>
          <input id="maAdminGateEmail" type="email" autocomplete="username" required>

          <label for="maAdminGatePassword">Kata laluan</label>
          <input id="maAdminGatePassword" type="password" autocomplete="current-password" required>

          <button id="maAdminGateSubmit" type="submit">Log masuk</button>
        </form>

        <div id="maAdminGateStatus" aria-live="polite"></div>
      </div>
    `;

    document.body.appendChild(modal);

    $('maAdminGateClose').onclick = () => {
      modal.style.display = 'none';
      $('maAdminGateForm').reset();
    };

    modal.addEventListener('click', e => {
      if (e.target === modal) modal.style.display = 'none';
    });

    $('maAdminGateForm').addEventListener('submit', loginAdmin);
  }

  function ensureAdminNav() {
    const nav = $('mainNav');
    if (!nav || $('maAdminNav')) return;

    const b = document.createElement('button');
    b.id = 'maAdminNav';
    b.type = 'button';
    b.className = 'nav-item';
    b.innerHTML = '⚙ <span>Portal Admin</span>';
    b.onclick = openAdmin;

    nav.appendChild(b);
  }

  function openAdmin() {
    if (!document.body.classList.contains('ma-admin-authenticated')) return;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    $('page-admin')?.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.toggle('active', b.id === 'maAdminNav');
    });

    if ($('pageTitle')) $('pageTitle').textContent = 'Portal Admin';

    $('mainNav')?.parentElement.classList.remove('open');
    window.scrollTo(0, 0);
  }

  function revealAdmin(info) {
    document.body.classList.add('ma-admin-authenticated');
    ensureAdminNav();

    const page = $('page-admin');
    const panel = $('maAdminPanel');

    if (page && panel && panel.parentElement !== page) {
      page.insertBefore(panel, page.firstChild);
    }

    $('maAdminLogin')?.classList.add('hidden');
    $('maAdminTools')?.classList.remove('hidden');

    if ($('maAdminWho')) {
      $('maAdminWho').textContent =
        'Admin: ' + (info?.profile?.full_name || info?.user?.email || '');
    }

    if ($('maAdminEntry')) {
      $('maAdminEntry').textContent = 'Portal Admin aktif';
    }

    if (!editorMounted) mountEditor();
  }

  function concealAdmin() {
    const wasOpen = $('page-admin')?.classList.contains('active');

    document.body.classList.remove('ma-admin-authenticated');
    $('maAdminNav')?.remove();
    $('page-admin')?.classList.remove('active');
    $('maAdminTools')?.classList.add('hidden');

    if ($('maAdminEntry')) $('maAdminEntry').textContent = 'Akses Admin';

    if (wasOpen) {
      $('page-home')?.classList.add('active');
      if ($('pageTitle')) $('pageTitle').textContent = 'Dashboard';
    }
  }

  async function loginAdmin(e) {
    e.preventDefault();

    const btn = $('maAdminGateSubmit');
    const st = $('maAdminGateStatus');

    btn.disabled = true;
    btn.textContent = 'Mengesahkan...';

    try {
      const {error} = await sb.auth.signInWithPassword({
        email: $('maAdminGateEmail').value.trim(),
        password: $('maAdminGatePassword').value
      });

      if (error) throw error;

      const info = await adminUser();

      $('maAdminGate').style.display = 'none';
      $('maAdminGateForm').reset();

      revealAdmin(info);
      openAdmin();

    } catch (err) {
      st.textContent = err.message;
      st.style.color = '#b42318';

    } finally {
      btn.disabled = false;
      btn.textContent = 'Log masuk';
    }
  }

  async function syncAdmin() {
    try {
      const info = await adminUser();
      revealAdmin(info);
    } catch {
      concealAdmin();
    }
  }

  // =========================================
  // 4. KAD BUKU DAN STICKER DALAM EDITOR
  // =========================================

  function bookCard(b, i) {
    return `
      <div class="ma-ve-card" data-book-card="${i}">
        <div class="ma-ve-head">
          <b>Buku ${i+1}</b>
          <button class="ma-ve-btn danger" type="button" data-remove-book="${i}">Buang</button>
        </div>

        <div class="ma-ve-grid">
          <div class="ma-ve-field">
            <label>Tajuk buku</label>
            <input data-bf="title" data-i="${i}" value="${esc(b.title)}" maxlength="120">
          </div>

          <div class="ma-ve-field">
            <label>Harga</label>
            <input data-bf="price" data-i="${i}" value="${esc(b.price)}" placeholder="RM16.90">
          </div>
        </div>

        <div class="ma-ve-field">
          <label>Penerangan</label>
          <textarea data-bf="description" data-i="${i}" maxlength="300">${esc(b.description)}</textarea>
        </div>

        <div class="ma-ve-field">
          <label>Pautan pembelian</label>
          <input type="url" data-bf="url" data-i="${i}" value="${esc(b.url)}" placeholder="https://...">
        </div>

        <div class="ma-ve-upload">
          <img class="ma-ve-thumb" data-bthumb="${i}" src="${esc(b.image_url)}" alt="Cover buku" ${b.image_url?'':'style="display:none"'}>
          <label class="ma-ve-field" style="flex:1">
            Upload cover JPG/PNG/WebP
            <input type="file" accept="image/jpeg,image/png,image/webp" data-upload="book" data-i="${i}">
          </label>
        </div>

        <label class="ma-ve-field">
          <span>
            <input type="checkbox" data-bf="visible" data-i="${i}" ${b.visible?'checked':''}>
            Paparkan buku ini di Kedai Buku
          </span>
        </label>
      </div>
    `;
  }

  function stickerCard(s, i) {
    return `
      <div class="ma-ve-card" data-sticker-card="${i}">
        <div class="ma-ve-head">
          <b>Sticker ${i+1}</b>
          <button class="ma-ve-btn danger" type="button" data-remove-sticker="${i}">Buang</button>
        </div>

        <div class="ma-ve-upload">
          <img class="ma-ve-thumb square" data-sthumb="${i}" src="${esc(s.image_url)}" alt="Sticker" ${s.image_url?'':'style="display:none"'}>
          <label class="ma-ve-field" style="flex:1">
            Upload sticker JPG/PNG/WebP
            <input type="file" accept="image/jpeg,image/png,image/webp" data-upload="sticker" data-i="${i}">
          </label>
        </div>

        <div class="ma-ve-grid">
          <div class="ma-ve-field">
            <label>Nama sticker</label>
            <input data-sf="alt" data-i="${i}" value="${esc(s.alt)}">
          </div>

          <div class="ma-ve-field">
            <label>Kedudukan</label>
            <select data-sf="position" data-i="${i}">
              ${['top-left','top-right','bottom-left','bottom-right'].map(v=>`<option value="${v}" ${s.position===v?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>

          <div class="ma-ve-field">
            <label>Saiz</label>
            <select data-sf="size" data-i="${i}">
              ${['small','medium','large'].map(v=>`<option value="${v}" ${s.size===v?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================
  // 5. PRATONTON
  // =========================================

  function preview(c) {
    const books = c.books
      .filter(b => b.visible)
      .map(b => `
        <div class="ma-ve-book">
          ${b.image_url
            ? `<img src="${esc(b.image_url)}">`
            : '<div style="height:86px;background:#edf0f6"></div>'}
          <b>${esc(b.title)}</b>
          <div>${esc(b.price)}</div>
        </div>
      `).join('');

    const stickers = c.stickers
      .filter(s => s.image_url)
      .map(s => `
        <img class="ma-home-sticker ${s.position} ${s.size}"
             src="${esc(s.image_url)}"
             alt="${esc(s.alt)}">
      `).join('');

    return `
      <div class="ma-ve-hero"
           style="background-color:${esc(c.background_color)};
           ${c.banner_url ? `background-image:linear-gradient(90deg,${esc(c.background_color)}ef,${esc(c.background_color)}55),url('${esc(c.banner_url)}')` : ''}">

        <small>${esc(c.brand_label)}</small>
        <h3>${esc(c.hero_title)}</h3>
        <p style="color:white">${esc(c.hero_subtitle)}</p>

        ${c.host.name || c.host.image_url ? `
          <div>
            ${c.host.image_url
              ? `<img class="ma-ve-host" src="${esc(c.host.image_url)}">`
              : ''}
            <b>${esc(c.host.name)}</b>
            <div>${esc(c.host.role)}</div>
          </div>
        ` : ''}

        ${stickers}
      </div>

      <div class="ma-ve-books">
        ${books || '<p>Tiada buku dipaparkan.</p>'}
      </div>
    `;
  }

  // =========================================
  // 6. AMBIL NILAI DARIPADA BORANG
  // =========================================

  function readForm() {
    const n = clone(cfg);

    n.brand_label = $('maVEBrand').value.trim();
    n.hero_title = $('maVEHeroTitle').value.trim();
    n.hero_subtitle = $('maVEHeroSubtitle').value.trim();
    n.background_color = $('maVEBackground').value;
    n.accent_color = $('maVEAccent').value;

    n.host = {
      name: $('maVEHostName').value.trim(),
      role: $('maVEHostRole').value.trim(),
      bio: $('maVEHostBio').value.trim(),
      image_url: n.host.image_url || ''
    };

    document.querySelectorAll('[data-book-card]').forEach(card => {
      const i = Number(card.dataset.bookCard);

      card.querySelectorAll('[data-bf]').forEach(el => {
        n.books[i][el.dataset.bf] =
          el.dataset.bf === 'visible'
            ? el.checked
            : el.value.trim();
      });
    });

    document.querySelectorAll('[data-sticker-card]').forEach(card => {
      const i = Number(card.dataset.stickerCard);

      card.querySelectorAll('[data-sf]').forEach(el => {
        n.stickers[i][el.dataset.sf] = el.value;
      });
    });

    return n;
  }

  // =========================================
  // 7. BINA PAPARAN EDITOR
  // =========================================

  function renderEditor() {
    const root = $('maVisualEditor');
    if (!root) return;

    root.innerHTML = `
      <div class="ma-ve-head">
        <div>
          <small style="letter-spacing:2px;color:#7b879b">
            MATH ANALYST DESIGN STUDIO
          </small>
          <h2>Pengurusan Paparan</h2>
          <p>Ubah banner, profil host, cover buku dan sticker.
          Pengunjung hanya melihat paparan yang telah diterbitkan.</p>
        </div>
        <b style="font-size:11px;color:#16865b">ADMIN SAHAJA</b>
      </div>

      <div class="ma-ve-sec">
        <h3>1. Banner dan tajuk utama</h3>

        <div class="ma-ve-field">
          <label>Label jenama</label>
          <input id="maVEBrand" value="${esc(cfg.brand_label)}">
        </div>

        <div class="ma-ve-field">
          <label>Tajuk utama</label>
          <textarea id="maVEHeroTitle">${esc(cfg.hero_title)}</textarea>
        </div>

        <div class="ma-ve-field">
          <label>Penerangan</label>
          <textarea id="maVEHeroSubtitle">${esc(cfg.hero_subtitle)}</textarea>
        </div>

        <div class="ma-ve-upload">
          <img class="ma-ve-thumb" id="maVEBannerThumb"
               src="${esc(cfg.banner_url)}"
               ${cfg.banner_url?'':'style="display:none"'}>
          <label class="ma-ve-field" style="flex:1">
            Upload banner JPG/PNG/WebP
            <input id="maVEBannerFile" type="file"
                   accept="image/jpeg,image/png,image/webp"
                   data-upload="banner">
          </label>
        </div>

        <div class="ma-ve-grid">
          <div class="ma-ve-field">
            <label>Warna latar</label>
            <input id="maVEBackground" type="color" value="${esc(cfg.background_color)}">
          </div>
          <div class="ma-ve-field">
            <label>Warna butang</label>
            <input id="maVEAccent" type="color" value="${esc(cfg.accent_color)}">
          </div>
        </div>
      </div>

      <div class="ma-ve-sec">
        <h3>2. Profil host / guru</h3>

        <div class="ma-ve-grid">
          <div class="ma-ve-field">
            <label>Nama host</label>
            <input id="maVEHostName" value="${esc(cfg.host.name)}">
          </div>
          <div class="ma-ve-field">
            <label>Jawatan / peranan</label>
            <input id="maVEHostRole" value="${esc(cfg.host.role)}">
          </div>
        </div>

        <div class="ma-ve-field">
          <label>Pengenalan ringkas</label>
          <textarea id="maVEHostBio">${esc(cfg.host.bio)}</textarea>
        </div>

        <div class="ma-ve-upload">
          <img class="ma-ve-thumb square" id="maVEHostThumb"
               src="${esc(cfg.host.image_url)}"
               ${cfg.host.image_url?'':'style="display:none"'}>
          <label class="ma-ve-field" style="flex:1">
            Upload gambar host JPG/PNG/WebP
            <input type="file" accept="image/jpeg,image/png,image/webp" data-upload="host">
          </label>
        </div>
      </div>

      <div class="ma-ve-sec">
        <div class="ma-ve-head">
          <h3>3. Buku Math Analyst</h3>
          <button class="ma-ve-btn secondary" id="maVEAddBook" type="button">
            + Tambah buku
          </button>
        </div>
        <div id="maVEBooks">${cfg.books.map(bookCard).join('')}</div>
      </div>

      <div class="ma-ve-sec">
        <div class="ma-ve-head">
          <h3>4. Sticker dan hiasan</h3>
          <button class="ma-ve-btn secondary" id="maVEAddSticker" type="button">
            + Tambah sticker
          </button>
        </div>
        <p>PNG berlatar lutsinar paling sesuai untuk sticker.</p>
        <div id="maVEStickers">
          ${cfg.stickers.map(stickerCard).join('') || '<p>Belum ada sticker ditambah.</p>'}
        </div>
      </div>

      <div class="ma-ve-sec">
        <div class="ma-ve-head">
          <h3>5. Pratonton</h3>
          <button class="ma-ve-btn secondary" id="maVEPreview" type="button">
            Kemaskini pratonton
          </button>
        </div>
        <div class="ma-ve-preview" id="maVEPreviewArea">
          ${preview(cfg)}
        </div>
      </div>

      <div class="ma-ve-actions">
        <button class="ma-ve-btn secondary" id="maVELoadDraft" type="button">
          Muat semula draft
        </button>
        <button class="ma-ve-btn" id="maVESave" type="button">
          Simpan Draft
        </button>
        <button class="ma-ve-btn publish" id="maVEPublish" type="button">
          Terbitkan Dashboard
        </button>
      </div>

      <div class="ma-ve-status" id="maVEStatus"
           role="status" aria-live="polite"></div>
    `;

    bindEvents();
  }

  // =========================================
  // 8. BUTANG DAN UPLOAD GAMBAR
  // =========================================

  function bindEvents() {
    $('maVEAddBook').onclick = () => {
      cfg = readForm();
      cfg.books.push({
        id:`book-${Date.now()}`,
        title:'',
        description:'',
        price:'',
        url:'',
        image_url:'',
        visible:true
      });
      renderEditor();
    };

    $('maVEAddSticker').onclick = () => {
      cfg = readForm();
      cfg.stickers.push({
        id:`sticker-${Date.now()}`,
        image_url:'',
        alt:'Sticker Math Analyst',
        position:'top-right',
        size:'medium'
      });
      renderEditor();
    };

    document.querySelectorAll('[data-remove-book]').forEach(b => {
      b.onclick = () => {
        cfg = readForm();
        cfg.books.splice(Number(b.dataset.removeBook), 1);
        renderEditor();
      };
    });

    document.querySelectorAll('[data-remove-sticker]').forEach(b => {
      b.onclick = () => {
        cfg = readForm();
        cfg.stickers.splice(Number(b.dataset.removeSticker), 1);
        renderEditor();
      };
    });

    $('maVEPreview').onclick = () => {
      cfg = readForm();
      $('maVEPreviewArea').innerHTML = preview(cfg);
      status('Pratonton dikemas kini. Belum diterbitkan.');
    };

    $('maVELoadDraft').onclick = loadDraft;
    $('maVESave').onclick = () => saveConfig(false);
    $('maVEPublish').onclick = () => saveConfig(true);

    document.querySelectorAll('[data-upload]').forEach(input => {
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;

        cfg = readForm();

        try {
          const url = await uploadImage(file, input.dataset.upload);

          if (input.dataset.upload === 'banner') {
            cfg.banner_url = url;
          } else if (input.dataset.upload === 'host') {
            cfg.host.image_url = url;
          } else if (input.dataset.upload === 'book') {
            cfg.books[Number(input.dataset.i)].image_url = url;
          } else if (input.dataset.upload === 'sticker') {
            cfg.stickers[Number(input.dataset.i)].image_url = url;
          }

          renderEditor();
          $('maVEPreviewArea').innerHTML = preview(cfg);
          status('Gambar berjaya dimuat naik. Tekan Simpan Draft untuk menyimpan tetapan.');

        } catch(err) {
          status('Upload gagal: ' + err.message, true);
        }
      });
    });
  }

  async function uploadImage(file, kind) {
    const user = await adminUser();

    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      throw new Error('Format perlu JPG, PNG atau WebP.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Saiz maksimum gambar ialah 5 MB.');
    }

    const safe = file.name.toLowerCase()
      .replace(/[^a-z0-9._-]/g,'-')
      .slice(-70);

    const path =
      `visual-editor/${user.user.id}/${kind}-${Date.now()}-${safe}`;

    const {data,error} = await sb.storage
      .from('ma-site-assets')
      .upload(path,file,{
        cacheControl:'3600',
        upsert:false,
        contentType:file.type
      });

    if(error) throw error;

    return sb.storage
      .from('ma-site-assets')
      .getPublicUrl(data.path).data.publicUrl;
  }

  // =========================================
  // 9. DRAFT DAN TERBITKAN
  // =========================================

  async function loadDraft() {
    try {
      await adminUser();
      status('Memuatkan tetapan...');

      const {data,error} = await sb.rpc('ma_admin_get_appearance');
      if(error) throw error;

      const d = data?.draft;
      const p = data?.published;

      cfg = normalize(
        d && Object.keys(d).length
          ? d
          : (p && Object.keys(p).length ? p : defaults)
      );

      renderEditor();
      status('Draft berjaya dimuatkan.');

    } catch(err) {
      status('Gagal memuatkan: ' + err.message, true);
    }
  }

  async function saveConfig(publish) {
    if(busy) return;
    busy = true;

    const save = $('maVESave');
    const pub = $('maVEPublish');

    save.disabled = true;
    pub.disabled = true;

    try {
      await adminUser();
      cfg = readForm();

      for (const b of cfg.books) {
        if (b.url) {
          const u = new URL(b.url);
          if (!['http:','https:'].includes(u.protocol)) {
            throw new Error('Pautan buku mesti bermula dengan http:// atau https://');
          }
        }
      }

      status(publish ? 'Menyimpan dan menerbitkan...' : 'Menyimpan draft...');

      const {error} = await sb.rpc('ma_admin_save_appearance', {
        p_config: cfg
      });

      if(error) throw error;

      if(publish) {
        if(!confirm('Terbitkan perubahan ini kepada semua pengunjung dan pelajar?')) {
          status('Draft disimpan. Penerbitan dibatalkan.');
          return;
        }

        const {error: publishError} =
          await sb.rpc('ma_admin_publish_appearance');

        if(publishError) throw publishError;

        applyAppearance(cfg);
        status('Berjaya! Paparan baharu diterbitkan kepada semua pengunjung.');

      } else {
        status('Draft berjaya disimpan. Pengunjung masih melihat paparan yang diterbitkan sebelum ini.');
      }

      $('maVEPreviewArea').innerHTML = preview(cfg);

    } catch(err) {
      status('Gagal menyimpan: ' + err.message, true);

    } finally {
      busy = false;
      save.disabled = false;
      pub.disabled = false;
    }
  }

  // =========================================
  // 10. PAPAR TETAPAN YANG TELAH DITERBITKAN
  // =========================================

  function applyAppearance(raw) {
    const c = normalize(raw);
    const home = $('page-home');
    const hero = home?.querySelector('.welcome-card');

    if(!hero) return;

    const brand = hero.querySelector('.eyebrow.light');
    const title = hero.querySelector('h2');
    const sub = hero.querySelector('p');

    if(brand) brand.textContent = c.brand_label;

    if(title) {
      title.textContent = c.hero_title;
      title.style.whiteSpace = 'pre-line';
    }

    if(sub) sub.textContent = c.hero_subtitle;

    hero.style.position = 'relative';
    hero.style.overflow = 'hidden';
    hero.style.backgroundColor = c.background_color;

    hero.style.backgroundImage = c.banner_url
      ? `linear-gradient(90deg,${c.background_color}ef,${c.background_color}55),url("${c.banner_url.replace(/["\\]/g,'')}")`
      : '';

    hero.style.backgroundSize = 'cover';
    hero.style.backgroundPosition = 'center';

    document.documentElement.style.setProperty('--ma-accent', c.accent_color);

    document.querySelectorAll('.btn-primary').forEach(b => {
      b.style.backgroundColor = c.accent_color;
    });

    hero.querySelectorAll('.ma-home-sticker').forEach(x => x.remove());

    c.stickers.filter(s => s.image_url).forEach(s => {
      const im = document.createElement('img');
      im.className = `ma-home-sticker ${s.position} ${s.size}`;
      im.src = s.image_url;
      im.alt = s.alt;
      hero.appendChild(im);
    });

    let host = $('maHomeHost');

    if(!host) {
      host = document.createElement('div');
      host.id = 'maHomeHost';
      host.className = 'ma-home-host';

      const art = hero.querySelector('.welcome-art');
      (art || hero).appendChild(host);
    }

    host.innerHTML = `
      ${c.host.image_url
        ? `<img src="${esc(c.host.image_url)}" alt="${esc(c.host.name)}">`
        : ''}
      <div>
        <strong>${esc(c.host.name)}</strong>
        <span>${esc(c.host.role)}</span>
        ${c.host.bio ? `<span>${esc(c.host.bio)}</span>` : ''}
      </div>
    `;

    host.style.display = (c.host.name || c.host.image_url) ? 'flex' : 'none';

    renderBooks(c.books);
  }

  function renderBooks(books) {
    const grid = $('bookGrid');
    if(!grid) return;

    const visible = books.filter(b => b.visible);

    if(!visible.length) {
      grid.innerHTML = '<p class="empty-state">Buku akan dipaparkan tidak lama lagi.</p>';
      return;
    }

    grid.innerHTML = visible.map(b => {
      let link = '';

      try {
        const u = new URL(b.url);
        if(['http:','https:'].includes(u.protocol)) link = u.href;
      } catch {}

      return `
        <article class="book-card">
          <div class="book-cover" style="position:relative;overflow:hidden">
            ${b.image_url
              ? `<img src="${esc(b.image_url)}" alt="${esc(b.title)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain">`
              : `<span>${esc(b.title)}<small style="display:block;font-size:9px;margin-top:8px">MATH ANALYST</small></span>`}
          </div>

          <div class="book-info">
            <h3>${esc(b.title)}</h3>
            <p>${esc(b.description)}</p>
            <div class="price">${esc(b.price)}</div>

            ${link
              ? `<a class="btn btn-primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Beli / Lihat buku</a>`
              : '<span class="tag">Pautan pembelian belum ditetapkan</span>'}
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadPublished() {
    if(!sb) return;

    try {
      const {data,error} = await sb.rpc('ma_get_published_appearance');

      if(error) throw error;

      if(data && typeof data === 'object' && Object.keys(data).length) {
        applyAppearance(data);
      }

    } catch(e) {
      console.warn('Tetapan paparan awam belum tersedia:', e.message);
    }
  }

  // =========================================
  // 11. MASUKKAN EDITOR KE DALAM PORTAL ADMIN
  // =========================================

  async function mountEditor() {
    if(editorMounted || !sb || !$('maAdminTools')) return;

    editorMounted = true;

    const root = document.createElement('section');
    root.id = 'maVisualEditor';

    $('maAdminTools').appendChild(root);

    try {
      await adminUser();
      await loadDraft();
    } catch {
      root.innerHTML = `
        <h3>Pengurusan Paparan</h3>
        <p>Log masuk Admin diperlukan untuk menggunakan Visual Editor.</p>
      `;
    }
  }

  // =========================================
  // 12. MULA SISTEM
  // =========================================

  function init() {
    if(!sb) {
      console.error('Visual Editor: Supabase client tiada.');
      return;
    }

    gateStyles();
    buildGate();

    $('mainNav')
      ?.querySelector('[data-page="admin"]')
      ?.setAttribute('aria-hidden','true');

    loadPublished();

    const observer = new MutationObserver(() => {
      if($('maAdminTools')) {
        mountEditor();
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true
    });

    if($('maAdminTools')) {
      mountEditor();
      observer.disconnect();
    }

    syncAdmin();

    sb.auth.onAuthStateChange(() => {
      window.setTimeout(async () => {
        await syncAdmin();

        if(document.body.classList.contains('ma-admin-authenticated')) {
          if(!editorMounted) {
            await mountEditor();
          } else if($('maVisualEditor') && !$('maVEStatus')) {
            await loadDraft();
          }
        }
      },0);
    });
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',init,{once:true});
  } else {
    init();
  }
})();
