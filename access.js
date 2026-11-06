/* Math Analyst Learning Hub
   Integrasi akses premium dan portal admin.
   Muat selepas app.js. Memerlukan Supabase JS v2 dan supabase-config.js.
*/
(() => {
  'use strict';

  const sb = (typeof supabaseClient !== 'undefined') ? supabaseClient : window.supabaseClient;
  const BUCKET = 'html-exercises';
  const $ = (id) => document.getElementById(id);

  const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const style = document.createElement('style');
  style.textContent = `
    .ma-access-box{background:#fff;border:1px solid #e8ecf2;border-radius:14px;padding:20px;margin:16px 0}
    .ma-access-row{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:10px 0}
    .ma-access-box input,.ma-access-box select{padding:10px;border:1px solid #dfe4ed;border-radius:8px;min-width:180px;max-width:100%}
    .ma-access-box button{border:0;border-radius:8px;padding:10px 14px;background:#6857e8;color:#fff;font-weight:700;cursor:pointer}
    .ma-access-box button:disabled{opacity:.55;cursor:wait}
    .ma-access-box button.secondary{background:#edf0f6;color:#263348}
    .ma-status{font-size:12px;color:#68748a;margin-top:8px;white-space:pre-wrap}
    .ma-code{font:800 19px monospace;letter-spacing:1px;background:#f3f1ff;padding:12px;border-radius:8px;word-break:break-all}
    .ma-exercise{padding:13px 0;border-bottom:1px solid #e8ecf2}
    .ma-exercise:last-child{border:0}
    .ma-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    #page-admin .html-upload-panel{display:none}
    @media(max-width:700px){.ma-admin-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function setStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? '#b42318' : '#68748a';
  }

  async function ensureStudentSession() {
    if (!sb) throw new Error('Supabase client tiada. Semak supabase-config.js.');
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;

    let session = sessionData.session;
    if (!session) {
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) throw error;
      session = data.session;
    }
    if (!session) throw new Error('Tidak dapat menyediakan sesi pelajar.');
    return session.user;
  }

  async function isAdmin() {
    if (!sb) return false;
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) return false;

    const { data, error } = await sb
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (error) throw error;
    return data?.role === 'admin';
  }

  async function checkAccess() {
    await ensureStudentSession();
    const { data, error } = await sb.rpc('check_student_access');
    if (error) throw error;
    return data;
  }

  function showAdminUpload(show) {
    const panel = document.querySelector('#page-admin .html-upload-panel');
    if (panel) panel.style.display = show ? 'block' : 'none';
  }

  function addNavAndPages() {
    const nav = $('mainNav');
    if (nav && !$('navPremium')) {
      const button = document.createElement('button');
      button.className = 'nav-item';
      button.id = 'navPremium';
      button.dataset.page = 'practice';
      button.innerHTML = '🔒 <span>Latihan Premium</span>';
      nav.appendChild(button);
      button.addEventListener('click', () => window.navigateMA('practice'));
    }

    const main = document.querySelector('.main');
    if (main && !$('page-practice')) {
      const section = document.createElement('section');
      section.id = 'page-practice';
      section.className = 'page';
      section.innerHTML = `
        <div class="page-intro">
          <h2>Latihan Interaktif Premium</h2>
          <p>Masukkan kod akses untuk membuka latihan yang diterbitkan.</p>
        </div>
        <div class="ma-access-box">
          <h3>Status akses</h3>
          <div id="maSubStatus">Menyemak akses...</div>
          <div class="ma-access-row">
            <input id="maAccessCode" autocomplete="off" placeholder="Masukkan kod akses" aria-label="Kod akses">
            <button id="maRedeem" type="button">Aktifkan kod</button>
          </div>
          <div id="maRedeemStatus" class="ma-status" aria-live="polite"></div>
        </div>
        <div class="ma-access-box">
          <h3>Senarai latihan tersedia</h3>
          <div id="maExerciseList">Memuatkan latihan...</div>
        </div>`;
      const footer = main.querySelector('footer');
      main.insertBefore(section, footer || null);
    }
  }

  function injectAdmin() {
    const page = $('page-admin');
    if (!page || $('maAdminPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'maAdminPanel';
    panel.className = 'ma-access-box';

    panel.innerHTML = `
      <h2>Portal Admin Math Analyst</h2>

      <div id="maAdminLogin">
        <p>Login menggunakan akaun Supabase yang telah diberikan role <b>admin</b>.</p>
        <div class="ma-access-row">
          <input id="maAdminEmail" type="email" autocomplete="username" placeholder="E-mel admin">
          <input id="maAdminPassword" type="password" autocomplete="current-password" placeholder="Kata laluan">
          <button id="maAdminSignIn" type="button">Login Admin</button>
        </div>
        <div id="maAdminLoginStatus" class="ma-status" aria-live="polite"></div>
      </div>

      <div id="maAdminTools" class="hidden">
        <div class="ma-access-row">
          <b id="maAdminWho">Admin aktif</b>
          <button class="secondary" id="maAdminSignOut" type="button">Log keluar</button>
        </div>

        <div class="ma-admin-grid">
          <div class="ma-access-box">
            <h3>Jana kod akses</h3>
            <label for="maCodeDuration">Tempoh akses</label>
            <div class="ma-access-row">
              <select id="maCodeDuration">
                <option value="30">30 hari</option>
                <option value="90">90 hari</option>
              </select>
              <button id="maCreateCode" type="button">Jana kod baharu</button>
            </div>
            <div id="maGeneratedCode"></div>
            <div class="ma-status">Kod dipaparkan sekali sahaja. Salin dan simpan sebelum menutup halaman.</div>
          </div>

          <div class="ma-access-box">
            <h3>Latihan HTML</h3>
            <p class="ma-status">Muat naik latihan melalui panel Pengurusan Latihan HTML di bawah. Latihan baharu disimpan sebagai DRAFT.</p>
            <button id="maRefreshExercises" type="button">Muat semula senarai</button>
            <div id="maAdminExercises"></div>
          </div>
        </div>

        <div id="maAdminReports" class="ma-access-box" style="margin-top:18px">
          <h3>Laporan Prestasi Pelajar</h3>
          <p class="ma-status">Analisis keputusan kuiz dan peperiksaan semua pelajar.</p>
          <button id="maRefreshReports" type="button">Muat semula laporan</button>
          <div id="maReportStatus" class="ma-status">Tekan muat semula untuk melihat laporan.</div>
          <div id="maReportSummary"></div>
          <div id="maReportRows"></div>
        </div>
      </div>
    `;

    page.appendChild(panel);
  }
  async function refreshStudent() {
    const sub = $('maSubStatus');
    const list = $('maExerciseList');

    try {
      const access = await checkAccess();
      const result = Array.isArray(access) ? access[0] : access;
      const active = !!result?.active;
       const redeemRow = $('maRedeem')?.closest('.ma-access-row');
const redeemStatus = $('maRedeemStatus');

if (redeemRow) {
  redeemRow.style.display = active ? 'none' : 'flex';
}

if (redeemStatus) {
  redeemStatus.style.display = active ? 'none' : 'block';
}
      const expiry = result?.expires_at;

      if (sub) {
        sub.innerHTML = active
          ? `<b style="color:#16865b">Akses premium aktif</b><br>Tamat: ${expiry ? new Date(expiry).toLocaleString('ms-MY') : '—'}`
          : '<b>Akses premium belum aktif / telah tamat.</b> Kuiz percuma dan kedai buku masih boleh digunakan.';
      }

      if (!active) {
        if (list) list.innerHTML = '<p class="ma-status">Latihan premium dikunci. Aktifkan kod 30 atau 90 hari untuk meneruskan.</p>';
        return;
      }

      const { data: rows, error } = await sb
        .from('html_exercises')
        .select('id,title,description,school_level,subject,topic,storage_path')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!rows?.length) {
        if (list) list.innerHTML = '<p class="ma-status">Belum ada latihan diterbitkan.</p>';
        return;
      }

      list.innerHTML = rows.map((item) => `
        <div class="ma-exercise">
          <b>${esc(item.title)}</b>
          <div class="ma-status">${esc(item.school_level)} · ${esc(item.subject)} · ${esc(item.topic || '')}</div>
          <button type="button" data-open-exercise="${esc(item.id)}">Buka latihan</button>
        </div>`).join('');

      list.querySelectorAll('[data-open-exercise]').forEach((button) => {
        button.addEventListener('click', async () => {
          const row = rows.find((item) => item.id === button.dataset.openExercise);
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
    setStatus(output, 'Sedang mengaktifkan kod...');
    try {
      await ensureStudentSession();
      const { error } = await sb.rpc('activate_access_code', { p_code: code });
      if (error) throw error;
      setStatus(output, 'Kod berjaya diaktifkan!');
      input.value = '';
      await refreshStudent();
    } catch (error) {
      setStatus(output, 'Pengaktifan gagal: ' + error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  function randomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
    return raw.match(/.{1,5}/g).join('-');
  }

  async function adminLogin() {
    const output = $('maAdminLoginStatus');
    const button = $('maAdminSignIn');
    button.disabled = true;
    setStatus(output, 'Sedang log masuk...');

    try {
      const { error } = await sb.auth.signInWithPassword({
        email: $('maAdminEmail').value.trim(),
        password: $('maAdminPassword').value
      });
      if (error) throw error;

      if (!(await isAdmin())) {
        await sb.auth.signOut();
        throw new Error('Akaun ini belum diberikan role admin.');
      }

      $('maAdminLogin').classList.add('hidden');
      $('maAdminTools').classList.remove('hidden');
      $('maAdminWho').textContent = 'Admin: ' + $('maAdminEmail').value.trim();
      showAdminUpload(true);
      await refreshAdminExercises();
    } catch (error) {
      setStatus(output, 'Login gagal: ' + error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  async function createCode() {
    const output = $('maGeneratedCode');
    const duration = Number($('maCodeDuration').value);
    const code = randomCode();

    try {
      if (!(await isAdmin())) throw new Error('Akses admin diperlukan.');
      const { error } = await sb.rpc('create_access_code', {
        p_code: code,
        p_duration_days: duration
      });
      if (error) throw error;

      output.innerHTML = `
        <p>Kod akses ${duration} hari:</p>
        <div class="ma-code">${esc(code)}</div>
        <div class="ma-access-row"><button id="maCopyCode" type="button">Salin kod</button></div>`;
      $('maCopyCode').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code);
          $('maCopyCode').textContent = 'Disalin';
        } catch {
          setStatus(output, 'Salinan automatik tidak tersedia. Sila pilih dan salin kod di atas.');
        }
      });
    } catch (error) {
      output.textContent = 'Gagal jana kod: ' + error.message;
    }
  }

  async function refreshAdminExercises() {
    const output = $('maAdminExercises');
    if (!output) return;
    output.textContent = 'Memuatkan...';

    try {
      if (!(await isAdmin())) throw new Error('Akses admin diperlukan.');
      const { data, error } = await sb
        .from('html_exercises')
        .select('id,title,school_level,subject,topic,status,created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      output.innerHTML = (data || []).map((item) => `
        <div class="ma-exercise">
          <b>${esc(item.title)}</b>
          <div class="ma-status">${esc(item.school_level)} · ${esc(item.subject)} · ${esc(item.status.toUpperCase())}</div>
          ${item.status === 'draft' ? `<button type="button" data-publish="${esc(item.id)}">Terbitkan</button>` : ''}
        </div>`).join('') || '<p class="ma-status">Tiada latihan.</p>';

      output.querySelectorAll('[data-publish]').forEach((button) => {
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            if (!(await isAdmin())) throw new Error('Akses admin diperlukan.');
            const { error: updateError } = await sb
              .from('html_exercises')
              .update({ status: 'published' })
              .eq('id', button.dataset.publish);
            if (updateError) throw updateError;
            await refreshAdminExercises();
          } catch (error) {
            alert('Gagal terbitkan: ' + error.message);
            button.disabled = false;
          }
        });
      });
    } catch (error) {
      setStatus(output, 'Ralat: ' + error.message, true);
    }
  }

  async function init() {
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
        throw new Error('Akses admin diperlukan.');
      }

      const { data: attempts, error } = await sb
        .from('exercise_attempts')
        .select('student_id,score,max_score,answers,submitted_at')
        .order('submitted_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (!attempts || attempts.length === 0) {
        status.textContent = 'Belum ada rekod latihan dalam talian.';
        return;
      }

      const studentIds = [...new Set(attempts.map(x => x.student_id).filter(Boolean))];

      const { data: profiles, error: profileError } = await sb
        .from('profiles')
        .select('id,full_name')
        .in('id', studentIds);

      if (profileError) throw profileError;

      const names = {};
      (profiles || []).forEach(profile => {
        names[profile.id] = profile.full_name || '';
      });

      const studentCount = studentIds.length;
      const totalAttempts = attempts.length;

      const percentages = attempts.map(item => {
        const score = Number(item.score || 0);
        const max = Number(item.max_score || 0);
        return max > 0 ? (score / max) * 100 : 0;
      });

      const average = Math.round(
        percentages.reduce((total, value) => total + value, 0) / percentages.length
      );

      status.textContent = 'Laporan berjaya dimuatkan.';

      summary.innerHTML = `
        <div class="ma-admin-grid" style="margin-top:14px">
          <div class="ma-access-box">
            <div class="ma-status">Jumlah pelajar</div>
            <h2>${studentCount}</h2>
          </div>
          <div class="ma-access-box">
            <div class="ma-status">Jumlah percubaan</div>
            <h2>${totalAttempts}</h2>
          </div>
          <div class="ma-access-box">
            <div class="ma-status">Purata pencapaian</div>
            <h2>${average}%</h2>
          </div>
        </div>
      `;

      rows.innerHTML = `
        <h3 style="margin-top:22px">Sejarah latihan terkini</h3>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e8ecf2">Pelajar</th>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e8ecf2">Latihan</th>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e8ecf2">Subjek</th>
                <th style="text-align:center;padding:10px;border-bottom:1px solid #e8ecf2">Markah</th>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e8ecf2">Tarikh</th>
              </tr>
            </thead>
            <tbody>
              ${attempts.map(item => {
                const answer = item.answers || {};
                const score = Number(item.score || 0);
                const max = Number(item.max_score || 0);
                const pct = max > 0 ? Math.round(score / max * 100) : 0;
                const studentName = names[item.student_id] ||
                  ('Pelajar ' + String(item.student_id || '').slice(0, 8));
                const date = item.submitted_at
                  ? new Date(item.submitted_at).toLocaleString('ms-MY')
                  : '—';

                return `
                  <tr>
                    <td style="padding:10px;border-bottom:1px solid #e8ecf2">${esc(studentName)}</td>
                    <td style="padding:10px;border-bottom:1px solid #e8ecf2">${esc(answer.type || 'Latihan')}</td>
                    <td style="padding:10px;border-bottom:1px solid #e8ecf2">${esc(answer.subject || '—')}</td>
                    <td style="padding:10px;text-align:center;border-bottom:1px solid #e8ecf2"><b>${pct}%</b></td>
                    <td style="padding:10px;border-bottom:1px solid #e8ecf2">${esc(date)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

    } catch (error) {
      status.textContent = 'Gagal memuatkan laporan: ' + error.message;
      status.style.color = '#b42318';
    }
  }
     if (!sb) {
      console.error('Supabase client tidak dijumpai. Semak susunan script.');
      return;
    }

    addNavAndPages();
    injectAdmin();

    // Admin upload controls are hidden until Supabase confirms the admin role.
    showAdminUpload(false);

    $('maRedeem')?.addEventListener('click', redeem);
    $('maAccessCode')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') redeem();
    });
    $('maAdminSignIn')?.addEventListener('click', adminLogin);
    $('maCreateCode')?.addEventListener('click', createCode);
    $('maRefreshExercises')?.addEventListener('click', refreshAdminExercises);
     $('maRefreshReports')?.addEventListener('click', refreshAdminReports);

    $('maAdminSignOut')?.addEventListener('click', async () => {
      await sb.auth.signOut();
      $('maAdminTools')?.classList.add('hidden');
      $('maAdminLogin')?.classList.remove('hidden');
      showAdminUpload(false);
      // Restore anonymous student session for premium-code activation.
      try {
        await ensureStudentSession();
        await refreshStudent();
      } catch (error) {
        console.warn('Tidak dapat memulihkan sesi pelajar:', error.message);
      }
    });

    const adminNav = document.querySelector('[data-page="admin"]');
    if (adminNav) {
      const label = adminNav.querySelector('span');
      if (label) label.textContent = 'Portal Admin';
    }

    const oldNavigate = window.navigate;
    window.navigateMA = (page) => {
      if (page === 'practice') {
        document.querySelectorAll('.page').forEach((item) => item.classList.remove('active'));
        $('page-practice')?.classList.add('active');
         // Tutup sidebar selepas memilih menu pada telefon
     $('mainNav')?.parentElement.classList.remove('open');
        document.querySelectorAll('.nav-item').forEach((button) => {
          button.classList.toggle('active', button.dataset.page === 'practice');
        });
        if ($('pageTitle')) $('pageTitle').textContent = 'Latihan Premium';
        refreshStudent();
        window.scrollTo(0, 0);
      } else if (typeof oldNavigate === 'function') {
        oldNavigate(page);
      }
    };

    // Existing app.js does not know about the dynamically added premium nav.
    document.querySelectorAll('[data-page="practice"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        window.navigateMA('practice');
      });
    });

    try {
      await ensureStudentSession();
      await refreshStudent();

      if (await isAdmin()) {
        $('maAdminLogin')?.classList.add('hidden');
        $('maAdminTools')?.classList.remove('hidden');
        if ($('maAdminWho')) $('maAdminWho').textContent = 'Admin aktif';
        showAdminUpload(true);
        await refreshAdminExercises();
      }
    } catch (error) {
      console.warn('Sesi atau akses belum tersedia:', error.message);
    }

    // Hide legacy demo admin panels; keep them untouched in the source HTML.
    if ($('page-admin')) {
      $('page-admin').querySelectorAll('.admin-grid, .panel:not(.html-upload-panel)').forEach((element) => {
        if (!element.closest('#maAdminPanel')) element.classList.add('hidden');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
