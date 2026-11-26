// =============================================
// MATH ANALYST LEARNING HUB - APP.JS
// =============================================

// SUPABASE CONNECTION
const MA_BUCKET = "html-exercises";

async function uploadHtmlExercise(file, metadata) {
  const client = window.supabaseClient ||
    (typeof supabaseClient !== "undefined" ? supabaseClient : null);

  if (!client) throw new Error("Supabase client tidak tersedia.");

  if (!file || !/\.html?$/i.test(file.name)) {
    throw new Error("Sila pilih fail HTML yang sah.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Saiz fail maksimum ialah 5 MB.");
  }

  if (!metadata.title || !metadata.school_level || !metadata.subject) {
    throw new Error("Sila lengkapkan tajuk, tahap dan subjek.");
  }

  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user || userData.user.is_anonymous) {
    throw new Error("Sila log masuk menggunakan akaun Admin.");
  }

  // Semak role Admin sebelum membenarkan upload dari browser.
  // Polisi RLS dan Storage di Supabase kekal sebagai lapisan keselamatan utama.
  const { data: adminProfile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (adminProfile?.role !== "admin") {
    throw new Error("Akses ditolak. Upload latihan hanya dibenarkan untuk Admin.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${Date.now()}_${safeName}`;

  const { data, error } = await client.storage
    .from(MA_BUCKET)
    .upload(storagePath, file, {
      contentType: "text/html",
      upsert: false
    });

  if (error) throw error;

  const { data: record, error: dbError } = await client
    .from("html_exercises")
    .insert({
      title: metadata.title,
      description: metadata.description || "",
      school_level: metadata.school_level,
      subject: metadata.subject,
      topic: metadata.topic || "",
      storage_path: data.path,
      status: "draft"
    })
    .select()
    .single();

  if (dbError) {
    await client.storage.from(MA_BUCKET).remove([data.path]);
    throw dbError;
  }

  return record;
}

// =============================================
// DATA ASAS
// =============================================

const LEVELS = [
  "Prasekolah 4 tahun",
  "Prasekolah 5 tahun",
  "Prasekolah 6 tahun",
  "Tahun 1",
  "Tahun 2",
  "Tahun 3",
  "Tahun 4",
  "Tahun 5",
  "Tahun 6",
  "Form 1",
  "Form 2",
  "Form 3",
  "Form 4",
  "Form 5"
];

const SUBJECTS = {
  "Prasekolah 4 tahun": ["Matematik", "Sains", "Bahasa Melayu", "Bahasa Inggeris"],
  "Prasekolah 5 tahun": ["Matematik", "Sains", "Bahasa Melayu", "Bahasa Inggeris"],
  "Prasekolah 6 tahun": ["Matematik", "Sains", "Bahasa Melayu", "Bahasa Inggeris"],
  "Tahun 1": ["Matematik", "Sains", "Bahasa Melayu", "Bahasa Inggeris"],
  "Tahun 2": ["Matematik", "Sains", "Bahasa Melayu", "Bahasa Inggeris"],
  "Tahun 3": ["Matematik", "Sains", "Bahasa Melayu", "Bahasa Inggeris"],
  "Tahun 4": ["Matematik", "Sains", "Bahasa Melayu", "Bahasa Inggeris"],
  "Tahun 5": ["Matematik", "Sains", "Bahasa Melayu", "Bahasa Inggeris"],
  "Tahun 6": ["Matematik", "Sains", "Bahasa Melayu", "Bahasa Inggeris"],
  "Form 1": ["Matematik", "Sains"],
  "Form 2": ["Matematik", "Sains"],
  "Form 3": ["Matematik", "Sains"],
  "Form 4": ["Matematik", "Additional Mathematics"],
  "Form 5": ["Matematik", "Additional Mathematics"]
};

const TOPICS = [
  "Nombor dan Operasi",
  "Algebra",
  "Geometri",
  "Pecahan dan Perpuluhan",
  "Pengukuran",
  "Data dan Kebarangkalian",
  "Fungsi dan Graf",
  "Trigonometri"
];

const sampleQuestions = [
  {
    level: "Tahun 4",
    subject: "Matematik",
    topic: "Nombor dan Operasi",
    q: "Berapakah nilai 245 + 137?",
    options: ["372", "382", "392", "402"],
    answer: 1,
    explanation: "245 + 137 = 382."
  },
  {
    level: "Tahun 4",
    subject: "Matematik",
    topic: "Algebra",
    q: "Jika x + 8 = 15, apakah nilai x?",
    options: ["5", "6", "7", "8"],
    answer: 2,
    explanation: "Tolak 8 pada kedua-dua belah: x = 15 − 8 = 7."
  },
  {
    level: "Tahun 4",
    subject: "Matematik",
    topic: "Geometri",
    q: "Berapakah jumlah sudut dalam sebuah segi tiga?",
    options: ["90°", "180°", "270°", "360°"],
    answer: 1,
    explanation: "Jumlah sudut pedalaman segi tiga ialah 180°."
  },
  {
    level: "Form 1",
    subject: "Matematik",
    topic: "Algebra",
    q: "Permudahkan 3x + 2x − 4.",
    options: ["5x − 4", "6x − 4", "5x + 4", "x − 4"],
    answer: 0,
    explanation: "Gabungkan sebutan serupa: 3x + 2x = 5x."
  },
  {
    level: "Form 2",
    subject: "Matematik",
    topic: "Geometri",
    q: "Sebuah sudut pada garis lurus ialah 125°. Cari sudut bersebelahan.",
    options: ["45°", "55°", "65°", "75°"],
    answer: 1,
    explanation: "Sudut pada garis lurus berjumlah 180°. 180° − 125° = 55°."
  },
  {
    level: "Form 3",
    subject: "Matematik",
    topic: "Algebra",
    q: "Selesaikan 2x − 7 = 9.",
    options: ["6", "7", "8", "9"],
    answer: 2,
    explanation: "2x = 16, maka x = 8."
  },
  {
    level: "Form 4",
    subject: "Additional Mathematics",
    topic: "Fungsi dan Graf",
    q: "Jika f(x) = 2x + 3, cari f(4).",
    options: ["8", "9", "10", "11"],
    answer: 3,
    explanation: "f(4) = 2(4) + 3 = 11."
  },
  {
    level: "Form 5",
    subject: "Matematik",
    topic: "Trigonometri",
    q: "Nilai sin 30° ialah…",
    options: ["0", "1/2", "√2/2", "1"],
    answer: 1,
    explanation: "Sudut istimewa: sin 30° = 1/2."
  },
  {
    level: "Tahun 5",
    subject: "Sains",
    topic: "Nombor dan Operasi",
    q: "Antara berikut, yang manakah sumber tenaga boleh baharu?",
    options: ["Arang batu", "Petroleum", "Tenaga suria", "Gas asli"],
    answer: 2,
    explanation: "Tenaga suria diperoleh daripada cahaya matahari dan boleh diperbaharui."
  },
  {
    level: "Tahun 4",
    subject: "Bahasa Melayu",
    topic: "Nombor dan Operasi",
    q: "Pilih kata nama am.",
    options: ["Ali", "Malaysia", "sekolah", "Isnin"],
    answer: 2,
    explanation: "'Sekolah' ialah kata nama am."
  }
];

const defaultBooks = [
  {
    title: "Kuasai Algebra Berajah",
    desc: "Latihan algebra berajah untuk membina kefahaman konsep.",
    price: "RM16.90",
    label: "ALGEBRA"
  },
  {
    title: "Mini Modul Algebra",
    desc: "Modul ringkas bersaiz A5 untuk latihan kendiri.",
    price: "—",
    label: "MINI MODUL"
  },
  {
    title: "Mini Modul Geometri",
    desc: "Koleksi latihan geometri dan kemahiran penyelesaian masalah.",
    price: "—",
    label: "GEOMETRI"
  },
  {
    title: "Mind Booster Mathematics",
    desc: "Latihan Matematik dwibahasa untuk Tahap 2.",
    price: "—",
    label: "MIND BOOSTER"
  }
];

let questions =
  JSON.parse(localStorage.getItem("ma_questions") || "null") ||
  sampleQuestions.slice();

let history = JSON.parse(localStorage.getItem("ma_history") || "[]");

let quizSet = [];
let quizIndex = 0;
let quizAnswers = [];
let quizStarted = 0;
let quizInterval = null;

let examSet = [];
let examIndex = 0;
let examAnswers = [];
let examStarted = 0;
let examInterval = null;
let examSeconds = 1800;
let examMode = "practice";

const $ = id => document.getElementById(id);

function save() {
  localStorage.setItem("ma_questions", JSON.stringify(questions));
  localStorage.setItem("ma_history", JSON.stringify(history));
}

// =============================================
// SIMPAN LAPORAN KE SUPABASE
// =============================================

async function saveAttemptToCloud(record) {
  const client = window.supabaseClient ||
    (typeof supabaseClient !== "undefined" ? supabaseClient : null);

  if (!client) {
    console.error("Supabase client tidak tersedia.");
    return false;
  }

  try {
    const { data: sessionData, error } = await client.auth.getSession();
    if (error) throw error;

    const session = sessionData?.session;

    if (!session || session.user?.is_anonymous) {
      throw new Error(
        "Sila log masuk menggunakan Google sebelum menyimpan rekod."
      );
    }

    const trainingType =
      record.type === "Kuiz" ? "quiz" :
      record.type === "Exam Simulator" ? "exam" : null;

    if (!trainingType) {
      throw new Error("Jenis latihan tidak dikenali.");
    }

    const { data, error: saveError } = await client.rpc(
      "submit_exercise_attempt",
      {
        p_training_type: trainingType,
        p_record: record
      }
    );

    if (saveError) throw saveError;

    console.log("Laporan berjaya disimpan:", data);
    return true;

  } catch (error) {
    console.error("Gagal menyimpan laporan:", error.message);

    if (error.message.includes("Kuota percuma")) {
      alert(
        "Kuota percuma anda telah habis.\n\n" +
        "Sila langgan pakej 1 bulan atau 3 bulan untuk meneruskan latihan."
      );
    }

    return false;
  }
}

// =============================================
// DROPDOWN DAN NAVIGASI
// =============================================

function fillSelect(element, values) {
  element.innerHTML = values
    .map(value => `<option>${value}</option>`)
    .join("");
}

function initSelects() {
  fillSelect($("quizLevel"), LEVELS);
  fillSelect($("adminLevel"), LEVELS);

  updateSubjects($("quizLevel").value, $("quizSubject"));
  updateSubjects($("adminLevel").value, $("adminSubject"));

  fillSelect($("quizTopic"), TOPICS);

  $("quizLevel").addEventListener("change", () => {
    updateSubjects($("quizLevel").value, $("quizSubject"));
  });

  $("adminLevel").addEventListener("change", () => {
    updateSubjects($("adminLevel").value, $("adminSubject"));
  });
}

function updateSubjects(level, element) {
  fillSelect(element, SUBJECTS[level] || ["Matematik"]);
}

function navigate(page) {
  const target = $("page-" + page);
  if (!target) {
    console.warn("Halaman tidak dijumpai:", page);
    return;
  }

  document.querySelectorAll(".page").forEach(pageElement => {
    pageElement.classList.remove("active");
  });

  target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const names = {
    home: "Dashboard",
    books: "Kedai Buku",
    quiz: "Kuiz Interaktif",
    exam: "Exam Simulator",
    classes: "Kelas Online",
    learning: "Pembelajaran Saya",
    bank: "Bank Soalan",
    admin: "Portal Admin"
  };

  $("pageTitle").textContent = names[page] || "Math Analyst";
  $("mainNav").parentElement.classList.remove("open");

  if (page === "learning") renderHistory();
  if (page === "admin") renderAdminQuestions();
  if (page === "home") renderStats();

  window.scrollTo(0, 0);
}

window.navigate = navigate;

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.go));
});

$("mobileMenu").addEventListener("click", () => {
  $("mainNav").parentElement.classList.toggle("open");
});

function renderBooks() {
  $("bookGrid").innerHTML = defaultBooks.map((book, index) => `
    <article class="book-card">
      <div class="book-cover">
        <span>
          ${book.label}<br>
          <small style="font:500 9px 'DM Sans';letter-spacing:2px">
            MATH ANALYST
          </small>
        </span>
      </div>
      <div class="book-info">
        <h3>${book.title}</h3>
        <p>${book.desc}</p>
        <div class="price">${book.price}</div>
        <button class="btn btn-primary book-enquire" data-book="${index}">
          Tanya / Beli
        </button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".book-enquire").forEach(button => {
    button.addEventListener("click", () => {
      alert(
        "Pautan Shopee dan WhatsApp akan dimasukkan selepas maklumat produk diberikan."
      );
    });
  });
}

// =============================================
// SEMAK LOGIN DAN KUOTA LATIHAN
// =============================================

async function checkTrainingQuota(trainingType) {
  const client = window.supabaseClient ||
    (typeof supabaseClient !== "undefined" ? supabaseClient : null);

  if (!client) {
    alert("Sambungan sistem tidak tersedia. Sila cuba lagi.");
    return false;
  }

  try {
    // Pelajar mesti menggunakan akaun Google sebenar.
    if (typeof window.requireStudentLoginMA !== "function") {
      throw new Error(
        "Modul log masuk belum tersedia. Muat semula halaman."
      );
    }

    const loginReady = await window.requireStudentLoginMA();
    if (!loginReady) return false;

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError) throw sessionError;

    const session = sessionData?.session;

    if (!session || session.user?.is_anonymous) {
      alert("Sila log masuk menggunakan Google dahulu.");
      return false;
    }

    const { data, error: quotaError } = await client.rpc(
      "check_training_quota",
      { p_training_type: trainingType }
    );

    if (quotaError) throw quotaError;

    if (!data.allowed) {
      alert(
        "Kuota percuma anda telah habis untuk latihan ini.\n\n" +
        "Langgan pakej Math Analyst 1 bulan atau 3 bulan " +
        "untuk meneruskan latihan."
      );
      return false;
    }

    return true;

  } catch (error) {
    console.error("Semakan kuota gagal:", error.message);
    alert("Tidak dapat menyemak kuota: " + error.message);
    return false;
  }
}

// =============================================
// MODUL KUIZ INTERAKTIF
// =============================================

function getFiltered(level, subject, topic) {
  return questions.filter(question =>
    (!level || question.level === level) &&
    (!subject || question.subject === subject) &&
    (!topic || question.topic === topic)
  );
}

async function startQuiz() {
  const quotaAllowed = await checkTrainingQuota("quiz");
  if (!quotaAllowed) return;

  const level = $("quizLevel").value;
  const subject = $("quizSubject").value;
  const topic = $("quizTopic").value;

  let pool = getFiltered(level, subject, topic);

  if (!pool.length) {
    pool = questions.filter(question =>
      question.level === level && question.subject === subject
    );
  }

  if (!pool.length) {
    alert(
      "Belum ada soalan untuk pilihan ini. Admin boleh tambah soalan melalui Portal Admin."
    );
    return;
  }

  quizSet = pool.slice(0, Number($("quizCount").value));
  quizIndex = 0;
  quizAnswers = Array(quizSet.length).fill(null);
  quizStarted = Date.now();

  $("quizSetup").classList.add("hidden");
  $("quizResult").classList.add("hidden");
  $("quizStage").classList.remove("hidden");

  clearInterval(quizInterval);

  quizInterval = setInterval(() => {
    const seconds = Math.floor((Date.now() - quizStarted) / 1000);
    $("quizTimer").textContent =
      `${String(Math.floor(seconds / 60)).padStart(2, "0")}:` +
      `${String(seconds % 60).padStart(2, "0")}`;
  }, 1000);

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const question = quizSet[quizIndex];

  $("quizCounter").textContent =
    `Soalan ${quizIndex + 1} / ${quizSet.length}`;

  $("quizProgressBar").style.width =
    `${(quizIndex + 1) / quizSet.length * 100}%`;

  $("questionArea").innerHTML = `
    <div class="question-meta">
      ${question.level} · ${question.subject} · ${question.topic}
    </div>
    <div class="question-title">${question.q}</div>
    <div>
      ${question.options.map((option, index) => `
        <div
          class="answer-option ${
            quizAnswers[quizIndex] === index ? "selected" : ""
          }"
          data-answer="${index}">
          <span class="option-letter">${"ABCD"[index]}</span>
          ${option}
        </div>
      `).join("")}
    </div>
  `;

  document.querySelectorAll("#questionArea .answer-option").forEach(element => {
    element.addEventListener("click", () => {
      quizAnswers[quizIndex] = Number(element.dataset.answer);
      renderQuizQuestion();
    });
  });

  $("nextQuestion").textContent =
    quizIndex === quizSet.length - 1
      ? "Hantar jawapan ✓"
      : "Seterusnya →";
}

$("startQuiz").addEventListener("click", startQuiz);

$("nextQuestion").addEventListener("click", () => {
  if (quizAnswers[quizIndex] === null) {
    alert("Sila pilih satu jawapan dahulu.");
    return;
  }

  if (quizIndex < quizSet.length - 1) {
    quizIndex++;
    renderQuizQuestion();
  } else {
    finishQuiz();
  }
});

$("quitQuiz").addEventListener("click", () => {
  clearInterval(quizInterval);
  $("quizStage").classList.add("hidden");
  $("quizSetup").classList.remove("hidden");
});

function finishQuiz() {
  clearInterval(quizInterval);

  const correct = quizSet.filter(
    (question, index) => quizAnswers[index] === question.answer
  ).length;

  const percentage = Math.round(correct / quizSet.length * 100);
  const elapsed = Math.round((Date.now() - quizStarted) / 1000);

  const topicStats = {};

  quizSet.forEach((question, index) => {
    topicStats[question.topic] ??= { correct: 0, total: 0 };
    topicStats[question.topic].total++;

    if (quizAnswers[index] === question.answer) {
      topicStats[question.topic].correct++;
    }
  });

  const attempt = {
    type: "Kuiz",
    level: $("quizLevel").value,
    subject: $("quizSubject").value,
    topic: $("quizTopic").value,
    score: percentage,
    correct,
    total: quizSet.length,
    elapsed,
    answers: quizSet.map((question, index) => ({
      question: question.q,
      topic: question.topic,
      selected: quizAnswers[index],
      correct_answer: question.answer,
      is_correct: quizAnswers[index] === question.answer
    }))
  };

  history.unshift({
    type: "Kuiz",
    date: new Date().toLocaleString("ms-MY"),
    score: percentage,
    correct,
    total: quizSet.length,
    elapsed
  });

  save();

  $("quizStage").classList.add("hidden");
  $("quizResult").classList.remove("hidden");

  $("quizResult").innerHTML = `
    <span class="eyebrow">LAPORAN PRESTASI INDIVIDU</span>
    <h2>Kuiz selesai!</h2>
    <div class="result-score">${percentage}%</div>

    <div class="result-summary">
      <div>
        <b>${correct}/${quizSet.length}</b>
        <span>Jawapan betul</span>
      </div>
      <div>
        <b>${Math.floor(elapsed / 60)}m ${elapsed % 60}s</b>
        <span>Masa digunakan</span>
      </div>
    </div>

    <h3>Analisis mengikut topik</h3>

    ${Object.entries(topicStats).map(([topic, result]) => `
      <div class="feedback">
        <b>${topic}</b> — ${result.correct}/${result.total} betul
        (${Math.round(result.correct / result.total * 100)}%)
      </div>
    `).join("")}

    <div id="cloudSaveStatus" class="feedback">
      Sedang menyimpan laporan...
    </div>

    <button class="btn btn-primary" id="retryQuiz">Cuba lagi</button>
  `;

  $("retryQuiz").addEventListener("click", () => {
    $("quizResult").classList.add("hidden");
    $("quizSetup").classList.remove("hidden");
  });

  saveAttemptToCloud(attempt).then(success => {
    const status = $("cloudSaveStatus");

    if (status) {
      status.textContent = success
        ? "Laporan berjaya disimpan ke akaun anda."
        : "Laporan gagal disimpan ke awan. Sila semak sambungan.";
    }
  });
}

// =============================================
// MODUL EXAM SIMULATOR
// =============================================

async function startExam() {
  const quotaAllowed = await checkTrainingQuota("exam");
  if (!quotaAllowed) return;

  const level = $("examLevel").value;
  const subject = $("examSubject").value;

  const pool = questions.filter(question =>
    question.level === level && question.subject === subject
  );

  if (!pool.length) {
    alert(
      "Belum ada set contoh untuk kombinasi ini. Tambah soalan melalui Portal Admin."
    );
    return;
  }

  examSet = pool.slice(0, Number($("examCount").value));
  examAnswers = Array(examSet.length).fill(null);
  examIndex = 0;
  examMode = $("examMode").value;
  examSeconds = examMode === "exam" ? 1800 : 0;
  examStarted = Date.now();

  $("examSetup").classList.add("hidden");
  $("examResult").classList.add("hidden");
  $("examStage").classList.remove("hidden");

  clearInterval(examInterval);

  if (examMode === "exam") {
    examInterval = setInterval(() => {
      examSeconds--;
      updateExamTimer();

      if (examSeconds <= 0) finishExam();
    }, 1000);
  } else {
    $("examTimer").textContent = "Tanpa had masa";
  }

  renderExamQuestion();
}

function updateExamTimer() {
  $("examTimer").textContent =
    `${String(Math.floor(examSeconds / 60)).padStart(2, "0")}:` +
    `${String(examSeconds % 60).padStart(2, "0")}`;
}

function renderExamQuestion() {
  const question = examSet[examIndex];

  $("examCounter").textContent =
    `Soalan ${examIndex + 1} / ${examSet.length}`;

  $("examProgressBar").style.width =
    `${(examIndex + 1) / examSet.length * 100}%`;

  $("examQuestion").innerHTML = `
    <div class="question-meta">
      KERTAS LATIHAN · ${$("examLevel").value} · ${$("examSubject").value}
    </div>

    <div class="question-title">${question.q}</div>

    ${question.options.map((option, index) => `
      <div
        class="answer-option ${
          examAnswers[examIndex] === index ? "selected" : ""
        }"
        data-answer="${index}">
        <span class="option-letter">${"ABCD"[index]}</span>
        ${option}
      </div>
    `).join("")}
  `;

  document.querySelectorAll("#examQuestion .answer-option").forEach(element => {
    element.addEventListener("click", () => {
      examAnswers[examIndex] = Number(element.dataset.answer);
      renderExamQuestion();
    });
  });

  $("examPrev").disabled = examIndex === 0;

  $("examNext").textContent =
    examIndex === examSet.length - 1
      ? "Hantar kertas ✓"
      : "Seterusnya →";
}

$("startExam").addEventListener("click", startExam);

$("examPrev").addEventListener("click", () => {
  if (examIndex > 0) {
    examIndex--;
    renderExamQuestion();
  }
});

$("examNext").addEventListener("click", () => {
  if (examIndex < examSet.length - 1) {
    examIndex++;
    renderExamQuestion();
  } else {
    finishExam();
  }
});

function finishExam() {
  clearInterval(examInterval);

  const correct = examSet.filter(
    (question, index) => examAnswers[index] === question.answer
  ).length;

  const percentage = Math.round(correct / examSet.length * 100);
  const elapsed = Math.round((Date.now() - examStarted) / 1000);

  const attempt = {
    type: "Exam Simulator",
    level: $("examLevel").value,
    subject: $("examSubject").value,
    mode: examMode,
    score: percentage,
    correct,
    total: examSet.length,
    elapsed,
    answers: examSet.map((question, index) => ({
      question: question.q,
      topic: question.topic,
      selected: examAnswers[index],
      correct_answer: question.answer,
      is_correct: examAnswers[index] === question.answer
    }))
  };

  history.unshift({
    type: "Exam Simulator",
    date: new Date().toLocaleString("ms-MY"),
    score: percentage,
    correct,
    total: examSet.length,
    elapsed
  });

  save();

  $("examStage").classList.add("hidden");
  $("examResult").classList.remove("hidden");

  $("examResult").innerHTML = `
    <span class="eyebrow">KEPUTUSAN SIMULASI</span>
    <h2>Peperiksaan selesai</h2>
    <div class="result-score">${percentage}%</div>

    <div class="result-summary">
      <div>
        <b>${correct}/${examSet.length}</b>
        <span>Jawapan betul</span>
      </div>
      <div>
        <b>${examSet.length - correct}</b>
        <span>Jawapan salah / kosong</span>
      </div>
    </div>

    <h3>Semakan jawapan</h3>

    ${examSet.map((question, index) => `
      <div class="feedback">
        <b>Soalan ${index + 1}: ${quizLetter(question.answer)}</b>
        — ${question.explanation || "Tiada penerangan disediakan."}
        <br>
        Jawapan anda:
        ${examAnswers[index] === null
          ? "Tidak dijawab"
          : quizLetter(examAnswers[index])}
      </div>
    `).join("")}

    <div id="cloudSaveStatus" class="feedback">
      Sedang menyimpan laporan...
    </div>

    <button class="btn btn-primary" id="examAgain">
      Kembali ke tetapan
    </button>
  `;

  $("examAgain").addEventListener("click", () => {
    $("examResult").classList.add("hidden");
    $("examSetup").classList.remove("hidden");
  });

  saveAttemptToCloud(attempt).then(success => {
    const status = $("cloudSaveStatus");

    if (status) {
      status.textContent = success
        ? "Laporan berjaya disimpan ke akaun anda."
        : "Laporan gagal disimpan ke awan. Sila semak sambungan.";
    }
  });
}

function quizLetter(index) {
  return "ABCD"[index];
}


// =============================================
// ADMIN - PENGURUSAN SOALAN KUIZ
// =============================================

let editingQuestionIndex = null;

const questionForm = $("questionForm");

function resetQuestionForm() {
  editingQuestionIndex = null;

  if (questionForm) questionForm.reset();

  const submitButton = questionForm?.querySelector(
    'button[type="submit"]'
  );

  if (submitButton) submitButton.textContent = "Simpan Soalan";

  const cancelButton = $("cancelQuestionEdit");
  if (cancelButton) cancelButton.classList.add("hidden");
}

function editAdminQuestion(index) {
  const question = questions[index];

  if (!question || !questionForm) return;

  editingQuestionIndex = index;

  $("adminLevel").value = question.level;
  updateSubjects(question.level, $("adminSubject"));

  $("adminSubject").value = question.subject;
  $("adminTopic").value = question.topic;
  $("adminQuestion").value = question.q;

  $("optA").value = question.options?.[0] || "";
  $("optB").value = question.options?.[1] || "";
  $("optC").value = question.options?.[2] || "";
  $("optD").value = question.options?.[3] || "";

  $("adminCorrect").value = String(question.answer);
  $("adminExplanation").value = question.explanation || "";

  const submitButton = questionForm.querySelector(
    'button[type="submit"]'
  );

  if (submitButton) submitButton.textContent = "Kemaskini Soalan";

  const cancelButton = $("cancelQuestionEdit");
  if (cancelButton) cancelButton.classList.remove("hidden");

  questionForm.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

if (questionForm) {
  questionForm.addEventListener("submit", event => {
    event.preventDefault();

    const updatedQuestion = {
      level: $("adminLevel").value,
      subject: $("adminSubject").value,
      topic: $("adminTopic").value.trim(),
      q: $("adminQuestion").value.trim(),
      options: [
        $("optA").value.trim(),
        $("optB").value.trim(),
        $("optC").value.trim(),
        $("optD").value.trim()
      ],
      answer: Number($("adminCorrect").value),
      explanation: $("adminExplanation").value.trim()
    };

    if (
      !updatedQuestion.q ||
      !updatedQuestion.topic ||
      updatedQuestion.options.some(option => !option)
    ) {
      alert("Sila lengkapkan soalan, topik dan keempat-empat pilihan jawapan.");
      return;
    }

    if (
      !Number.isInteger(updatedQuestion.answer) ||
      updatedQuestion.answer < 0 ||
      updatedQuestion.answer > 3
    ) {
      alert("Sila pilih jawapan yang betul.");
      return;
    }

    if (editingQuestionIndex !== null) {
      questions[editingQuestionIndex] = updatedQuestion;
      alert("Soalan berjaya dikemaskini.");
    } else {
      questions.push(updatedQuestion);
      alert("Soalan baharu berjaya ditambah.");
    }

    save();
    resetQuestionForm();
    renderAdminQuestions();
  });
}

function renderAdminQuestions() {
  const list = $("adminQuestionList");
  if (!list) return;
  const count = $("adminQuestionCount");
if (count) count.textContent = `Soalan: ${questions.length}`;

  list.innerHTML = questions.map((question, index) => `
    <div class="admin-question">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <b>${question.level} · ${question.subject}</b>

        <div style="display:flex;gap:6px">
          <button
            type="button"
            class="btn btn-secondary"
            data-edit="${index}">
            Edit
          </button>

          <button
            type="button"
            class="btn btn-danger"
            data-delete="${index}">
            Padam
          </button>
        </div>
      </div>

      <p><b>${question.topic}</b></p>
      <p>${question.q}</p>

      <small>
        Jawapan betul: ${"ABCD"[question.answer] || "-"}
      </small>
    </div>
  `).join("") || '<div class="empty-state">Tiada soalan.</div>';

  list.querySelectorAll("[data-edit]").forEach(button => {
    button.addEventListener("click", () => {
      editAdminQuestion(Number(button.dataset.edit));
    });
  });

  list.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.delete);

      if (!confirm("Anda pasti mahu memadam soalan ini?")) return;

      questions.splice(index, 1);

      if (editingQuestionIndex === index) {
        resetQuestionForm();
      } else if (
        editingQuestionIndex !== null &&
        editingQuestionIndex > index
      ) {
        editingQuestionIndex--;
      }

      save();
      renderAdminQuestions();
      alert("Soalan berjaya dipadam.");
    });
  });
}

const cancelQuestionEdit = $("cancelQuestionEdit");

if (cancelQuestionEdit) {
  cancelQuestionEdit.addEventListener("click", resetQuestionForm);
}

// =============================================
// SEJARAH DAN STATISTIK
// =============================================

function renderHistory() {
  $("historyList").innerHTML = history.length
    ? history.map(item => `
        <div class="history-item">
          <div>
            <b>${item.type}</b>
            <span class="muted">
              ${item.date} · ${item.correct}/${item.total} betul
            </span>
          </div>
          <div class="history-score">${item.score}%</div>
        </div>
      `).join("")
    : '<div class="empty-state">Belum ada rekod. Selesaikan kuiz untuk melihat laporan di sini.</div>';
}

function renderStats() {
  $("statQuizzes").textContent =
    history.filter(item => item.type === "Kuiz").length;

  $("statExams").textContent =
    history.filter(item => item.type === "Exam Simulator").length;

  $("statAverage").textContent = history.length
    ? Math.round(
        history.reduce((total, item) => total + item.score, 0) /
        history.length
      ) + "%"
    : "—";
}

$("clearHistory").addEventListener("click", () => {
  if (confirm("Kosongkan semua rekod latihan demo pada peranti ini?")) {
    history = [];
    save();
    renderHistory();
    renderStats();
  }
});

$("classEnquire").addEventListener("click", () => {
  alert(
    "Masukkan nombor WhatsApp dan pautan pendaftaran kelas apabila kandungan sebenar disediakan."
  );
});

// =============================================
// PRATONTON LATIHAN HTML
// =============================================

(function initHtmlPracticePreview() {
  const input = document.getElementById("htmlPracticeUpload");
  const load = document.getElementById("htmlPracticeLoad");
  const clear = document.getElementById("htmlPracticeClear");
  const frame = document.getElementById("htmlPracticeFrame");
  const wrap = document.getElementById("htmlPracticeFrameWrap");
  const status = document.getElementById("htmlPracticeStatus");
  const fileName = document.getElementById("htmlPracticeFileName");

  if (!input || !load || !clear || !frame || !wrap || !status) {
    console.error("Elemen pratonton HTML tidak lengkap.");
    return;
  }

  let currentUrl = null;

  const saveButton = document.getElementById("htmlPracticeSave");
  const titleInput = document.getElementById("htmlPracticeTitle");
  const levelInput = document.getElementById("htmlPracticeLevel");
  const subjectInput = document.getElementById("htmlPracticeSubject");
  const topicInput = document.getElementById("htmlPracticeTopic");

  if (saveButton) {
    saveButton.addEventListener("click", async () => {
  alert("Butang upload telah ditekan.");

  const file = input.files && input.files[0];
  alert("jumlah fail dikesan: " + (input.files ? input.files.length : "input tiada"));
      if (!file) {
        status.textContent = "Sila pilih fail HTML dahulu.";
        return;
      }

      if (
        !titleInput.value.trim() ||
        !levelInput.value ||
        !subjectInput.value.trim()
      ) {
        status.textContent = "Sila lengkapkan tajuk, tahap dan subjek.";
        return;
      }

      saveButton.disabled = true;
      status.textContent = "Sedang memuat naik latihan...";

      try {
        const record = await uploadHtmlExercise(file, {
          title: titleInput.value.trim(),
          school_level: levelInput.value,
          subject: subjectInput.value.trim(),
          topic: topicInput.value.trim()
        });

        status.textContent = "Berjaya! Latihan disimpan sebagai DRAFT.";
        alert("Latihan berjaya dimuat naik ke Supabase.");
        console.log("Latihan disimpan:", record);

      } catch (error) {
        console.error(error);
        status.textContent = "Upload gagal: " + error.message;

      } finally {
        saveButton.disabled = false;
      }
    });
  }

  load.addEventListener("click", () => {
    const file = input.files && input.files[0];

    if (!file) {
      status.textContent = "Sila pilih fail HTML dahulu.";
      return;
    }

    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
      status.textContent = "Fail tidak sah. Pilih fail .html.";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      status.textContent =
        "Saiz fail melebihi 5 MB. Sila pilih fail lebih kecil.";
      return;
    }

    if (currentUrl) URL.revokeObjectURL(currentUrl);

    currentUrl = URL.createObjectURL(file);
    frame.src = currentUrl;
    fileName.textContent = file.name;
    wrap.classList.remove("hidden");

    status.textContent =
      "Pratonton dibuka. Fail ini hanya berada pada sesi browser ini.";
  });

  clear.addEventListener("click", () => {
    if (currentUrl) URL.revokeObjectURL(currentUrl);

    currentUrl = null;
    frame.removeAttribute("src");
    input.value = "";
    wrap.classList.add("hidden");
    status.textContent = "Pratonton dikosongkan.";
  });
})();

// =============================================
// BANK SOALAN MATH ANALYST
// =============================================

let bankQuestions = [];
let bankAnswers = [];
let bankIndex = 0;
let bankStarted = false;

function getBankClient() {
  return window.supabaseClient ||
    (typeof supabaseClient !== "undefined" ? supabaseClient : null);
}

function setBankStatus(message, isError = false) {
  const status = $("bankStatus");
  if (!status) return;

  status.textContent = message;
  status.style.color = isError ? "#b42318" : "#68748a";
}

async function loadBankQuestions() {
  const client = getBankClient();

  if (!client) {
    throw new Error("Sambungan Supabase tidak tersedia.");
  }

  const level = $("bankLevel").value;
  const subject = $("bankSubject").value;
  const topic = $("bankTopic").value;

  if (!level || !subject) {
    throw new Error("Sila pilih tahap dan subjek dahulu.");
  }

  setBankStatus("Sedang mengambil soalan...");

  const { data, error } = await client.rpc(
    "get_student_questions",
    {
      p_school_level: level,
      p_subject: subject,
      p_topic: null,
      p_limit: 50
    }
  );

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error("Belum ada soalan diterbitkan untuk pilihan ini.");
  }

  const topicSelect = $("bankTopic");
  const selectedTopic = topic;

  const topics = [...new Set(data.map(question => question.topic))].sort();

  topicSelect.innerHTML =
    '<option value="">Semua topik</option>' +
    topics.map(item => `<option value="${item}">${item}</option>`).join("");

  if (topics.includes(selectedTopic)) {
    topicSelect.value = selectedTopic;
  }

  const filtered = topicSelect.value
    ? data.filter(question => question.topic === topicSelect.value)
    : data;

  if (filtered.length === 0) {
    throw new Error("Tiada soalan untuk topik yang dipilih.");
  }

  bankQuestions = filtered.slice(0, Number($("bankCount").value));
  bankAnswers = Array(bankQuestions.length).fill(null);
  bankIndex = 0;

  return bankQuestions;
}

function renderBankQuestion() {
  const question = bankQuestions[bankIndex];
  if (!question) return;

  $("bankQuestionStage").classList.remove("hidden");
  $("bankResult").classList.add("hidden");

  $("bankCounter").textContent =
    `Soalan ${bankIndex + 1} / ${bankQuestions.length}`;

  $("bankScore").textContent =
    `Markah maksimum: ${bankQuestions.reduce(
      (total, item) => total + Number(item.marks || 1), 0
    )}`;

  $("bankProgressBar").style.width =
    `${((bankIndex + 1) / bankQuestions.length) * 100}%`;

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

  let content = `
    <div class="question-meta">
      ${escapeHTML(question.school_level)} ·
      ${escapeHTML(question.subject)} ·
      ${escapeHTML(question.topic)}
    </div>

    <div class="question-title">
      ${escapeHTML(question.question_text)}
    </div>

    <p class="muted">
      ${Number(question.marks || 1)} markah ·
      ${escapeHTML(question.difficulty || "Sederhana")}
    </p>
  `;

  if (question.question_type === "objective") {
    const options = question.options || {};

    content += `
      <div class="bank-options">
        ${["A", "B", "C", "D"].map(letter => `
          <div
            class="answer-option ${
              bankAnswers[bankIndex] === letter ? "selected" : ""
            }"
            data-bank-answer="${letter}">
            <span class="option-letter">${letter}</span>
            ${escapeHTML(options[letter] || "")}
          </div>
        `).join("")}
      </div>
    `;
  } else {
    content += `
      <label><b>Jawapan anda:</b></label>
      <textarea
        id="bankSubjectiveAnswer"
        rows="4"
        style="width:100%;padding:12px;margin-top:8px"
        placeholder="Taip jawapan anda di sini..."
      >${escapeHTML(bankAnswers[bankIndex] || "")}</textarea>
    `;
  }

  $("bankQuestionArea").innerHTML = content;

  document.querySelectorAll("[data-bank-answer]").forEach(option => {
    option.addEventListener("click", () => {
      bankAnswers[bankIndex] = option.dataset.bankAnswer;
      renderBankQuestion();
    });
  });

  const subjectiveInput = $("bankSubjectiveAnswer");

  if (subjectiveInput) {
    subjectiveInput.addEventListener("input", () => {
      bankAnswers[bankIndex] = subjectiveInput.value;
    });
  }

  $("bankNext").textContent =
    bankIndex === bankQuestions.length - 1
      ? "Hantar Jawapan"
      : "Seterusnya";
}

async function startBank() {
  const button = $("bankStart");
  button.disabled = true;

  try {
    const quotaAllowed = await checkTrainingQuota("bank");
    if (!quotaAllowed) return;

    await loadBankQuestions();

    bankStarted = true;

    $("bankQuestionStage").classList.remove("hidden");
    $("bankResult").classList.add("hidden");

    setBankStatus(`Berjaya memuatkan ${bankQuestions.length} soalan.`);
    renderBankQuestion();

  } catch (error) {
    setBankStatus(error.message, true);
    $("bankQuestionStage").classList.add("hidden");

  } finally {
    button.disabled = false;
  }
}

async function handleBankNext() {
  const answer = bankAnswers[bankIndex];

  if (
    answer === null ||
    answer === undefined ||
    String(answer).trim() === ""
  ) {
    alert("Sila jawab soalan ini dahulu.");
    return;
  }

  if (bankIndex < bankQuestions.length - 1) {
    bankIndex++;
    renderBankQuestion();
  } else {
    await submitBankAnswers();
  }
}

function handleBankQuit() {
  if (!confirm("Anda pasti mahu keluar daripada latihan ini?")) return;

  bankStarted = false;
  bankQuestions = [];
  bankAnswers = [];
  bankIndex = 0;

  $("bankQuestionStage").classList.add("hidden");
  $("bankResult").classList.add("hidden");

  setBankStatus("Latihan telah dihentikan.");
}

// Fungsi ini dipanggil oleh access.js selepas halaman Bank Soalan diwujudkan.
window.MABank = {
  start: startBank,
  next: handleBankNext,
  quit: handleBankQuit,
  refreshTopics: refreshBankTopics
};

async function refreshBankTopics() {
  const level = $("bankLevel").value;
  const subject = $("bankSubject").value;
  const topicSelect = $("bankTopic");

  topicSelect.innerHTML = '<option value="">Semua topik</option>';

  if (!level || !subject) return;

  setBankStatus("Menyemak log masuk Google...");

  try {
    if (typeof window.requireStudentLoginMA !== "function") {
      throw new Error(
        "Modul log masuk belum tersedia. Muat semula halaman."
      );
    }

    const loginReady = await window.requireStudentLoginMA();

    if (!loginReady) {
      setBankStatus(
        "Log masuk Google diperlukan untuk memuatkan topik."
      );
      return;
    }

    setBankStatus("Sedang memuatkan senarai topik...");

    const client = getBankClient();

    const { data, error } = await client.rpc(
      "get_student_questions",
      {
        p_school_level: level,
        p_subject: subject,
        p_topic: null,
        p_limit: 50
      }
    );

    if (error) throw error;

    const topics = [
      ...new Set((data || []).map(question => question.topic).filter(Boolean))
    ].sort();

    topicSelect.innerHTML =
      '<option value="">Semua topik</option>' +
      topics.map(topic =>
        `<option value="${topic}">${topic}</option>`
      ).join("");

    setBankStatus(
      topics.length
        ? `${topics.length} topik tersedia.`
        : "Belum ada topik diterbitkan untuk pilihan ini."
    );

  } catch (error) {
    setBankStatus(error.message, true);
  }
}

async function submitBankAnswers() {
  const client = getBankClient();
  const button = $("bankNext");

  button.disabled = true;
  button.textContent = "Sedang menyemak...";

  try {
    const answers = bankQuestions.map((question, index) => ({
      question_id: question.id,
      answer: String(bankAnswers[index]).trim()
    }));

    const { data, error } = await client.rpc(
      "submit_question_bank_attempt",
      {
        p_school_level: $("bankLevel").value,
        p_subject: $("bankSubject").value,
        p_topic: $("bankTopic").value || null,
        p_answers: answers
      }
    );

    if (error) throw error;

    $("bankQuestionStage").classList.add("hidden");
    $("bankResult").classList.remove("hidden");

    const result = Array.isArray(data) ? data[0] : data;

    $("bankResult").innerHTML = `
      <div class="result-score">
        ${Number(result.percentage || 0)}%
      </div>

      <h2>Latihan selesai!</h2>

      <p>
        Jawapan betul:
        <b>${result.correct_answers} / ${result.total_questions}</b>
      </p>

      <p>
        Markah:
        <b>${result.score} / ${result.max_score}</b>
      </p>

      <p>Keputusan berjaya disimpan.</p>

      <button class="btn btn-primary" id="bankTryAgain">
        Cuba latihan lagi
      </button>
    `;

    $("bankTryAgain").addEventListener("click", () => {
      $("bankResult").classList.add("hidden");
      $("bankQuestionStage").classList.add("hidden");
      setBankStatus("Pilih tetapan untuk memulakan latihan baharu.");
    });

    setBankStatus("Jawapan berjaya dihantar dan disimpan.");

  } catch (error) {
    alert("Gagal menghantar jawapan: " + error.message);
    setBankStatus("Gagal menyimpan keputusan.", true);

  } finally {
    button.disabled = false;
    button.textContent = "Seterusnya";
  }
}

// Mula aplikasi selepas fungsi dan data disediakan.
initSelects();
renderBooks();
renderStats();
