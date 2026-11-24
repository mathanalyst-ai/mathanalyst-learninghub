/* Math Analyst Learning Hub — Admin visibility and access gate.
   Load AFTER access.js. */

(() => {
  'use strict';

  const sb = window.supabaseClient;
  const $ = id => document.getElementById(id);

  const css = document.createElement('style');

  css.textContent = `
    #mainNav [data-page="admin"]:not(#maAdminNav) {
      display: none !important;
    }

    body:not(.ma-admin-authenticated) #page-admin {
      display: none !important;
    }

    body.ma-admin-authenticated #page-admin.active {
      display: block !important;
    }

    #page-admin > .page-intro,
    #page-admin > .admin-grid,
    #page-admin > .panel:not(.html-upload-panel) {
      display: none !important;
    }

    body.ma-admin-authenticated #page-admin .html-upload-panel {
      display: block !important;
    }

    #maAdminPanel #maAdminLogin {
      display: none !important;
    }

    #maAdminNav {
      display: none;
    }

    body.ma-admin-authenticated #maAdminNav {
      display: flex !important;
    }

    #maAdminEntry {
      display: block;
      width: 100%;
      margin-top: 9px;
      padding: 7px 8px;
      border: 0;
      background: transparent;
      color: #9aa7ba;
      text-align: left;
      font-size: 10px;
      cursor: pointer;
    }

    #maAdminEntry:hover {
      color: #fff;
    }

    #maAdminGate {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 100000;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: #0c1423ad;
    }

    #maAdminGate .dialog {
      width: min(420px, 100%);
      padding: 25px;
      border-radius: 16px;
      background: #fff;
      color: #172238;
      box-shadow: 0 20px 60px #0003;
    }

    #maAdminGate h2 {
      margin: 0 0 8px;
      font-size: 21px;
    }

    #maAdminGate p,
    #maAdminGateStatus {
      font-size: 12px;
      color: #68748a;
      line-height: 1.6;
    }

    #maAdminGate label {
      display: block;
      margin: 12px 0 5px;
      font-size: 12px;
      font-weight: 700;
    }

    #maAdminGate input {
      box-sizing: border-box;
      width: 100%;
      padding: 11px;
      border: 1px solid #dfe4ed;
      border-radius: 8px;
      font: inherit;
    }

    #maAdminGate button {
      border: 0;
      border-radius: 8px;
      padding: 11px 14px;
      font-weight: 700;
      cursor: pointer;
    }

    #maAdminGateClose {
      float: right;
      background: #edf0f6;
      color: #263348;
    }

    #maAdminGateSubmit {
      width: 100%;
      margin-top: 15px;
      background: #6857e8;
      color: #fff;
    }
  `;

  document.head.appendChild(css);

  function setStatus(message, error = false) {
    const el = $('maAdminGateStatus');

    if (el) {
      el.textContent = message;
      el.style.color = error ? '#b42318' : '#68748a';
    }
  }

  // ==================================
  // PINTU MASUK ADMIN
  // ==================================

  function buildGate() {
    const bottom = document.querySelector('.sidebar-bottom');

    if (bottom && !$('maAdminEntry')) {
      const entry = document.createElement('button');

      entry.id = 'maAdminEntry';
      entry.type = 'button';
      entry.textContent = 'Akses Admin';

      entry.addEventListener('click', () => {
        $('maAdminGate').style.display = 'flex';
        $('maAdminGateEmail').focus();
      });

      bottom.appendChild(entry);
    }

    if ($('maAdminGate')) return;

    const modal = document.createElement('div');

    modal.id = 'maAdminGate';

    modal.innerHTML = `
      <div class="dialog"
           role="dialog"
           aria-modal="true"
           aria-labelledby="maAdminGateTitle">

        <button id="maAdminGateClose"
                type="button"
                aria-label="Tutup">
          ✕
        </button>

        <h2 id="maAdminGateTitle">
          Portal Admin
        </h2>

        <p>
          Log masuk menggunakan akaun Admin Math Analyst.
          Akaun pelajar tidak mempunyai akses pengurusan.
        </p>

        <form id="maAdminGateForm">

          <label for="maAdminGateEmail">
            E-mel Admin
          </label>

          <input id="maAdminGateEmail"
                 type="email"
                 autocomplete="username"
                 required>

          <label for="maAdminGatePassword">
            Kata laluan
          </label>

          <input id="maAdminGatePassword"
                 type="password"
                 autocomplete="current-password"
                 required>

          <button id="maAdminGateSubmit" type="submit">
            Log masuk
          </button>

        </form>

        <div id="maAdminGateStatus"
             aria-live="polite"></div>
      </div>
    `;

    document.body.appendChild(modal);

    $('maAdminGateClose').addEventListener(
      'click',
      closeGate
    );

    modal.addEventListener('click', event => {
      if (event.target === modal) closeGate();
    });

    $('maAdminGateForm').addEventListener(
      'submit',
      loginAdmin
    );
  }

  function closeGate() {
    if ($('maAdminGate')) {
      $('maAdminGate').style.display = 'none';
    }

    $('maAdminGateForm')?.reset();
  }

  // ==================================
  // SEMAK ROLE ADMIN DI SUPABASE
  // ==================================

  async function verifiedAdmin() {
    if (!sb) {
      throw new Error('Sambungan Supabase tidak tersedia.');
    }

    const { data: userData, error: userError } =
      await sb.auth.getUser();

    if (userError) throw userError;

    const user = userData?.user;

    if (!user || user.is_anonymous) return null;

    const { data: profile, error } = await sb
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (profile?.role !== 'admin') return null;

    return { user, profile };
  }

  // ==================================
  // MENU PORTAL ADMIN
  // ==================================

  function ensureAdminNav() {
    const nav = $('mainNav');

    if (!nav || $('maAdminNav')) return;

    const btn = document.createElement('button');

    btn.id = 'maAdminNav';
    btn.type = 'button';
    btn.className = 'nav-item';

    btn.innerHTML = '⚙ <span>Portal Admin</span>';

    btn.addEventListener('click', openAdminPage);

    const old = nav.querySelector('[data-page="admin"]');

    nav.insertBefore(btn, old || null);
  }

  function openAdminPage() {
    const page = $('page-admin');

    if (
      !page ||
      !document.body.classList.contains(
        'ma-admin-authenticated'
      )
    ) {
      return;
    }

    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
    });

    page.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.toggle(
        'active',
        b.id === 'maAdminNav'
      );
    });

    if ($('pageTitle')) {
      $('pageTitle').textContent = 'Portal Admin';
    }

    $('mainNav')?.parentElement.classList.remove('open');

    window.scrollTo(0, 0);
  }

  // ==================================
  // PAPAR PORTAL ADMIN
  // ==================================

  function revealAdmin(info) {
    document.body.classList.add(
      'ma-admin-authenticated'
    );

    ensureAdminNav();

    const page = $('page-admin');
    const panel = $('maAdminPanel');

    if (page && panel) {
      page.insertBefore(panel, page.firstChild);

      const upload = page.querySelector(
        '.html-upload-panel'
      );

      if (upload) {
        page.insertBefore(upload, panel.nextSibling);
      }
    }

    $('maAdminLogin')?.classList.add('hidden');
    $('maAdminTools')?.classList.remove('hidden');

    if ($('maAdminWho')) {
      $('maAdminWho').textContent =
        'Admin: ' +
        (
          info?.profile?.full_name ||
          info?.user?.email ||
          ''
        );
    }

    if ($('maAdminEntry')) {
      $('maAdminEntry').textContent =
        'Portal Admin aktif';
    }

    // Gunakan fungsi refresh sedia ada dalam access.js.
    $('maRefreshExercises')?.click();
    $('maRefreshReports')?.click();
    $('maRefreshQuestions')?.click();
  }

  // ==================================
  // SEMBUNYIKAN ADMIN SEMASA LOG KELUAR
  // ==================================

  function concealAdmin() {
    const wasOpen =
      $('page-admin')?.classList.contains('active');

    document.body.classList.remove(
      'ma-admin-authenticated'
    );

    $('maAdminNav')?.remove();
    $('page-admin')?.classList.remove('active');
    $('maAdminTools')?.classList.add('hidden');

    if ($('maAdminEntry')) {
      $('maAdminEntry').textContent = 'Akses Admin';
    }

    if (wasOpen) {
      $('page-home')?.classList.add('active');

      if ($('pageTitle')) {
        $('pageTitle').textContent = 'Dashboard';
      }
    }
  }

  // ==================================
  // LOGIN ADMIN
  // ==================================

  async function loginAdmin(event) {
    event.preventDefault();

    const button = $('maAdminGateSubmit');

    button.disabled = true;
    button.textContent = 'Mengesahkan...';

    try {
      const { error } = await sb.auth.signInWithPassword({
        email: $('maAdminGateEmail').value.trim(),
        password: $('maAdminGatePassword').value
      });

      if (error) throw error;

      const info = await verifiedAdmin();

      if (!info) {
        await sb.auth.signOut();

        throw new Error(
          'Akaun ini tidak mempunyai role admin. Akses ditolak.'
        );
      }

      closeGate();
      revealAdmin(info);
      openAdminPage();

    } catch (error) {
      setStatus(
        error.message || 'Log masuk gagal.',
        true
      );

    } finally {
      button.disabled = false;
      button.textContent = 'Log masuk';
    }
  }

  // ==================================
  // KEMASKINI STATUS LOGIN
  // ==================================

  async function syncGate() {
    try {
      const info = await verifiedAdmin();

      if (info) {
        revealAdmin(info);
      } else {
        concealAdmin();
      }

    } catch (error) {
      console.warn(
        'Semakan Portal Admin:',
        error.message
      );

      concealAdmin();
    }
  }

  // ==================================
  // INIT
  // ==================================

  function init() {
    buildGate();

    // Sembunyikan pautan Admin Demo lama.
    $('mainNav')
      ?.querySelector('[data-page="admin"]')
      ?.setAttribute('aria-hidden', 'true');

    $('page-admin')?.classList.remove('active');

    if (!sb) {
      console.error(
        'Admin gate: Supabase client tidak tersedia.'
      );
      return;
    }

    syncGate();

    sb.auth.onAuthStateChange(() => {
      window.setTimeout(syncGate, 0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
