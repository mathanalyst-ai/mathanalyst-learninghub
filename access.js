/*
 * MATH ANALYST LEARNING HUB — ACCESS.JS
 * Google student login, student name, premium access, Admin portal,
 * HTML exercise management, reports and question-bank CRUD.
 * Load after app.js. Admin login UI/gate is provided by visual-editor.js.
 */
(() => {
  'use strict';

  const sb = window.supabaseClient ||
    (typeof supabaseClient !== 'undefined' ? supabaseClient : null);

  const BUCKET = 'html-exercises';
  const $ = id => document.getElementById(id);

  let editingQuestionId = null;
  let editingQuestionStatus = 'draft';
  let authBusy = false;
  let nameSetupPromise = null;

  const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  // =============================================
  // GAYA PAPARAN
  // =============================================

  const style = document.createElement('style');

  style.textContent = `
    .ma-access-box {
      background:#fff;
      border:1px solid #e8ecf2;
      border-radius:14px;
      padding:20px;
      margin:16px 0;
    }

    .ma-access-row {
      display:flex;
      gap:9px;
      flex-wrap:wrap;
      align-items:center;
      margin:10px 0;
    }

    .ma-access-box input,
    .ma-access-box select,
    .ma-access-box textarea {
      padding:10px;
      border:1px solid #dfe4ed;
      border-radius:8px;
      max-width:100%;
      box-sizing:border-box;
    }

    .ma-access-box button {
      border:0;
      border-radius:8px;
      padding:10px 14px;
      background:#6857e8;
      color:#fff;
      font-weight:700;
      cursor:pointer;
    }

    .ma-access-box button:disabled {
      opacity:.55;
      cursor:wait;
    }

    .ma-access-box button.secondary {
      background:#edf0f6;
      color:#263348;
    }

    .ma-access-box button.danger {
      background:#b42318;
    }

    .ma-access-box button.success {
      background:#16865b;
    }

    .ma-status {
      font-size:12px;
      color:#68748a;
      margin-top:8px;
      white-space:pre-wrap;
    }

    .ma-code {
      font:800 19px monospace;
      letter-spacing:1px;
      background:#f3f1ff;
      padding:12px;
      border-radius:8px;
      word-break:break-all;
    }

    .ma-exercise {
      padding:13px 0;
      border-bottom:1px solid #e8ecf2;
    }

    .ma-exercise:last-child {
      border:0;
    }

    .ma-admin-grid {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:14px;
    }

    .ma-admin-grid .ma-access-box {
      margin:0;
    }

    .ma-table-wrap {
      overflow-x:auto;
    }

    .ma-admin-table {
      width:100%;
      border-collapse:collapse;
      font-size:13px;
    }

    .ma-admin-table th,
    .ma-admin-table td {
      padding:9px;
      border-bottom:1px solid #e8ecf2;
      text-align:left;
      vertical-align:top;
    }

    .ma-admin-table th {
      color:#526077;
      background:#f8f9fc;
    }

    #page-admin .html-upload-panel {
      display:none;
    }

    #maAdminPanel {
      margin-top:0;
    }

    #maAdminLogin {
      display:none!important;
    }

    #maAdminTools.hidden {
      display:none!important;
    }

    @media(max-width:700px) {
      .ma-admin-grid {
        grid-template-columns:1fr;
      }

      .ma-access-box {
        padding:14px;
      }
    }
  `;

  document.head.appendChild(style);

  function setStatus(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? '#b42318' : '#68748a';
  }

  // =============================================
  // IDENTITI GOOGLE DAN PELAJAR
  // =============================================

  async function getUser() {
    if (!sb) {
      throw new Error(
        'Supabase client tiada. Semak supabase-config.js.'
      );
    }

    const { data, error } = await sb.auth.getUser();

    if (error) throw error;

    return data?.user || null;
  }

  async function isAdmin() {
    const user = await getUser();

    if (!user || user.is_anonymous) return false;

    const { data, error } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    return data?.role === 'admin';
  }

  async function ensureStudentName(user) {
    if (nameSetupPromise) return nameSetupPromise;

    nameSetupPromise = (async () => {
      if (!user || user.is_anonymous) return false;

      if (await isAdmin()) return false;

      const meta = user.user_metadata || {};

      if (
        meta.ma_name_confirmed === true &&
        String(meta.ma_student_name || '').trim()
      ) {
        return true;
      }

      const suggested = meta.full_name || meta.name || '';

      const entered = window.prompt(
        'Selamat datang ke Math Analyst Learning Hub.\n\nMasukkan nama pelajar:',
        suggested
      );

      const fullName = String(entered || '').trim();

      if (fullName.length < 2 || fullName.length > 80) {
        alert(
          'Nama pelajar diperlukan (2 hingga 80 aksara). Cuba lagi untuk menggunakan latihan.'
        );
        return false;
      }

      const { error: saveError } = await sb.rpc(
        'save_student_name',
        { p_full_name: fullName }
      );

      if (saveError) throw saveError;

      const { error: updateError } = await sb.auth.updateUser({
        data: {
          ma_name_confirmed: true,
          ma_student_name: fullName
        }
      });

      if (updateError) throw updateError;

      return true;
    })();

    try {
      return await nameSetupPromise;
    } finally {
      nameSetupPromise = null;
    }
  }

  async function startGoogleLogin() {
    if (!sb) {
      throw new Error('Sambungan Supabase tidak tersedia.');
    }

    const { data, error } = await sb.auth.getSession();

    if (error) throw error;

    if (
      data?.session?.user &&
      !data.session.user.is_anonymous
    ) {
      return true;
    }

    const redirectTo =
      window.location.origin + window.location.pathname;

    const { error: oauthError } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });

    if (oauthError) throw oauthError;

    return false;
  }

  async function requireStudentLoginMA() {
    const user = await getUser();

    if (!user || user.is_anonymous) {
      alert(
        'Sila log masuk menggunakan Google untuk meneruskan.'
      );

      await startGoogleLogin();
      return false;
    }

    if (await isAdmin()) {
      alert(
        'Akaun Admin tidak digunakan untuk latihan pelajar. Sila gunakan akaun Google pelajar.'
      );
      return false;
    }

    return ensureStudentName(user);
  }

  window.requireStudentLoginMA = requireStudentLoginMA;

  async function syncGoogleButton() {
    const button = $('maGoogleLoginButton');

    if (!button || !sb) return;

    try {
      const user = await getUser();

      if (!user || user.is_anonymous) {
        button.textContent = 'Log masuk Google';
        button.dataset.signedIn = 'false';
        return;
      }

      if (await isAdmin()) {
        button.textContent = 'Akaun Admin';
        button.dataset.signedIn = 'admin';
        return;
      }

      const name =
        user.user_metadata?.ma_student_name ||
        user.user_metadata?.full_name ||
        user.email ||
        'Pelajar';

      button.textContent = 'Log keluar · ' + name;
      button.dataset.signedIn = 'student';

    } catch (error) {
      console.warn(
        'Status Google Sign-In:',
        error.message
      );

      button.textContent = 'Log masuk Google';
      button.dataset.signedIn = 'false';
    }
  }

  async function handleGoogleButton() {
    const button = $('maGoogleLoginButton');

    if (!button || authBusy) return;

    authBusy = true;
    button.disabled = true;

    try {
      const user = await getUser();

      if (user && !user.is_anonymous) {
        if (!confirm('Log keluar daripada akaun ini?')) {
          return;
        }

        const { error } = await sb.auth.signOut();

        if (error) throw error;

        await syncGoogleButton();
        await refreshStudent();

        return;
      }

      await startGoogleLogin();

    } catch (error) {
      alert('Log masuk Google gagal: ' + error.message);

    } finally {
      authBusy = false;
      button.disabled = false;
    }
  }

  async function checkAccess() {
    const user = await getUser();

    if (!user || user.is_anonymous) {
      throw new Error('Log masuk Google diperlukan.');
    }

    if (await isAdmin()) {
      return { active:false, admin:true };
    }

    const { data, error } = await sb.rpc(
      'check_student_access'
    );

    if (error) throw error;

    return data;
  }

  function showAdminUpload(show) {
    const panel = document.querySelector(
      '#page-admin .html-upload-panel'
    );

    if (panel) {
      panel.style.display = show ? 'block' : 'none';
    }
  }

  // =============================================
  // NAVIGASI DAN HALAMAN PELAJAR
  // =============================================

  function addNavAndPages() {
    const nav = $('mainNav');

    if (nav && !$('navPremium')) {
      const button = document.createElement('button');

      button.className = 'nav-item';
      button.id = 'navPremium';
      button.dataset.page = 'practice';
      button.innerHTML = '🔒 <span>Latihan Premium</span>';

      nav.appendChild(button);

      button.addEventListener('click', event => {
        event.preventDefault();
        window.navigateMA('practice');
      });
    }

    const main = document.querySelector('.main');

    if (main && !$('page-practice')) {
      const section = document.createElement('section');

      section.id = 'page-practice';
      section.className = 'page';

      section.innerHTML = `
        <div class="page-intro">
          <span class="eyebrow">AKSES BERLANGGANAN</span>
          <h2>Latihan Interaktif Premium</h2>
          <p>Log masuk Google dan masukkan kod akses 30 atau 90 hari untuk membuka latihan yang diterbitkan.</p>
        </div>

        <div class="ma-access-box">
          <h3>Status akses</h3>
          <div id="maSubStatus">Log masuk Google untuk menyemak akses.</div>

          <div class="ma-access-row">
            <input id="maAccessCode"
              autocomplete="off"
              placeholder="Masukkan kod akses"
              aria-label="Kod akses">
            <button id="maRedeem" type="button">Aktifkan kod</button>
          </div>

          <div id="maRedeemStatus" class="ma-status"
            aria-live="polite"></div>
        </div>

        <div class="ma-access-box">
          <h3>Senarai latihan tersedia</h3>
          <div id="maExerciseList">Log masuk Google untuk melihat latihan.</div>
        </div>
      `;

      main.insertBefore(section, main.querySelector('footer') || null);
    }

    if (nav && !$('navBank')) {
      const button = document.createElement('button');

      button.className = 'nav-item';
      button.id = 'navBank';
      button.dataset.page = 'bank';
      button.innerHTML = '▤ <span>Bank Soalan</span>';

      nav.appendChild(button);

      button.addEventListener('click', event => {
        event.preventDefault();
        window.navigateMA('bank');
      });
    }

    if (main && !$('page-bank')) {
      const section = document.createElement('section');

      section.id = 'page-bank';
      section.className = 'page';

      section.innerHTML = `
        <div class="page-intro">
          <span class="eyebrow">LATIHAN BERDASARKAN BANK SOALAN</span>
          <h2>Bank Soalan</h2>
          <p>Pilih tahap, subjek dan topik untuk menjawab soalan yang diterbitkan.</p>
        </div>

        <div class="ma-access-box">
          <div class="ma-status" id="bankStatus">
            Log masuk Google diperlukan untuk memulakan latihan.
          </div>

          <div class="ma-access-row">
            <label>Tahap
              <select id="bankLevel">
                <option value="Tahun 4">Tahun 4</option>
                <option value="Tahun 5">Tahun 5</option>
                <option value="Tahun 6">Tahun 6</option>
                <option value="Tingkatan 1">Tingkatan 1</option>
                <option value="Tingkatan 2">Tingkatan 2</option>
                <option value="Tingkatan 3">Tingkatan 3</option>
                <option value="Tingkatan 4">Tingkatan 4</option>
                <option value="Tingkatan 5">Tingkatan 5</option>
              </select>
            </label>

            <label>Subjek
              <select id="bankSubject">
                <option value="Matematik">Matematik</option>
                <option value="Sains">Sains</option>
                <option value="Additional Mathematics">Additional Mathematics</option>
              </select>
            </label>

            <label>Topik
              <select id="bankTopic">
                <option value="">Semua topik</option>
              </select>
            </label>

            <label>Bilangan soalan
              <select id="bankCount">
                <option value="5">5 soalan</option>
                <option value="10">10 soalan</option>
                <option value="20">20 soalan</option>
                <option value="50">50 soalan</option>
              </select>
            </label>
          </div>

          <button id="bankStart" type="button">Mula latihan</button>
        </div>

        <div class="ma-access-box hidden" id="bankQuestionStage">
          <div class="ma-access-row" style="justify-content:space-between">
            <b id="bankCounter">Soalan 1</b>
            <span id="bankScore">Markah maksimum</span>
          </div>

          <div style="height:7px;background:#edf0f6;border-radius:99px;overflow:hidden;margin:12px 0">
            <div id="bankProgressBar" style="height:100%;width:0%;background:#6857e8"></div>
          </div>

          <div id="bankQuestionArea"></div>

          <div class="ma-access-row">
            <button id="bankQuit" class="secondary" type="button">Keluar</button>
            <button id="bankNext" type="button">Seterusnya</button>
          </div>
        </div>

        <div class="ma-access-box hidden" id="bankResult"></div>
      `;

      main.insertBefore(section, main.querySelector('footer') || null);

      $('bankStart').addEventListener(
        'click',
        () => window.MABank?.start()
      );

      $('bankNext').addEventListener(
        'click',
        () => window.MABank?.next()
      );

      $('bankQuit').addEventListener(
        'click',
        () => window.MABank?.quit()
      );

      $('bankLevel').addEventListener(
        'change',
        () => window.MABank?.refreshTopics()
      );

      $('bankSubject').addEventListener(
        'change',
        () => window.MABank?.refreshTopics()
      );
    }
  }

  // =============================================
  // PANEL UTAMA PORTAL ADMIN
  // =============================================

  function injectAdmin() {
    const page = $('page-admin');

    if (!page || $('maAdminPanel')) return;

    const panel = document.createElement('div');

    panel.id = 'maAdminPanel';
    panel.className = 'ma-access-box';

    panel.innerHTML = `
      <h2>Portal Admin Math Analyst</h2>

      <div id="maAdminLogin" class="hidden"></div>

      <div id="maAdminTools" class="hidden">

        <div class="ma-access-row" style="justify-content:space-between">
          <b id="maAdminWho">Admin aktif</b>
          <button class="secondary" id="maAdminSignOut" type="button">
            Log keluar
          </button>
        </div>

        <div class="ma-admin-grid">

          <div class="ma-access-box">
            <h3>Jana Kod Akses</h3>
            <p class="ma-status">Jana kod langganan pelajar untuk 30 atau 90 hari.</p>

            <label for="maCodeDuration">Tempoh akses</label>

            <div class="ma-access-row">
              <select id="maCodeDuration">
                <option value="30">30 hari</option>
                <option value="90">90 hari</option>
              </select>

              <button id="maCreateCode" type="button">
                Jana kod baharu
              </button>
            </div>

            <div id="maGeneratedCode"></div>

            <div class="ma-status">
              Kod dipaparkan sekali sahaja. Salin dan simpan sebelum menutup halaman.
            </div>
          </div>

          <div class="ma-access-box">
            <h3>Pengurusan Latihan HTML</h3>
            <p class="ma-status">
              Lihat, edit, terbit, nyahterbit dan padam latihan HTML.
            </p>

            <button id="maRefreshExercises" type="button">
              Muat semula senarai
            </button>

            <div id="maAdminExercises"></div>
          </div>
        </div>

        <div id="maAdminReports" class="ma-access-box" style="margin-top:18px">
          <h3>Laporan Prestasi Pelajar</h3>
          <p class="ma-status">
            Analisis keputusan kuiz dan peperiksaan semua pelajar.
          </p>

          <button id="maRefreshReports" type="button">
            Muat semula laporan
          </button>

          <div id="maReportStatus" class="ma-status">
            Tekan muat semula untuk melihat laporan.
          </div>

          <div id="maReportSummary"></div>
          <div id="maReportRows"></div>
        </div>

        <div id="maQuestionPanel" class="ma-access-box" style="margin-top:18px">
          <h3>Bank Soalan Math Analyst</h3>
          <p class="ma-status">
            Tambah soalan objektif atau subjektif, edit, padam dan terbitkan.
          </p>

          <form id="maQuestionForm">

            <div class="ma-access-row">
              <select id="maQSubject" required>
                <option value="">Pilih subjek</option>
                <option>Matematik</option>
                <option>Sains</option>
                <option>Additional Mathematics</option>
              </select>

              <select id="maQLevel" required>
                <option value="">Pilih tahun / tingkatan</option>
                <option>Tahun 4</option>
                <option>Tahun 5</option>
                <option>Tahun 6</option>
                <option>Tingkatan 1</option>
                <option>Tingkatan 2</option>
                <option>Tingkatan 3</option>
                <option>Tingkatan 4</option>
                <option>Tingkatan 5</option>
              </select>
            </div>

            <div class="ma-access-row">
              <input id="maQTopic" type="text"
                placeholder="Nama topik" required>

              <select id="maQType" required>
                <option value="objective">Objektif</option>
                <option value="subjective">Subjektif</option>
              </select>
            </div>

            <label for="maQText"><b>Soalan</b></label>
            <textarea id="maQText" rows="4"
              style="width:100%;margin:8px 0"
              required
              placeholder="Masukkan soalan di sini..."></textarea>

            <div id="maQObjectiveFields">
              <h4>Pilihan jawapan</h4>

              <div class="ma-access-row">
                <input id="maQOptionA" placeholder="Pilihan A">
                <input id="maQOptionB" placeholder="Pilihan B">
              </div>

              <div class="ma-access-row">
                <input id="maQOptionC" placeholder="Pilihan C">
                <input id="maQOptionD" placeholder="Pilihan D">
              </div>

              <label for="maQCorrect"><b>Jawapan betul</b></label>
              <select id="maQCorrect">
                <option value="">Pilih jawapan</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div id="maQSubjectiveFields" style="display:none;margin-top:12px">
              <label for="maQExpected"><b>Skema jawapan diterima</b></label>

              <p class="ma-status">
                Masukkan setiap variasi jawapan pada baris berasingan.
              </p>

              <textarea id="maQExpected" rows="5"
                style="width:100%;margin:8px 0"
                placeholder="5&#10;5.0&#10;x = 5"></textarea>
            </div>

            <label for="maQExplanation"><b>Penerangan / Jalan kerja</b></label>
            <textarea id="maQExplanation" rows="4"
              style="width:100%;margin:8px 0"
              placeholder="Penerangan jawapan..."></textarea>

            <div class="ma-access-row">
              <input id="maQMarks" type="number" min="1"
                value="1" placeholder="Markah">

              <select id="maQDifficulty">
                <option value="Mudah">Mudah</option>
                <option value="Sederhana" selected>Sederhana</option>
                <option value="Sukar">Sukar</option>
              </select>
            </div>

            <div class="ma-access-row">
              <button id="maQSave" type="submit">Simpan Soalan</button>
              <button id="maQCancelEdit" class="secondary" type="button">
                Batal edit
              </button>
            </div>

            <div id="maQStatus" class="ma-status" aria-live="polite"></div>
          </form>

          <div class="ma-access-box" style="margin-top:18px">
            <h3>Senarai Bank Soalan</h3>

            <div class="ma-access-row">
              <select id="maQuestionFilter">
                <option value="">Semua subjek</option>
                <option>Matematik</option>
                <option>Sains</option>
                <option>Additional Mathematics</option>
              </select>

              <button id="maRefreshQuestions" type="button">
                Muat semula soalan
              </button>
            </div>

            <div id="maQuestionListStatus" class="ma-status">
              Senarai soalan belum dimuatkan.
            </div>

            <div id="maQuestionList"></div>
          </div>
        </div>
      </div>
    `;

    // Letakkan panel pengurusan sebelum bahagian upload HTML.
    const uploadPanel = page.querySelector('.html-upload-panel');

    if (uploadPanel) {
      page.insertBefore(panel, uploadPanel);
    } else {
      page.insertBefore(panel, page.firstChild);
    }
  }

  // =============================================
  // LATIHAN PREMIUM PELAJAR
  // =============================================

  async function refreshStudent() {
    const sub = $('maSubStatus');
    const list = $('maExerciseList');

    if (!sub || !list) return;

    try {
      const user = await getUser();

      if (!user || user.is_anonymous) {
        setStatus(
          sub,
          'Log masuk Google untuk menyemak status langganan.'
        );

        list.innerHTML =
          '<p class="ma-status">Log masuk diperlukan untuk melihat latihan premium.</p>';

        return;
      }

      if (await isAdmin()) {
        setStatus(
          sub,
          'Akaun Admin aktif. Pengurusan latihan tersedia dalam Portal Admin.'
        );

        list.innerHTML =
          '<p class="ma-status">Akaun Admin tidak menggunakan akses latihan pelajar.</p>';

        return;
      }

      const ready = await ensureStudentName(user);

      if (!ready) {
        setStatus(sub, 'Lengkapkan nama pelajar untuk meneruskan.');

        list.innerHTML =
          '<p class="ma-status">Nama pelajar belum disahkan.</p>';

        return;
      }

      const access = await checkAccess();
      const result = Array.isArray(access) ? access[0] : access;
      const active = !!result?.active;

      const redeemRow = $('maRedeem')?.closest('.ma-access-row');

      if (redeemRow) {
        redeemRow.style.display = active ? 'none' : 'flex';
      }

      const expiry = result?.expires_at;

      if (active) {
        sub.innerHTML =
          `<b style="color:#16865b">Akses premium aktif</b><br>
           Tamat: ${expiry ? new Date(expiry).toLocaleString('ms-MY') : '—'}`;
      } else {
        sub.innerHTML =
          '<b>Akses premium belum aktif / telah tamat.</b> Aktifkan kod 30 atau 90 hari untuk membuka latihan premium.';
      }

      if (!active) {
        list.innerHTML =
          '<p class="ma-status">Latihan premium dikunci sehingga kod langganan diaktifkan.</p>';
        return;
      }

      const { data: rows, error } = await sb
        .from('html_exercises')
        .select('id,title,description,school_level,subject,topic,storage_path')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!rows?.length) {
        list.innerHTML =
          '<p class="ma-status">Belum ada latihan diterbitkan.</p>';
        return;
      }

      list.innerHTML = rows.map(item => `
        <div class="ma-exercise">
          <b>${esc(item.title)}</b>
          <div class="ma-status">
            ${esc(item.school_level)} · ${esc(item.subject)} · ${esc(item.topic || '')}
          </div>
          ${item.description ? `<p>${esc(item.description)}</p>` : ''}
          <button type="button" data-open-exercise="${esc(item.id)}">
            Buka latihan
          </button>
        </div>
      `).join('');

      list.querySelectorAll('[data-open-exercise]').forEach(button => {
        button.addEventListener('click', async () => {
          const row = rows.find(
            item => item.id === button.dataset.openExercise
          );

          if (!row) return;

          button.disabled = true;

          try {
            const { data, error: signedError } = await sb.storage
              .from(BUCKET)
              .createSignedUrl(row.storage_path, 300);

            if (signedError) throw signedError;

            window.open(data.signedUrl, '_blank', 'noopener');

          } catch (error) {
            alert('Tidak dapat membuka latihan: ' + error.message);

          } finally {
            button.disabled = false;
          }
        });
      });

    } catch (error) {
      setStatus(sub, 'Ralat akses: ' + error.message, true);
      setStatus(list, 'Tidak dapat memuatkan latihan.', true);
    }
  }

  // =============================================
  // AKTIFKAN KOD LANGGANAN
  // =============================================

  async function redeem() {
    const input = $('maAccessCode');
    const output = $('maRedeemStatus');
    const button = $('maRedeem');
    const code = input?.value.trim().toUpperCase();

    if (!code) {
      setStatus(output, 'Masukkan kod akses dahulu.', true);
      return;
    }

    button.disabled = true;
    setStatus(output, 'Menyemak akaun Google...');

    try {
      const ready = await requireStudentLoginMA();

      if (!ready) return;

      setStatus(output, 'Sedang mengaktifkan kod...');

      const { error } = await sb.rpc(
        'activate_access_code',
        { p_code: code }
      );

      if (error) throw error;

      setStatus(output, 'Kod berjaya diaktifkan!');
      input.value = '';

      await refreshStudent();

    } catch (error) {
      setStatus(
        output,
        'Pengaktifan gagal: ' + error.message,
        true
      );

    } finally {
      button.disabled = false;
    }
  }

  // =============================================
  // JANA KOD AKSES ADMIN
  // =============================================

  function randomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(10);

    crypto.getRandomValues(bytes);

    const raw = Array.from(
      bytes,
      b => alphabet[b % alphabet.length]
    ).join('');

    return raw.match(/.{1,5}/g).join('-');
  }

  async function createCode() {
    const output = $('maGeneratedCode');
    const duration = Number($('maCodeDuration').value);
    const code = randomCode();

    try {
      if (!(await isAdmin())) {
        throw new Error('Akses Admin diperlukan.');
      }

      const { error } = await sb.rpc('create_access_code', {
        p_code: code,
        p_duration_days: duration
      });

      if (error) throw error;

      output.innerHTML = `
        <p>Kod akses ${duration} hari:</p>
        <div class="ma-code">${esc(code)}</div>
        <div class="ma-access-row">
          <button id="maCopyCode" type="button">Salin kod</button>
        </div>
      `;

      $('maCopyCode').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code);
          $('maCopyCode').textContent = 'Disalin';
        } catch {
          setStatus(
            output,
            'Pilih dan salin kod di atas secara manual.'
          );
        }
      });

    } catch (error) {
      output.textContent = 'Gagal jana kod: ' + error.message;
    }
  }

  // =============================================
  // PENGURUSAN LATIHAN HTML
  // =============================================

  async function refreshAdminExercises() {
    const output = $('maAdminExercises');

    if (!output) return;

    output.textContent = 'Memuatkan latihan...';

    try {
      if (!(await isAdmin())) {
        throw new Error('Akses Admin diperlukan.');
      }

      const { data, error } = await sb
        .from('html_exercises')
        .select('id,title,description,school_level,subject,topic,storage_path,status,created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data?.length) {
        output.innerHTML =
          '<p class="ma-status">Belum ada latihan HTML.</p>';
        return;
      }

      output.innerHTML = data.map(item => `
        <div class="ma-exercise">
          <div class="ma-access-row" style="justify-content:space-between">
            <b>${esc(item.title)}</b>
            <span class="tag">${esc((item.status || 'draft').toUpperCase())}</span>
          </div>

          <div class="ma-status">
            ${esc(item.school_level)} · ${esc(item.subject)} · ${esc(item.topic || '')}
          </div>

          <div class="ma-access-row">
            <button type="button" data-html-edit="${esc(item.id)}"
              class="secondary">Edit</button>

            <button type="button" data-html-publish="${esc(item.id)}"
              class="${item.status === 'published' ? 'secondary' : 'success'}">
              ${item.status === 'published' ? 'Nyahterbit' : 'Terbitkan'}
            </button>

            <button type="button" data-html-delete="${esc(item.id)}"
              class="danger">Padam</button>
          </div>
        </div>
      `).join('');

      // EDIT METADATA LATIHAN
      output.querySelectorAll('[data-html-edit]').forEach(button => {
        button.addEventListener('click', async () => {
          const item = data.find(
            x => x.id === button.dataset.htmlEdit
          );

          if (!item) return;

          const title = prompt('Tajuk latihan:', item.title);
          if (title === null) return;

          const description = prompt(
            'Penerangan:',
            item.description || ''
          );
          if (description === null) return;

          const level = prompt(
            'Tahap pembelajaran:',
            item.school_level || ''
          );
          if (level === null) return;

          const subject = prompt(
            'Subjek:',
            item.subject || ''
          );
          if (subject === null) return;

          const topic = prompt('Topik:', item.topic || '');
          if (topic === null) return;

          try {
            if (!(await isAdmin())) {
              throw new Error('Akses Admin diperlukan.');
            }

            const { error } = await sb
              .from('html_exercises')
              .update({
                title: title.trim(),
                description: description.trim(),
                school_level: level.trim(),
                subject: subject.trim(),
                topic: topic.trim()
              })
              .eq('id', item.id);

            if (error) throw error;

            await refreshAdminExercises();

          } catch (error) {
            alert('Gagal mengemas kini latihan: ' + error.message);
          }
        });
      });

      // TERBIT / NYAHTERBIT
      output.querySelectorAll('[data-html-publish]').forEach(button => {
        button.addEventListener('click', async () => {
          const item = data.find(
            x => x.id === button.dataset.htmlPublish
          );

          if (!item) return;

          button.disabled = true;

          try {
            if (!(await isAdmin())) {
              throw new Error('Akses Admin diperlukan.');
            }

            const next =
              item.status === 'published' ? 'draft' : 'published';

            const { error } = await sb
              .from('html_exercises')
              .update({ status: next })
              .eq('id', item.id);

            if (error) throw error;

            await refreshAdminExercises();

          } catch (error) {
            alert('Gagal mengubah status: ' + error.message);
            button.disabled = false;
          }
        });
      });

      // PADAM LATIHAN
      output.querySelectorAll('[data-html-delete]').forEach(button => {
        button.addEventListener('click', async () => {
          const item = data.find(
            x => x.id === button.dataset.htmlDelete
          );

          if (
            !item ||
            !confirm(`Padam latihan “${item.title}” secara kekal?`)
          ) return;

          button.disabled = true;

          try {
            if (!(await isAdmin())) {
              throw new Error('Akses Admin diperlukan.');
            }

            const { error } = await sb
              .from('html_exercises')
              .delete()
              .eq('id', item.id);

            if (error) throw error;

            if (item.storage_path) {
              const { error: storageError } = await sb.storage
                .from(BUCKET)
                .remove([item.storage_path]);

              if (storageError) {
                console.warn(
                  'Rekod dipadam tetapi fail Storage belum dapat dibuang:',
                  storageError.message
                );
              }
            }

            await refreshAdminExercises();

          } catch (error) {
            alert('Gagal memadam latihan: ' + error.message);
            button.disabled = false;
          }
        });
      });

    } catch (error) {
      setStatus(output, 'Ralat: ' + error.message, true);
    }
  }

  // =============================================
  // BANK SOALAN — SIMPAN DAN EDIT
  // =============================================

  async function saveQuestion(event) {
    event.preventDefault();

    const form = $('maQuestionForm');
    const status = $('maQStatus');
    const button = $('maQSave');

    if (!form || !status || !button) return;

    const type = $('maQType').value;
    const question = $('maQText').value.trim();
    const topic = $('maQTopic').value.trim();

    let options = {};
    let correctAnswer = null;
    let expectedAnswer = null;

    if (type === 'objective') {
      options = {
        A: $('maQOptionA').value.trim(),
        B: $('maQOptionB').value.trim(),
        C: $('maQOptionC').value.trim(),
        D: $('maQOptionD').value.trim()
      };

      correctAnswer = $('maQCorrect').value;

      if (Object.values(options).some(v => !v)) {
        return setStatus(
          status,
          'Lengkapkan pilihan A hingga D.',
          true
        );
      }

      if (!correctAnswer) {
        return setStatus(
          status,
          'Pilih jawapan yang betul.',
          true
        );
      }

    } else {
      expectedAnswer = $('maQExpected').value.trim();

      if (!expectedAnswer) {
        return setStatus(
          status,
          'Masukkan skema jawapan.',
          true
        );
      }
    }

    const marks = Number($('maQMarks').value);

    if (!Number.isInteger(marks) || marks < 1) {
      return setStatus(
        status,
        'Markah mestilah nombor bulat sekurang-kurangnya 1.',
        true
      );
    }

    if (!question || !topic) {
      return setStatus(
        status,
        'Soalan dan topik diperlukan.',
        true
      );
    }

    button.disabled = true;
    setStatus(status, 'Sedang menyimpan soalan...');

    try {
      if (!(await isAdmin())) {
        throw new Error('Akses Admin diperlukan.');
      }

      const { data: userData, error: userError } =
        await sb.auth.getUser();

      if (userError) throw userError;
      if (!userData.user) {
        throw new Error('Sesi Admin tidak dijumpai.');
      }

      const record = {
        subject: $('maQSubject').value,
        school_level: $('maQLevel').value,
        topic,
        question_type: type,
        question_text: question,
        options,
        correct_answer: correctAnswer,
        expected_answer: expectedAnswer,
        explanation: $('maQExplanation').value.trim(),
        marks,
        difficulty: $('maQDifficulty').value,
        status: editingQuestionId
          ? editingQuestionStatus
          : 'draft',
        created_by: userData.user.id
      };

      let error;

      if (editingQuestionId) {
        ({ error } = await sb
          .from('question_bank')
          .update({
            ...record,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingQuestionId));
      } else {
        ({ error } = await sb
          .from('question_bank')
          .insert(record));
      }

      if (error) throw error;

      editingQuestionId = null;
      editingQuestionStatus = 'draft';

      form.reset();

      $('maQSave').textContent = 'Simpan Soalan';
      $('maQObjectiveFields').style.display = 'block';
      $('maQSubjectiveFields').style.display = 'none';

      setStatus(
        status,
        'Berjaya! Soalan telah disimpan atau dikemaskini.'
      );

      await refreshQuestionBank();

    } catch (error) {
      setStatus(
        status,
        'Gagal menyimpan soalan: ' + error.message,
        true
      );

    } finally {
      button.disabled = false;
    }
  }

  function cancelQuestionEdit() {
    editingQuestionId = null;
    editingQuestionStatus = 'draft';

    $('maQuestionForm')?.reset();

    if ($('maQSave')) {
      $('maQSave').textContent = 'Simpan Soalan';
    }

    if ($('maQObjectiveFields')) {
      $('maQObjectiveFields').style.display = 'block';
    }

    if ($('maQSubjectiveFields')) {
      $('maQSubjectiveFields').style.display = 'none';
    }

    setStatus($('maQStatus'), 'Mod edit dibatalkan.');
  }

  // =============================================
  // BANK SOALAN — SENARAI DAN CRUD
  // =============================================

  async function refreshQuestionBank() {
    const output = $('maQuestionList');
    const status = $('maQuestionListStatus');

    if (!output || !status) return;

    status.textContent = 'Sedang memuatkan soalan...';
    output.innerHTML = '';

    try {
      if (!(await isAdmin())) {
        throw new Error('Akses Admin diperlukan.');
      }

      let query = sb
        .from('question_bank')
        .select('*')
        .order('created_at', { ascending: false });

      const filter = $('maQuestionFilter')?.value;

      if (filter) {
        query = query.eq('subject', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data?.length) {
        status.textContent =
          'Belum ada soalan dalam bank soalan.';
        return;
      }

      status.textContent = 'Jumlah soalan: ' + data.length;

      output.innerHTML = data.map(item => `
        <div class="ma-exercise">
          <div class="ma-access-row" style="justify-content:space-between">
            <b>${esc(item.subject)} · ${esc(item.school_level)}</b>
            <b>${esc((item.status || 'draft').toUpperCase())}</b>
          </div>

          <div class="ma-status">
            ${esc(item.topic)} ·
            ${item.question_type === 'objective' ? 'Objektif' : 'Subjektif'} ·
            ${esc(item.difficulty)} · ${Number(item.marks)} markah
          </div>

          <p>${esc(item.question_text)}</p>

          <div class="ma-access-row">
            <button type="button" class="secondary"
              data-q-view="${esc(item.id)}">Lihat</button>

            <button type="button"
              data-q-edit="${esc(item.id)}">Edit</button>

            <button type="button" class="danger"
              data-q-delete="${esc(item.id)}">Padam</button>

            <button type="button"
              class="${item.status === 'published' ? 'secondary' : 'success'}"
              data-q-publish="${esc(item.id)}">
              ${item.status === 'published' ? 'Nyahterbit' : 'Terbitkan'}
            </button>
          </div>
        </div>
      `).join('');

      // LIHAT SOALAN
      output.querySelectorAll('[data-q-view]').forEach(button => {
        button.addEventListener('click', () => {
          const item = data.find(
            x => x.id === button.dataset.qView
          );

          if (!item) return;

          const o = item.options || {};

          let details =
            `Subjek: ${item.subject}\n` +
            `Tahap: ${item.school_level}\n` +
            `Topik: ${item.topic}\n` +
            `Jenis: ${item.question_type}\n\n` +
            `Soalan:\n${item.question_text}`;

          if (item.question_type === 'objective') {
            details +=
              `\n\nA. ${o.A || ''}` +
              `\nB. ${o.B || ''}` +
              `\nC. ${o.C || ''}` +
              `\nD. ${o.D || ''}` +
              `\n\nJawapan: ${item.correct_answer || ''}`;
          } else {
            details +=
              `\n\nSkema jawapan:\n${item.expected_answer || ''}`;
          }

          details +=
            `\n\nPenerangan:\n${item.explanation || 'Tiada penerangan'}`;

          alert(details);
        });
      });

      // EDIT SOALAN
      output.querySelectorAll('[data-q-edit]').forEach(button => {
        button.addEventListener('click', () => {
          const item = data.find(
            x => x.id === button.dataset.qEdit
          );

          if (!item) return;

          editingQuestionId = item.id;
          editingQuestionStatus = item.status || 'draft';

          $('maQSubject').value = item.subject || '';
          $('maQLevel').value = item.school_level || '';
          $('maQTopic').value = item.topic || '';
          $('maQType').value = item.question_type || 'objective';
          $('maQText').value = item.question_text || '';

          const o = item.options || {};

          $('maQOptionA').value = o.A || '';
          $('maQOptionB').value = o.B || '';
          $('maQOptionC').value = o.C || '';
          $('maQOptionD').value = o.D || '';

          $('maQCorrect').value = item.correct_answer || '';
          $('maQExpected').value = item.expected_answer || '';
          $('maQExplanation').value = item.explanation || '';
          $('maQMarks').value = item.marks || 1;
          $('maQDifficulty').value =
            item.difficulty || 'Sederhana';

          $('maQObjectiveFields').style.display =
            item.question_type === 'objective' ? 'block' : 'none';

          $('maQSubjectiveFields').style.display =
            item.question_type === 'subjective' ? 'block' : 'none';

          $('maQSave').textContent = 'Simpan Perubahan';

          setStatus(
            $('maQStatus'),
            'Sedang mengedit soalan. Tekan Simpan Perubahan selepas selesai.'
          );

          $('maQuestionForm').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        });
      });

      // PADAM SOALAN
      output.querySelectorAll('[data-q-delete]').forEach(button => {
        button.addEventListener('click', async () => {
          const item = data.find(
            x => x.id === button.dataset.qDelete
          );

          if (
            !item ||
            !confirm('Padam soalan ini secara kekal?')
          ) return;

          button.disabled = true;

          try {
            if (!(await isAdmin())) {
              throw new Error('Akses Admin diperlukan.');
            }

            const { error } = await sb
              .from('question_bank')
              .delete()
              .eq('id', item.id);

            if (error) throw error;

            await refreshQuestionBank();

          } catch (error) {
            alert('Gagal memadam soalan: ' + error.message);
            button.disabled = false;
          }
        });
      });

      // TERBIT / NYAHTERBIT SOALAN
      output.querySelectorAll('[data-q-publish]').forEach(button => {
        button.addEventListener('click', async () => {
          const item = data.find(
            x => x.id === button.dataset.qPublish
          );

          if (!item) return;

          button.disabled = true;

          try {
            if (!(await isAdmin())) {
              throw new Error('Akses Admin diperlukan.');
            }

            const newStatus =
              item.status === 'published' ? 'draft' : 'published';

            const { error } = await sb
              .from('question_bank')
              .update({
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id);

            if (error) throw error;

            await refreshQuestionBank();

          } catch (error) {
            alert('Gagal mengubah status: ' + error.message);
            button.disabled = false;
          }
        });
      });

    } catch (error) {
      status.textContent =
        'Gagal memuatkan soalan: ' + error.message;

      status.style.color = '#b42318';
    }
  }

  // =============================================
  // LAPORAN PRESTASI PELAJAR
  // =============================================

  async function refreshAdminReports() {
    const status = $('maReportStatus');
    const summary = $('maReportSummary');
    const rows = $('maReportRows');

    if (!status || !summary || !rows) return;

    status.textContent = 'Sedang memuatkan laporan...';
    summary.innerHTML = '';
    rows.innerHTML = '';

    try {
      if (!(await isAdmin())) {
        throw new Error('Akses Admin diperlukan.');
      }

      const { data: attempts, error } = await sb
        .from('exercise_attempts')
        .select('student_id,score,max_score,answers,submitted_at')
        .order('submitted_at', { ascending:false })
        .limit(500);

      if (error) throw error;

      if (!attempts?.length) {
        status.textContent =
          'Belum ada rekod kuiz atau peperiksaan dalam talian.';
        return;
      }

      const ids = [
        ...new Set(attempts.map(x => x.student_id).filter(Boolean))
      ];

      const { data: profiles, error: profileError } = await sb
        .from('profiles')
        .select('id,full_name')
        .in('id', ids);

      if (profileError) throw profileError;

      const names = {};

      (profiles || []).forEach(p => {
        names[p.id] = p.full_name || '';
      });

      const percentages = attempts.map(item => {
        const score = Number(item.score || 0);
        const max = Number(item.max_score || 0);

        return max > 0 ? (score / max) * 100 : 0;
      });

      const average = Math.round(
        percentages.reduce((a,b) => a+b, 0) / percentages.length
      );

      status.textContent = 'Laporan berjaya dimuatkan.';

      summary.innerHTML = `
        <div class="ma-admin-grid" style="margin-top:14px">
          <div class="ma-access-box">
            <div class="ma-status">Jumlah pelajar</div>
            <h2>${ids.length}</h2>
          </div>

          <div class="ma-access-box">
            <div class="ma-status">Jumlah percubaan</div>
            <h2>${attempts.length}</h2>
          </div>

          <div class="ma-access-box">
            <div class="ma-status">Purata pencapaian</div>
            <h2>${average}%</h2>
          </div>
        </div>
      `;

      rows.innerHTML = `
        <h3 style="margin-top:22px">Sejarah latihan terkini</h3>

        <div class="ma-table-wrap">
          <table class="ma-admin-table">
            <thead>
              <tr>
                <th>Pelajar</th>
                <th>Latihan</th>
                <th>Subjek</th>
                <th>Markah</th>
                <th>Tarikh</th>
              </tr>
            </thead>

            <tbody>
              ${attempts.map(item => {
                const answer = item.answers || {};
                const score = Number(item.score || 0);
                const max = Number(item.max_score || 0);

                const pct = max > 0
                  ? Math.round(score / max * 100)
                  : 0;

                const studentName =
                  names[item.student_id] ||
                  ('Pelajar ' + String(item.student_id || '').slice(0,8));

                const date = item.submitted_at
                  ? new Date(item.submitted_at).toLocaleString('ms-MY')
                  : '—';

                return `
                  <tr>
                    <td>${esc(studentName)}</td>
                    <td>${esc(answer.type || 'Latihan')}</td>
                    <td>${esc(answer.subject || '—')}</td>
                    <td><b>${pct}%</b></td>
                    <td>${esc(date)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

    } catch (error) {
      status.textContent =
        'Gagal memuatkan laporan: ' + error.message;

      status.style.color = '#b42318';
    }
  }

  // =============================================
  // KEMASKINI STATUS ADMIN
  // =============================================

  async function syncAdminTools() {
    try {
      if (await isAdmin()) {
        $('maAdminTools')?.classList.remove('hidden');
        $('maAdminLogin')?.classList.add('hidden');

        if ($('maAdminWho')) {
          const user = await getUser();

          $('maAdminWho').textContent =
            'Admin: ' +
            (user?.user_metadata?.full_name || user?.email || '');
        }

        showAdminUpload(true);

        await Promise.all([
          refreshAdminExercises(),
          refreshQuestionBank()
        ]);

      } else {
        $('maAdminTools')?.classList.add('hidden');
        showAdminUpload(false);
      }

    } catch (error) {
      console.warn(
        'Admin tools belum tersedia:',
        error.message
      );

      $('maAdminTools')?.classList.add('hidden');
      showAdminUpload(false);
    }
  }

  // =============================================
  // NAVIGASI HALAMAN DINAMIK
  // =============================================

  function installNavigation() {
    const oldNavigate = window.navigate;

    window.navigateMA = page => {
      if (page === 'practice' || page === 'bank') {
        document.querySelectorAll('.page').forEach(p => {
          p.classList.remove('active');
        });

        $('page-' + page)?.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(button => {
          button.classList.toggle(
            'active',
            button.dataset.page === page
          );
        });

        $('pageTitle').textContent =
          page === 'practice' ? 'Latihan Premium' : 'Bank Soalan';

        $('mainNav')?.parentElement.classList.remove('open');

        if (page === 'practice') {
          refreshStudent();
        }

        if (page === 'bank') {
          window.MABank?.refreshTopics();
        }

        window.scrollTo(0,0);

      } else if (typeof oldNavigate === 'function') {
        oldNavigate(page);
      }
    };
  }

  // =============================================
  // INIT
  // =============================================

  async function init() {
    if (!sb) {
      console.error(
        'Supabase client tidak dijumpai. Semak supabase-config.js.'
      );
      return;
    }

    addNavAndPages();
    injectAdmin();
    installNavigation();

    $('maGoogleLoginButton')?.addEventListener(
      'click',
      handleGoogleButton
    );

    $('maRedeem')?.addEventListener('click', redeem);

    $('maAccessCode')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') redeem();
    });

    $('maCreateCode')?.addEventListener('click', createCode);

    $('maRefreshExercises')?.addEventListener(
      'click',
      refreshAdminExercises
    );

    $('maRefreshReports')?.addEventListener(
      'click',
      refreshAdminReports
    );

    $('maRefreshQuestions')?.addEventListener(
      'click',
      refreshQuestionBank
    );

    $('maQuestionFilter')?.addEventListener(
      'change',
      refreshQuestionBank
    );

    $('maQuestionForm')?.addEventListener(
      'submit',
      saveQuestion
    );

    $('maQCancelEdit')?.addEventListener(
      'click',
      cancelQuestionEdit
    );

    $('maQType')?.addEventListener('change', () => {
      const objective = $('maQType').value === 'objective';

      $('maQObjectiveFields').style.display =
        objective ? 'block' : 'none';

      $('maQSubjectiveFields').style.display =
        objective ? 'none' : 'block';
    });

    $('maAdminSignOut')?.addEventListener('click', async () => {
      try {
        const { error } = await sb.auth.signOut();

        if (error) throw error;

        $('maAdminTools')?.classList.add('hidden');
        showAdminUpload(false);

        await syncGoogleButton();
        await refreshStudent();

      } catch (error) {
        alert('Gagal log keluar: ' + error.message);
      }
    });

    await syncGoogleButton();
    await refreshStudent();
    await syncAdminTools();

    sb.auth.onAuthStateChange((event, session) => {
      window.setTimeout(async () => {
        try {
          await syncGoogleButton();

          if (
            session?.user &&
            !session.user.is_anonymous &&
            !(await isAdmin())
          ) {
            const current = await getUser();
            await ensureStudentName(current);
          }

          await refreshStudent();
          await syncAdminTools();

        } catch (error) {
          console.warn(
            'Kemaskini sesi:',
            error.message
          );
        }
      }, 0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once:true }
    );
  } else {
    init();
  }

})();
