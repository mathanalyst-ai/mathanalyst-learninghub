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
  let adminStudentsCache = [];
  let adminCodesCache = [];
  let adminReportsCache = [];

  const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const style = document.createElement('style');
  style.textContent = `
    .ma-access-box{background:#fff;border:1px solid #e8ecf2;border-radius:14px;padding:20px;margin:16px 0}
    .ma-access-row{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:10px 0}
    .ma-access-box input,.ma-access-box select,.ma-access-box textarea{padding:10px;border:1px solid #dfe4ed;border-radius:8px;max-width:100%;box-sizing:border-box}
    .ma-access-box button{border:0;border-radius:8px;padding:10px 14px;background:#6857e8;color:#fff;font-weight:700;cursor:pointer}
    .ma-access-box button:disabled{opacity:.55;cursor:wait}
    .ma-access-box button.secondary{background:#edf0f6;color:#263348}
    .ma-access-box button.danger{background:#b42318}
    .ma-access-box button.success{background:#16865b}
    .ma-status{font-size:12px;color:#68748a;margin-top:8px;white-space:pre-wrap}
    .ma-code{font:800 19px monospace;letter-spacing:1px;background:#f3f1ff;padding:12px;border-radius:8px;word-break:break-all}
    .ma-exercise{padding:13px 0;border-bottom:1px solid #e8ecf2}
    .ma-exercise:last-child{border:0}
    .ma-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .ma-admin-grid .ma-access-box{margin:0}
    .ma-table-wrap{overflow-x:auto}
    .ma-admin-table{width:100%;border-collapse:collapse;font-size:13px}
    .ma-admin-table th,.ma-admin-table td{padding:9px;border-bottom:1px solid #e8ecf2;text-align:left;vertical-align:top}
    .ma-admin-table th{color:#526077;background:#f8f9fc}
    #page-admin .html-upload-panel{display:none}
    #maAdminPanel{margin-top:0}
    #maAdminLogin{display:none!important}
    #maAdminTools.hidden{display:none!important}
    @media(max-width:700px){.ma-admin-grid{grid-template-columns:1fr}.ma-access-box{padding:14px}}
  `;
  document.head.appendChild(style);

  function setStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? '#b42318' : '#68748a';
  }

  async function getUser() {
    if (!sb) throw new Error('Supabase client tiada. Semak supabase-config.js.');
    const { data, error } = await sb.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  }

  async function isAdmin() {
    const user = await getUser();
    if (!user || user.is_anonymous) return false;
    const { data, error } = await sb.from('profiles')
      .select('role').eq('id', user.id).maybeSingle();
    if (error) throw error;
    return data?.role === 'admin';
  }

  async function ensureStudentName(user) {
    if (nameSetupPromise) return nameSetupPromise;
    nameSetupPromise = (async () => {
      if (!user || user.is_anonymous) return false;
      if (await isAdmin()) return false;

      const meta = user.user_metadata || {};
      if (meta.ma_name_confirmed === true && String(meta.ma_student_name || '').trim()) return true;

      const suggested = meta.full_name || meta.name || '';
      const entered = window.prompt(
        'Selamat datang ke Math Analyst Learning Hub.\n\nMasukkan nama pelajar:',
        suggested
      );
      const fullName = String(entered || '').trim();
      if (fullName.length < 2 || fullName.length > 80) {
        alert('Nama pelajar diperlukan (2 hingga 80 aksara). Cuba lagi untuk menggunakan latihan.');
        return false;
      }

      const { error: saveError } = await sb.rpc('save_student_name', { p_full_name: fullName });
      if (saveError) throw saveError;
      const { error: updateError } = await sb.auth.updateUser({
        data: { ma_name_confirmed: true, ma_student_name: fullName }
      });
      if (updateError) throw updateError;
      return true;
    })();
    try { return await nameSetupPromise; }
    finally { nameSetupPromise = null; }
  }

  async function requireStudentLoginMA() {
    let user = await getUser();
    if (!user || user.is_anonymous) {
      alert('Sila log masuk menggunakan Google untuk meneruskan.');
      await startGoogleLogin();
      return false;
    }
    if (await isAdmin()) {
      alert('Akaun Admin tidak digunakan untuk latihan pelajar. Sila gunakan akaun Google pelajar.');
      return false;
    }
    return ensureStudentName(user);
  }
  window.requireStudentLoginMA = requireStudentLoginMA;

  async function startGoogleLogin() {
    if (!sb) throw new Error('Sambungan Supabase tidak tersedia.');
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    if (data?.session?.user && !data.session.user.is_anonymous) {
      return true;
    }
    const redirectTo = window.location.origin + window.location.pathname;
    const { error: oauthError } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (oauthError) throw oauthError;
    return false;
  }

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
      const name = user.user_metadata?.ma_student_name || user.user_metadata?.full_name || user.email || 'Pelajar';
      button.textContent = 'Log keluar · ' + name;
      button.dataset.signedIn = 'student';
    } catch (error) {
      console.warn('Status Google Sign-In:', error.message);
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
        if (!confirm('Log keluar daripada akaun ini?')) return;
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
    if (await isAdmin()) return { active: false, admin: true };
    const { data, error } = await sb.rpc('check_student_access');
    if (error) throw error;
    return data;
  }

  function showAdminUpload(show) {
    const panel = document.querySelector('#page-admin .html-upload-panel');
    if (panel) panel.style.display = show ? 'block' : 'none';
  }

  // =============================================
  // DYNAMIC NAVIGATION AND STUDENT PAGES
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
            <input id="maAccessCode" autocomplete="off" placeholder="Masukkan kod akses" aria-label="Kod akses">
            <button id="maRedeem" type="button">Aktifkan kod</button>
          </div>
          <div id="maRedeemStatus" class="ma-status" aria-live="polite"></div>
        </div>
        <div class="ma-access-box">
          <h3>Senarai latihan tersedia</h3>
          <div id="maExerciseList">Log masuk Google untuk melihat latihan.</div>
        </div>`;
      main.insertBefore(section, main.querySelector('footer') || null);
    }

    const bankNav = nav && $('navBank');
    if (nav && !bankNav) {
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
          <div class="ma-status" id="bankStatus">Log masuk Google diperlukan untuk memulakan latihan.</div>
          <div class="ma-access-row">
            <label>Tahap
              <select id="bankLevel">
                <option value="Tahun 4">Tahun 4</option><option value="Tahun 5">Tahun 5</option><option value="Tahun 6">Tahun 6</option>
                <option value="Tingkatan 1">Tingkatan 1</option><option value="Tingkatan 2">Tingkatan 2</option><option value="Tingkatan 3">Tingkatan 3</option>
                <option value="Tingkatan 4">Tingkatan 4</option><option value="Tingkatan 5">Tingkatan 5</option>
              </select>
            </label>
            <label>Subjek
              <select id="bankSubject">
                <option value="Matematik">Matematik</option><option value="Sains">Sains</option><option value="Additional Mathematics">Additional Mathematics</option>
              </select>
            </label>
            <label>Topik<select id="bankTopic"><option value="">Semua topik</option></select></label>
            <label>Bilangan soalan
              <select id="bankCount"><option value="5">5 soalan</option><option value="10">10 soalan</option><option value="20">20 soalan</option><option value="50">50 soalan</option></select>
            </label>
          </div>
          <button id="bankStart" type="button">Mula latihan</button>
        </div>
        <div class="ma-access-box hidden" id="bankQuestionStage">
          <div class="ma-access-row" style="justify-content:space-between"><b id="bankCounter">Soalan 1</b><span id="bankScore">Markah maksimum</span></div>
          <div style="height:7px;background:#edf0f6;border-radius:99px;overflow:hidden;margin:12px 0"><div id="bankProgressBar" style="height:100%;width:0%;background:#6857e8"></div></div>
          <div id="bankQuestionArea"></div>
          <div class="ma-access-row"><button id="bankQuit" class="secondary" type="button">Keluar</button><button id="bankNext" type="button">Seterusnya</button></div>
        </div>
        <div class="ma-access-box hidden" id="bankResult"></div>`;
      main.insertBefore(section, main.querySelector('footer') || null);
      $('bankStart').addEventListener('click', () => window.MABank?.start());
      $('bankNext').addEventListener('click', () => window.MABank?.next());
      $('bankQuit').addEventListener('click', () => window.MABank?.quit());
      $('bankLevel').addEventListener('change', () => window.MABank?.refreshTopics());
      $('bankSubject').addEventListener('change', () => window.MABank?.refreshTopics());
    }
  }

  // =============================================
  // ADMIN PANEL - ALL ADMIN TOOLS IN ONE PLACE
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
          <button class="secondary" id="maAdminSignOut" type="button">Log keluar</button>
        </div>

        <div class="ma-admin-grid">
          <div class="ma-access-box">
            <h3>Jana Kod Akses</h3>
            <p class="ma-status">Jana kod langganan pelajar untuk 30 atau 90 hari.</p>
            <label for="maCodeDuration">Tempoh akses</label>
            <div class="ma-access-row">
              <select id="maCodeDuration"><option value="30">30 hari</option><option value="90">90 hari</option></select>
              <button id="maCreateCode" type="button">Jana kod baharu</button>
            </div>
            <div id="maGeneratedCode"></div>
            <div class="ma-status">Kod dipaparkan sekali sahaja. Salin dan simpan sebelum menutup halaman.</div>
          </div>

          <div class="ma-access-box">
            <h3>Pengurusan Latihan HTML</h3>
            <p class="ma-status">Lihat, edit, terbit, nyahterbit dan padam latihan HTML.</p>
            <button id="maRefreshExercises" type="button">Muat semula senarai</button>
            <div id="maAdminExercises"></div>
          </div>
        </div>

        <div id="maAdminOverview" class="ma-access-box" style="margin-top:18px">
          <div class="ma-access-row" style="justify-content:space-between">
            <div><h3>Ringkasan Sistem</h3><p class="ma-status">Ringkasan akaun, langganan dan aktiviti.</p></div>
            <button id="maRefreshOverview" type="button" class="secondary">Muat semula</button>
          </div>
          <div id="maOverviewStatus" class="ma-status">Memuatkan ringkasan...</div>
          <div id="maOverviewCards" class="ma-admin-grid"></div>
        </div>

        <div id="maStudentManagement" class="ma-access-box" style="margin-top:18px">
          <div class="ma-access-row" style="justify-content:space-between">
            <div><h3>Pengurusan Pelajar</h3><p class="ma-status">Senarai akaun Google berdaftar dan status langganan.</p></div>
            <button id="maExportStudents" type="button" class="secondary">Eksport CSV</button>
          </div>
          <div class="ma-access-row">
            <input id="maStudentSearch" type="search" placeholder="Cari nama atau e-mel pelajar" style="flex:1;min-width:220px">
            <button id="maRefreshStudents" type="button">Cari / Muat semula</button>
          </div>
          <div id="maStudentStatus" class="ma-status">Senarai pelajar belum dimuatkan.</div>
          <div id="maStudentTable" class="ma-table-wrap"></div>
          <p class="ma-status">Tindakan langganan: pilih tempoh untuk menambah masa kepada langganan sedia ada. Nyahaktif menetapkan tarikh tamat kepada sekarang.</p>
        </div>

        <div id="maSubscriptionManagement" class="ma-access-box" style="margin-top:18px">
          <h3>Pengurusan Kod Akses</h3>
          <p class="ma-status">Kod hanya dipaparkan ketika dijana. Senarai ini menunjukkan status kod tanpa mendedahkan kod asal.</p>
          <div class="ma-access-row">
            <select id="maCodeStatusFilter">
              <option value="">Semua status</option>
              <option value="unused">Belum digunakan</option>
              <option value="used">Telah digunakan</option>
              <option value="revoked">Dibatalkan</option>
            </select>
            <button id="maRefreshCodes" type="button">Muat semula kod</button>
            <button id="maExportCodes" type="button" class="secondary">Eksport CSV</button>
          </div>
          <div id="maCodeListStatus" class="ma-status">Senarai kod belum dimuatkan.</div>
          <div id="maCodeTable" class="ma-table-wrap"></div>
        </div>

        <div id="maAdminReports" class="ma-access-box" style="margin-top:18px">
          <h3>Laporan Prestasi Pelajar</h3>
          <p class="ma-status">Analisis keputusan kuiz dan peperiksaan semua pelajar.</p>
          <div class="ma-access-row">
            <input id="maReportFrom" type="date" aria-label="Tarikh mula">
            <input id="maReportTo" type="date" aria-label="Tarikh akhir">
            <input id="maReportSearch" type="search" placeholder="Cari pelajar / subjek" style="flex:1;min-width:180px">
            <button id="maRefreshReports" type="button">Muat semula laporan</button>
            <button id="maExportReports" type="button" class="secondary">Eksport CSV</button>
          </div>
          <div id="maReportStatus" class="ma-status">Tekan muat semula untuk melihat laporan.</div>
          <div id="maReportSummary"></div><div id="maReportRows"></div>
        </div>

        <div id="maQuestionPanel" class="ma-access-box" style="margin-top:18px">
          <h3>Bank Soalan Math Analyst</h3>
          <p class="ma-status">Tambah soalan objektif atau subjektif, edit, padam dan terbitkan.</p>
          <form id="maQuestionForm">
            <div class="ma-access-row">
              <select id="maQSubject" required><option value="">Pilih subjek</option><option>Matematik</option><option>Sains</option><option>Additional Mathematics</option></select>
              <select id="maQLevel" required><option value="">Pilih tahun / tingkatan</option><option>Tahun 4</option><option>Tahun 5</option><option>Tahun 6</option><option>Tingkatan 1</option><option>Tingkatan 2</option><option>Tingkatan 3</option><option>Tingkatan 4</option><option>Tingkatan 5</option></select>
            </div>
            <div class="ma-access-row">
              <input id="maQTopic" type="text" placeholder="Nama topik" required>
              <select id="maQType" required><option value="objective">Objektif</option><option value="subjective">Subjektif</option></select>
            </div>
            <label for="maQText"><b>Soalan</b></label>
            <textarea id="maQText" rows="4" style="width:100%;margin:8px 0" required placeholder="Masukkan soalan di sini..."></textarea>
            <div id="maQObjectiveFields">
              <h4>Pilihan jawapan</h4>
              <div class="ma-access-row"><input id="maQOptionA" placeholder="Pilihan A"><input id="maQOptionB" placeholder="Pilihan B"></div>
              <div class="ma-access-row"><input id="maQOptionC" placeholder="Pilihan C"><input id="maQOptionD" placeholder="Pilihan D"></div>
              <label for="maQCorrect"><b>Jawapan betul</b></label>
              <select id="maQCorrect"><option value="">Pilih jawapan</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select>
            </div>
            <div id="maQSubjectiveFields" style="display:none;margin-top:12px">
              <label for="maQExpected"><b>Skema jawapan diterima</b></label>
              <p class="ma-status">Masukkan setiap variasi jawapan pada baris berasingan.</p>
              <textarea id="maQExpected" rows="5" style="width:100%;margin:8px 0" placeholder="5&#10;5.0&#10;x = 5"></textarea>
            </div>
            <label for="maQExplanation"><b>Penerangan / Jalan kerja</b></label>
            <textarea id="maQExplanation" rows="4" style="width:100%;margin:8px 0" placeholder="Penerangan jawapan..."></textarea>
            <div class="ma-access-row">
              <input id="maQMarks" type="number" min="1" value="1" placeholder="Markah">
              <select id="maQDifficulty"><option value="Mudah">Mudah</option><option value="Sederhana" selected>Sederhana</option><option value="Sukar">Sukar</option></select>
            </div>
            <div class="ma-access-row">
              <button id="maQSave" type="submit">Simpan Soalan</button>
              <button id="maQCancelEdit" class="secondary" type="button">Batal edit</button>
            </div>
            <div id="maQStatus" class="ma-status" aria-live="polite"></div>
          </form>
          <div class="ma-access-box" style="margin-top:18px">
            <h3>Senarai Bank Soalan</h3>
            <div class="ma-access-row">
              <select id="maQuestionFilter"><option value="">Semua subjek</option><option>Matematik</option><option>Sains</option><option>Additional Mathematics</option></select>
              <button id="maRefreshQuestions" type="button">Muat semula soalan</button>
            </div>
            <div id="maQuestionListStatus" class="ma-status">Senarai soalan belum dimuatkan.</div>
            <div id="maQuestionList"></div>
          </div>
        </div>
      </div>`;

    const uploadPanel = page.querySelector('.html-upload-panel');
    if (uploadPanel) page.insertBefore(panel, uploadPanel);
    else page.insertBefore(panel, page.firstChild);
  }

  // =============================================
  // PREMIUM STUDENT PAGE
  // =============================================

  async function refreshStudent() {
    const sub = $('maSubStatus');
    const list = $('maExerciseList');
    if (!sub || !list) return;

    try {
      const user = await getUser();
      if (!user || user.is_anonymous) {
        setStatus(sub, 'Log masuk Google untuk menyemak status langganan.');
        list.innerHTML = '<p class="ma-status">Log masuk diperlukan untuk melihat latihan premium.</p>';
        return;
      }
      if (await isAdmin()) {
        setStatus(sub, 'Akaun Admin aktif. Pengurusan latihan tersedia dalam Portal Admin.');
        list.innerHTML = '<p class="ma-status">Akaun Admin tidak menggunakan akses latihan pelajar.</p>';
        return;
      }
      const ready = await ensureStudentName(user);
      if (!ready) {
        setStatus(sub, 'Lengkapkan nama pelajar untuk meneruskan.');
        list.innerHTML = '<p class="ma-status">Nama pelajar belum disahkan.</p>';
        return;
      }

      const access = await checkAccess();
      const result = Array.isArray(access) ? access[0] : access;
      const active = !!result?.active;
      const redeemRow = $('maRedeem')?.closest('.ma-access-row');
      if (redeemRow) redeemRow.style.display = active ? 'none' : 'flex';
      const expiry = result?.expires_at;

      if (active) {
        sub.innerHTML = `<b style="color:#16865b">Akses premium aktif</b><br>Tamat: ${expiry ? new Date(expiry).toLocaleString('ms-MY') : '—'}`;
      } else {
        sub.innerHTML = '<b>Akses premium belum aktif / telah tamat.</b> Aktifkan kod 30 atau 90 hari untuk membuka latihan premium.';
      }

      if (!active) {
        list.innerHTML = '<p class="ma-status">Latihan premium dikunci sehingga kod langganan diaktifkan.</p>';
        return;
      }

      const {data: rows, error} = await sb.from('html_exercises')
        .select('id,title,description,school_level,subject,topic,storage_path')
        .eq('status','published').order('created_at',{ascending:false});
      if (error) throw error;

      if (!rows?.length) {
        list.innerHTML = '<p class="ma-status">Belum ada latihan diterbitkan.</p>';
        return;
      }

      list.innerHTML = rows.map(item => `
        <div class="ma-exercise">
          <b>${esc(item.title)}</b>
          <div class="ma-status">${esc(item.school_level)} · ${esc(item.subject)} · ${esc(item.topic || '')}</div>
          ${item.description ? `<p>${esc(item.description)}</p>` : ''}
          <button type="button" data-open-exercise="${esc(item.id)}">Buka latihan</button>
        </div>`).join('');

      list.querySelectorAll('[data-open-exercise]').forEach(button => {
        button.addEventListener('click', async () => {
          const row = rows.find(item => item.id === button.dataset.openExercise);
          if (!row) return;
          button.disabled = true;
          try {
            const {data,error} = await sb.storage.from(BUCKET).createSignedUrl(row.storage_path,300);
            if (error) throw error;
            window.open(data.signedUrl,'_blank','noopener');
          } catch(error) {
            alert('Tidak dapat membuka latihan: ' + error.message);
          } finally {
            button.disabled = false;
          }
        });
      });
    } catch(error) {
      setStatus(sub,'Ralat akses: ' + error.message,true);
      setStatus(list,'Tidak dapat memuatkan latihan.',true);
    }
  }
