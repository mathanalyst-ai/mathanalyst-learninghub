// SUPABASE CONNECTION
const MA_BUCKET = "html-exercises";

async function uploadHtmlExercise(file, metadata) {
  if (typeof supabaseClient === "undefined" || !supabaseClient) {
    throw new Error("Supabase client tidak tersedia.");
  }

  if (!file || !/\.html?$/i.test(file.name)) {
    throw new Error("Sila pilih fail HTML yang sah.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Saiz fail maksimum ialah 5 MB.");
  }

  if (
    !metadata.title ||
    !metadata.school_level ||
    !metadata.subject
  ) {
    throw new Error("Sila lengkapkan tajuk, tahap dan subjek.");
  }

  const { data: userData, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("Sila log masuk sebagai admin dahulu.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${Date.now()}_${safeName}`;

  const { data, error } = await supabaseClient.storage
    .from(MA_BUCKET)
    .upload(storagePath, file, {
      contentType: "text/html",
      upsert: false
    });

  if (error) throw error;

  const { data: record, error: dbError } = await supabaseClient
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
    await supabaseClient.storage
      .from(MA_BUCKET)
      .remove([data.path]);

    throw dbError;
  }

  return record;

}
const LEVELS = ["Prasekolah 4 tahun","Prasekolah 5 tahun","Prasekolah 6 tahun","Tahun 1","Tahun 2","Tahun 3","Tahun 4","Tahun 5","Tahun 6","Form 1","Form 2","Form 3","Form 4","Form 5"];
const SUBJECTS = {
  "Prasekolah 4 tahun":["Matematik","Sains","Bahasa Melayu","Bahasa Inggeris"],
  "Prasekolah 5 tahun":["Matematik","Sains","Bahasa Melayu","Bahasa Inggeris"],
  "Prasekolah 6 tahun":["Matematik","Sains","Bahasa Melayu","Bahasa Inggeris"],
  "Tahun 1":["Matematik","Sains","Bahasa Melayu","Bahasa Inggeris"],
  "Tahun 2":["Matematik","Sains","Bahasa Melayu","Bahasa Inggeris"],
  "Tahun 3":["Matematik","Sains","Bahasa Melayu","Bahasa Inggeris"],
  "Tahun 4":["Matematik","Sains","Bahasa Melayu","Bahasa Inggeris"],
  "Tahun 5":["Matematik","Sains","Bahasa Melayu","Bahasa Inggeris"],
  "Tahun 6":["Matematik","Sains","Bahasa Melayu","Bahasa Inggeris"],
  "Form 1":["Matematik","Sains"],"Form 2":["Matematik","Sains"],"Form 3":["Matematik","Sains"],
  "Form 4":["Matematik","Additional Mathematics"],"Form 5":["Matematik","Additional Mathematics"]
};
const TOPICS = ["Nombor dan Operasi","Algebra","Geometri","Pecahan dan Perpuluhan","Pengukuran","Data dan Kebarangkalian","Fungsi dan Graf","Trigonometri"];
const sampleQuestions = [
 {level:"Tahun 4",subject:"Matematik",topic:"Nombor dan Operasi",q:"Berapakah nilai 245 + 137?",options:["372","382","392","402"],answer:1,explanation:"245 + 137 = 382."},
 {level:"Tahun 4",subject:"Matematik",topic:"Algebra",q:"Jika x + 8 = 15, apakah nilai x?",options:["5","6","7","8"],answer:2,explanation:"Tolak 8 pada kedua-dua belah: x = 15 − 8 = 7."},
 {level:"Tahun 4",subject:"Matematik",topic:"Geometri",q:"Berapakah jumlah sudut dalam sebuah segi tiga?",options:["90°","180°","270°","360°"],answer:1,explanation:"Jumlah sudut pedalaman segi tiga ialah 180°."},
 {level:"Form 1",subject:"Matematik",topic:"Algebra",q:"Permudahkan 3x + 2x − 4.",options:["5x − 4","6x − 4","5x + 4","x − 4"],answer:0,explanation:"Gabungkan sebutan serupa: 3x + 2x = 5x."},
 {level:"Form 2",subject:"Matematik",topic:"Geometri",q:"Sebuah sudut pada garis lurus ialah 125°. Cari sudut bersebelahan.",options:["45°","55°","65°","75°"],answer:1,explanation:"Sudut pada garis lurus berjumlah 180°. 180° − 125° = 55°."},
 {level:"Form 3",subject:"Matematik",topic:"Algebra",q:"Selesaikan 2x − 7 = 9.",options:["6","7","8","9"],answer:2,explanation:"2x = 16, maka x = 8."},
 {level:"Form 4",subject:"Additional Mathematics",topic:"Fungsi dan Graf",q:"Jika f(x) = 2x + 3, cari f(4).",options:["8","9","10","11"],answer:3,explanation:"f(4) = 2(4) + 3 = 11."},
 {level:"Form 5",subject:"Matematik",topic:"Trigonometri",q:"Nilai sin 30° ialah…",options:["0","1/2","√2/2","1"],answer:1,explanation:"Sudut istimewa: sin 30° = 1/2."},
 {level:"Tahun 5",subject:"Sains",topic:"Nombor dan Operasi",q:"Antara berikut, yang manakah sumber tenaga boleh baharu?",options:["Arang batu","Petroleum","Tenaga suria","Gas asli"],answer:2,explanation:"Tenaga suria diperoleh daripada cahaya matahari dan boleh diperbaharui."},
 {level:"Tahun 4",subject:"Bahasa Melayu",topic:"Nombor dan Operasi",q:"Pilih kata nama am.",options:["Ali","Malaysia","sekolah","Isnin"],answer:2,explanation:"'Sekolah' ialah kata nama am."}
];
const defaultBooks = [
 {title:"Kuasai Algebra Berajah",desc:"Latihan algebra berajah untuk membina kefahaman konsep.",price:"RM16.90",label:"ALGEBRA"},
 {title:"Mini Modul Algebra",desc:"Modul ringkas bersaiz A5 untuk latihan kendiri.",price:"—",label:"MINI MODUL"},
 {title:"Mini Modul Geometri",desc:"Koleksi latihan geometri dan kemahiran penyelesaian masalah.",price:"—",label:"GEOMETRI"},
 {title:"Mind Booster Mathematics",desc:"Latihan Matematik dwibahasa untuk Tahap 2.",price:"—",label:"MIND BOOSTER"}
];
let questions = JSON.parse(localStorage.getItem("ma_questions") || "null") || sampleQuestions.slice();
let history = JSON.parse(localStorage.getItem("ma_history") || "[]");
let quizSet=[], quizIndex=0, quizAnswers=[], quizStarted=0, quizInterval=null;
let examSet=[], examIndex=0, examAnswers=[], examStarted=0, examInterval=null, examSeconds=1800, examMode="practice";

const $ = id => document.getElementById(id);
function save(){localStorage.setItem("ma_questions",JSON.stringify(questions));localStorage.setItem("ma_history",JSON.stringify(history));}
// MATH ANALYST: SIMPAN LAPORAN KE SUPABASE
async function saveAttemptToCloud(record) {
  const client = window.supabaseClient ||
    (typeof supabaseClient !== "undefined" ? supabaseClient : null);

  if (!client) {
    console.error("Supabase client tidak tersedia.");
    return false;
  }

  try {
    let { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;

    if (!session) {
      const result = await client.auth.signInAnonymously();
      if (result.error) throw result.error;
      session = result.data.session;
    }

    if (!session?.user?.id) {
      throw new Error("Identiti pelajar tidak tersedia.");
    }

    const { error: saveError } = await client
      .from("exercise_attempts")
      .insert({
        exercise_id: null,
        student_id: session.user.id,
        score: record.correct,
        max_score: record.total,
        answers: record
      });

    if (saveError) throw saveError;

    console.log("Laporan berjaya disimpan.");
    return true;

  } catch (error) {
    console.error("Gagal menyimpan laporan:", error.message);
    return false;
  }
}
function fillSelect(el,values){el.innerHTML=values.map(v=>`<option>${v}</option>`).join("");}
function initSelects(){
 fillSelect($("quizLevel"),LEVELS);fillSelect($("adminLevel"),LEVELS);
 updateSubjects($("quizLevel").value,$("quizSubject"));updateSubjects($("adminLevel").value,$("adminSubject"));
 fillSelect($("quizTopic"),TOPICS);
 $("quizLevel").addEventListener("change",()=>updateSubjects($("quizLevel").value,$("quizSubject")));
 $("adminLevel").addEventListener("change",()=>updateSubjects($("adminLevel").value,$("adminSubject")));
}
function updateSubjects(level,el){fillSelect(el,SUBJECTS[level]||["Matematik"]);}
function navigate(page){
 document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
 $("page-"+page).classList.add("active");
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 const names={home:"Dashboard",books:"Kedai Buku",quiz:"Kuiz Interaktif",exam:"Exam Simulator",classes:"Kelas Online",learning:"Pembelajaran Saya",admin:"Admin Demo"};
 $("pageTitle").textContent=names[page]||"Math Analyst";
 $("mainNav").parentElement.classList.remove("open");
 if(page==="learning")renderHistory();if(page==="admin")renderAdminQuestions();if(page==="home")renderStats();
 window.scrollTo(0,0);
}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
$("mobileMenu").addEventListener("click",()=>$("mainNav").parentElement.classList.toggle("open"));
function renderBooks(){
 $("bookGrid").innerHTML=defaultBooks.map((b,i)=>`<article class="book-card"><div class="book-cover"><span>${b.label}<br><small style="font:500 9px 'DM Sans';letter-spacing:2px">MATH ANALYST</small></span></div><div class="book-info"><h3>${b.title}</h3><p>${b.desc}</p><div class="price">${b.price}</div><button class="btn btn-primary book-enquire" data-book="${i}">Tanya / Beli</button></div></article>`).join("");
 document.querySelectorAll(".book-enquire").forEach(b=>b.addEventListener("click",()=>alert("Pautan Shopee dan WhatsApp akan dimasukkan selepas maklumat produk diberikan.")));
}
function getFiltered(level,subject,topic){return questions.filter(q=>(!level||q.level===level)&&(!subject||q.subject===subject)&&(!topic||q.topic===topic));}
function startQuiz(){
 const level=$("quizLevel").value,subject=$("quizSubject").value,topic=$("quizTopic").value;
 let pool=getFiltered(level,subject,topic);
 if(!pool.length)pool=questions.filter(q=>q.level===level&&q.subject===subject);
 if(!pool.length){alert("Belum ada soalan untuk pilihan ini. Admin boleh tambah soalan melalui Admin Demo.");return;}
 quizSet=pool.slice(0,Number($("quizCount").value));quizIndex=0;quizAnswers=Array(quizSet.length).fill(null);quizStarted=Date.now();
 $("quizSetup").classList.add("hidden");$("quizResult").classList.add("hidden");$("quizStage").classList.remove("hidden");
 clearInterval(quizInterval);quizInterval=setInterval(()=>{let s=Math.floor((Date.now()-quizStarted)/1000);$("quizTimer").textContent=`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;},1000);
 renderQuizQuestion();
}
function renderQuizQuestion(){
 const q=quizSet[quizIndex];$("quizCounter").textContent=`Soalan ${quizIndex+1} / ${quizSet.length}`;$("quizProgressBar").style.width=`${(quizIndex+1)/quizSet.length*100}%`;
 $("questionArea").innerHTML=`<div class="question-meta">${q.level} · ${q.subject} · ${q.topic}</div><div class="question-title">${q.q}</div><div>${q.options.map((o,i)=>`<div class="answer-option ${quizAnswers[quizIndex]===i?"selected":""}" data-answer="${i}"><span class="option-letter">${"ABCD"[i]}</span>${o}</div>`).join("")}</div>`;
 document.querySelectorAll("#questionArea .answer-option").forEach(el=>el.addEventListener("click",()=>{quizAnswers[quizIndex]=Number(el.dataset.answer);renderQuizQuestion();}));
 $("nextQuestion").textContent=quizIndex===quizSet.length-1?"Hantar jawapan ✓":"Seterusnya →";
}
$("startQuiz").addEventListener("click",startQuiz);
$("nextQuestion").addEventListener("click",()=>{if(quizAnswers[quizIndex]===null){alert("Sila pilih satu jawapan dahulu.");return;}if(quizIndex<quizSet.length-1){quizIndex++;renderQuizQuestion();}else finishQuiz();});
$("quitQuiz").addEventListener("click",()=>{clearInterval(quizInterval);$("quizStage").classList.add("hidden");$("quizSetup").classList.remove("hidden");});
function finishQuiz(){
  clearInterval(quizInterval);

  let correct = quizSet.filter(
    (q,i) => quizAnswers[i] === q.answer
  ).length;

  let pct = Math.round(correct / quizSet.length * 100);
  let elapsed = Math.round((Date.now()-quizStarted)/1000);

  const topicStats = {};

  quizSet.forEach((q,i) => {
    topicStats[q.topic] ??= {c:0,t:0};
    topicStats[q.topic].t++;

    if (quizAnswers[i] === q.answer) {
      topicStats[q.topic].c++;
    }
  });

  const attempt = {
    type: "Kuiz",
    level: $("quizLevel").value,
    subject: $("quizSubject").value,
    topic: $("quizTopic").value,
    score: pct,
    correct: correct,
    total: quizSet.length,
    elapsed: elapsed,
    answers: quizSet.map((q,i) => ({
      question: q.q,
      topic: q.topic,
      selected: quizAnswers[i],
      correct_answer: q.answer,
      is_correct: quizAnswers[i] === q.answer
    }))
  };

  history.unshift({
    type:"Kuiz",
    date:new Date().toLocaleString("ms-MY"),
    score:pct,
    correct,
    total:quizSet.length,
    elapsed
  });

  save();

  $("quizStage").classList.add("hidden");
  $("quizResult").classList.remove("hidden");

  $("quizResult").innerHTML = `
    <span class="eyebrow">LAPORAN PRESTASI INDIVIDU</span>
    <h2>Kuiz selesai!</h2>
    <div class="result-score">${pct}%</div>
    <div class="result-summary">
      <div><b>${correct}/${quizSet.length}</b><span>Jawapan betul</span></div>
      <div><b>${Math.floor(elapsed/60)}m ${elapsed%60}s</b><span>Masa digunakan</span></div>
    </div>
    <h3>Analisis mengikut topik</h3>
    ${Object.entries(topicStats).map(([t,v]) => `
      <div class="feedback">
        <b>${t}</b> — ${v.c}/${v.t} betul
        (${Math.round(v.c/v.t*100)}%)
      </div>
    `).join("")}
    <div id="cloudSaveStatus" class="feedback">
      Sedang menyimpan laporan...
    </div>
    <button class="btn btn-primary" id="retryQuiz">Cuba lagi</button>
  `;

  $("retryQuiz").addEventListener("click",()=>{
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
function startExam(){
 const level=$("examLevel").value,subject=$("examSubject").value;
 let pool=questions.filter(q=>q.level===level&&q.subject===subject);
 if(!pool.length){alert("Belum ada set contoh untuk kombinasi ini. Tambah soalan melalui Admin Demo.");return;}
 examSet=pool.slice(0,Number($("examCount").value));examAnswers=Array(examSet.length).fill(null);examIndex=0;examMode=$("examMode").value;examSeconds=examMode==="exam"?1800:0;examStarted=Date.now();
 $("examSetup").classList.add("hidden");$("examResult").classList.add("hidden");$("examStage").classList.remove("hidden");
 clearInterval(examInterval);if(examMode==="exam")examInterval=setInterval(()=>{examSeconds--;updateExamTimer();if(examSeconds<=0)finishExam();},1000);else $("examTimer").textContent="Tanpa had masa";
 renderExamQuestion();
}
function updateExamTimer(){$("examTimer").textContent=`${String(Math.floor(examSeconds/60)).padStart(2,"0")}:${String(examSeconds%60).padStart(2,"0")}`;}
function renderExamQuestion(){
 let q=examSet[examIndex];$("examCounter").textContent=`Soalan ${examIndex+1} / ${examSet.length}`;$("examProgressBar").style.width=`${(examIndex+1)/examSet.length*100}%`;
 $("examQuestion").innerHTML=`<div class="question-meta">KERTAS LATIHAN · ${$("examLevel").value} · ${$("examSubject").value}</div><div class="question-title">${q.q}</div>${q.options.map((o,i)=>`<div class="answer-option ${examAnswers[examIndex]===i?"selected":""}" data-answer="${i}"><span class="option-letter">${"ABCD"[i]}</span>${o}</div>`).join("")}`;
 document.querySelectorAll("#examQuestion .answer-option").forEach(el=>el.addEventListener("click",()=>{examAnswers[examIndex]=Number(el.dataset.answer);renderExamQuestion();}));
 $("examPrev").disabled=examIndex===0;$("examNext").textContent=examIndex===examSet.length-1?"Hantar kertas ✓":"Seterusnya →";
}
$("startExam").addEventListener("click",startExam);
$("examPrev").addEventListener("click",()=>{if(examIndex>0){examIndex--;renderExamQuestion();}});
$("examNext").addEventListener("click",()=>{if(examIndex<examSet.length-1){examIndex++;renderExamQuestion();}else finishExam();});
function finishExam(){
  clearInterval(examInterval);

  let correct = examSet.filter(
    (q,i) => examAnswers[i] === q.answer
  ).length;

  let pct = Math.round(correct / examSet.length * 100);
  let elapsed = Math.round((Date.now()-examStarted)/1000);

  const attempt = {
    type: "Exam Simulator",
    level: $("examLevel").value,
    subject: $("examSubject").value,
    mode: examMode,
    score: pct,
    correct: correct,
    total: examSet.length,
    elapsed: elapsed,
    answers: examSet.map((q,i) => ({
      question: q.q,
      topic: q.topic,
      selected: examAnswers[i],
      correct_answer: q.answer,
      is_correct: examAnswers[i] === q.answer
    }))
  };

  history.unshift({
    type:"Exam Simulator",
    date:new Date().toLocaleString("ms-MY"),
    score:pct,
    correct,
    total:examSet.length,
    elapsed
  });

  save();

  $("examStage").classList.add("hidden");
  $("examResult").classList.remove("hidden");

  $("examResult").innerHTML = `
    <span class="eyebrow">KEPUTUSAN SIMULASI</span>
    <h2>Peperiksaan selesai</h2>
    <div class="result-score">${pct}%</div>
    <div class="result-summary">
      <div><b>${correct}/${examSet.length}</b><span>Jawapan betul</span></div>
      <div><b>${examSet.length-correct}</b><span>Jawapan salah / kosong</span></div>
    </div>
    <h3>Semakan jawapan</h3>
    ${examSet.map((q,i) => `
      <div class="feedback">
        <b>Soalan ${i+1}: ${quizLetter(q.answer)}</b>
        — ${q.explanation || "Tiada penerangan disediakan."}
        <br>Jawapan anda:
        ${examAnswers[i]===null ? "Tidak dijawab" : quizLetter(examAnswers[i])}
      </div>
    `).join("")}
    <div id="cloudSaveStatus" class="feedback">
      Sedang menyimpan laporan...
    </div>
    <button class="btn btn-primary" id="examAgain">
      Kembali ke tetapan
    </button>
  `;

  $("examAgain").addEventListener("click",()=>{
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
function quizLetter(i){return "ABCD"[i];}
$("questionForm").addEventListener("submit",e=>{
 e.preventDefault();questions.push({level:$("adminLevel").value,subject:$("adminSubject").value,topic:$("adminTopic").value.trim(),q:$("adminQuestion").value.trim(),options:[$("optA").value,$("optB").value,$("optC").value,$("optD").value],answer:Number($("adminCorrect").value),explanation:$("adminExplanation").value.trim()});
 save();e.target.reset();renderAdminQuestions();alert("Soalan disimpan dalam browser ini.");
});
function renderAdminQuestions(){
 $("adminQuestionList").innerHTML=questions.map((q,i)=>`<div class="admin-question"><button data-delete="${i}">Padam</button><b>${q.level} · ${q.subject}</b><br>${q.q}</div>`).join("")||'<div class="empty-state">Tiada soalan.</div>';
 document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>{if(confirm("Padam soalan ini?")){questions.splice(Number(b.dataset.delete),1);save();renderAdminQuestions();}}));
}
function renderHistory(){
 $("historyList").innerHTML=history.length?history.map(h=>`<div class="history-item"><div><b>${h.type}</b><span class="muted">${h.date} · ${h.correct}/${h.total} betul</span></div><div class="history-score">${h.score}%</div></div>`).join(""):'<div class="empty-state">Belum ada rekod. Selesaikan kuiz untuk melihat laporan di sini.</div>';
}
function renderStats(){
 $("statQuizzes").textContent=history.filter(h=>h.type==="Kuiz").length;$("statExams").textContent=history.filter(h=>h.type==="Exam Simulator").length;
 $("statAverage").textContent=history.length?Math.round(history.reduce((a,h)=>a+h.score,0)/history.length)+"%":"—";
}
$("clearHistory").addEventListener("click",()=>{if(confirm("Kosongkan semua rekod latihan demo?")){history=[];save();renderHistory();renderStats();}});
$("classEnquire").addEventListener("click",()=>alert("Masukkan nombor WhatsApp dan pautan pendaftaran kelas apabila kandungan sebenar disediakan."));

// V5: Local HTML exercise preview. Files are not uploaded or published.
(function initHtmlPracticePreview(){
 const input=document.getElementById("htmlPracticeUpload");
 const load=document.getElementById("htmlPracticeLoad");
 const clear=document.getElementById("htmlPracticeClear");
 const frame=document.getElementById("htmlPracticeFrame");
 const wrap=document.getElementById("htmlPracticeFrameWrap");
 const status=document.getElementById("htmlPracticeStatus");
 const fileName=document.getElementById("htmlPracticeFileName");
if(!input||!load||!clear||!frame||!wrap||!status) {
  console.error("Elemen pratonton HTML tidak lengkap.");
} let currentUrl=null;
  const saveButton = document.getElementById("htmlPracticeSave");
 const titleInput = document.getElementById("htmlPracticeTitle");
 const levelInput = document.getElementById("htmlPracticeLevel");
 const subjectInput = document.getElementById("htmlPracticeSubject");
 const topicInput = document.getElementById("htmlPracticeTopic");

 if (saveButton) {
   saveButton.addEventListener("click", async () => {
     const file = input.files && input.files[0];

     if (!file) {
       status.textContent = "Sila pilih fail HTML dahulu.";
       return;
     }

     if (!titleInput.value.trim() ||
         !levelInput.value ||
         !subjectInput.value.trim()) {
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
 load.addEventListener("click",()=>{
   const file=input.files && input.files[0];
   if(!file){status.textContent="Sila pilih fail HTML dahulu.";return;}
   if(!/\.html?$/i.test(file.name) && file.type!=="text/html"){status.textContent="Fail tidak sah. Pilih fail .html.";return;}
   if(file.size>5*1024*1024){status.textContent="Saiz fail melebihi 5 MB. Sila pilih fail lebih kecil.";return;}
   if(currentUrl) URL.revokeObjectURL(currentUrl);
   currentUrl=URL.createObjectURL(file);
   frame.src=currentUrl;
   fileName.textContent=file.name;
   wrap.classList.remove("hidden");
   status.textContent="Pratonton dibuka. Fail ini hanya berada pada sesi browser ini.";
 });
 clear.addEventListener("click",()=>{
   if(currentUrl) URL.revokeObjectURL(currentUrl);
   currentUrl=null;frame.removeAttribute("src");input.value="";
   wrap.classList.add("hidden");status.textContent="Pratonton dikosongkan.";
 });
})();
initSelects();renderBooks();renderStats();
