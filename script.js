'use strict';
const L = ['A', 'B', 'C', 'D'];
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

let tests = load('tz_tests'), results = load('tz_results');
let draft = [], run = null, timer = null;

if (localStorage.getItem('tz_tests') === null) {
  tests = [{
    id: uid(), title: 'Namuna: Informatika asoslari', created: Date.now(),
    questions: [
      { q: 'Quyidagilardan qaysi biri kiritish qurilmasi?', o: ['Printer', 'Monitor', 'Skaner', 'Plotter'], a: 2 },
      { q: '"*.*" maskasi qaysi fayllarni bildiradi?', o: ['Faqat .txt fayllarni', 'Barcha fayllarni', 'Kengaytmasizlarni', 'Papkalarni'], a: 1 },
      { q: 'Faqat audio faylga tegishli kengaytma qaysi?', o: ['.mp4', '.jpg', '.avi', '.mp3'], a: 3 }
    ]
  }];
}
const save = () => {
  localStorage.setItem('tz_tests', JSON.stringify(tests));
  localStorage.setItem('tz_results', JSON.stringify(results));
};
save();

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('on'), 2200);
}

function show(v) {
  document.querySelectorAll('.view').forEach(e => e.hidden = e.id !== v);
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  if (v === 'take') { if (run) screen('runner'); else { renderPicker(); screen('picker'); } }
  if (v === 'mine') renderMine();
  if (v === 'done') { $('#detail').innerHTML = ''; renderDone(); }
  if (v === 'add') renderDraft();
}
const screen = n => ['picker', 'runner', 'result'].forEach(id => $('#' + id).hidden = id !== n);
document.querySelector('nav').addEventListener('click', e => { if (e.target.dataset.v) show(e.target.dataset.v); });

/* ---------- Test qo'shish ---------- */
function validQ(q) {
  return q && typeof q.q === 'string' && q.q.trim() && Array.isArray(q.o) && q.o.length === 4 &&
    q.o.every(x => String(x).trim()) && Number.isInteger(q.a) && q.a >= 0 && q.a < 4;
}

function addManual() {
  const q = $('#qText').value.trim(), o = [0, 1, 2, 3].map(i => $('#o' + i).value.trim());
  if (!q || o.some(x => !x)) return toast('Savol va 4 ta variantni to‘ldiring');
  draft.push({ q, o, a: +$('#qAns').value });
  $('#qText').value = ''; [0, 1, 2, 3].forEach(i => $('#o' + i).value = '');
  $('#qText').focus(); renderDraft();
}

function parseBulk(text) {
  const out = [], bad = [];
  text.replace(/\r/g, '').split(/\n\s*\n/).forEach((block, n) => {
    if (!block.trim()) return;
    let q = '', o = [], a = -1;
    block.split('\n').forEach(line => {
      line = line.trim();
      let m;
      if ((m = line.match(/^(?:javob|answer|kalit)\s*[:\-]\s*([A-D])/i))) a = L.indexOf(m[1].toUpperCase());
      else if ((m = line.match(/^([A-D])[\)\.]\s*(.+)/i))) o[L.indexOf(m[1].toUpperCase())] = m[2].trim();
      else if (line) q += (q ? ' ' : '') + line.replace(/^\d+[\.\)]\s*/, '');
    });
    const item = { q, o: [0, 1, 2, 3].map(i => o[i] || ''), a };
    validQ(item) ? out.push(item) : bad.push(n + 1);
  });
  return { out, bad };
}

function renderDraft() {
  $('#dCount').textContent = draft.length;
  $('#draftList').innerHTML = draft.length ? draft.map((q, i) => `
    <div class="item"><div><b>${i + 1}.</b> ${esc(q.q)}<div class="meta">To‘g‘ri javob: ${L[q.a]}) ${esc(q.o[q.a])}</div></div>
    <button class="danger" data-del="${i}">O‘chirish</button></div>`).join('')
    : '<p class="empty">Hali savol qo‘shilmagan.</p>';
}

$('#addQ').onclick = addManual;
$('#addBulk').onclick = () => {
  const { out, bad } = parseBulk($('#bulk').value);
  if (!out.length) return toast('Format xato: savollar topilmadi');
  draft.push(...out); $('#bulk').value = ''; renderDraft();
  toast(out.length + ' ta savol qo‘shildi' + (bad.length ? `, ${bad.join(', ')}-blok xato` : ''));
};
$('#draftList').onclick = e => {
  if (e.target.dataset.del !== undefined) { draft.splice(+e.target.dataset.del, 1); renderDraft(); }
};
$('#jsonIn').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      const list = (Array.isArray(data) ? data : [data]).filter(t => t && t.title && Array.isArray(t.questions) && t.questions.every(validQ));
      if (!list.length) throw 0;
      list.forEach(t => tests.push({ id: uid(), title: t.title, created: Date.now(), questions: t.questions }));
      save(); toast(list.length + ' ta test yuklandi');
    } catch { toast('JSON fayl formati noto‘g‘ri'); }
    e.target.value = '';
  };
  r.readAsText(f);
};
$('#saveTest').onclick = () => {
  const title = $('#tTitle').value.trim();
  if (!title) return toast('Test nomini kiriting');
  if (!draft.length) return toast('Kamida bitta savol qo‘shing');
  tests.push({ id: uid(), title, created: Date.now(), questions: draft });
  draft = []; $('#tTitle').value = ''; save(); renderDraft();
  toast('Test saqlandi'); show('mine');
};

/* ---------- Mening testlarim ---------- */
function renderMine() {
  $('#mineList').innerHTML = tests.length ? tests.map(t => `
    <div class="card item"><div><b>${esc(t.title)}</b>
      <div class="meta">${t.questions.length} ta savol · ${new Date(t.created).toLocaleDateString()}</div></div>
      <div class="row" style="margin:0">
        <button class="primary" data-start="${t.id}">Boshlash</button>
        <button data-exp="${t.id}">Yuklab olish</button>
        <button class="danger" data-rm="${t.id}">O‘chirish</button>
      </div></div>`).join('')
    : '<p class="empty">Hali test yo‘q. “Test qo‘shish” bo‘limidan yarating.</p>';
}
$('#mineList').onclick = e => {
  const d = e.target.dataset;
  if (d.start) startTest(d.start);
  if (d.exp) {
    const t = tests.find(x => x.id === d.exp);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ title: t.title, questions: t.questions }, null, 2)], { type: 'application/json' }));
    a.download = t.title.replace(/[^\w\-]+/g, '_') + '.json'; a.click(); URL.revokeObjectURL(a.href);
  }
  if (d.rm && confirm('Testni o‘chirasizmi?')) { tests = tests.filter(x => x.id !== d.rm); save(); renderMine(); }
};

/* ---------- Test ishlash ---------- */
function renderPicker() {
  $('#picker').innerHTML = tests.length ? `<h2>Testni tanlang</h2>
    ${tests.map((t, i) => `<label class="card pick"><input type="radio" name="pick" value="${t.id}" ${i === 0 ? 'checked' : ''}>
      <span><b>${esc(t.title)}</b><span class="meta"> — ${t.questions.length} ta savol</span></span></label>`).join('')}
    <button id="go" class="primary">Testni boshlash</button>`
    : '<p class="empty">Ishlash uchun test yo‘q. Avval test qo‘shing.</p>';
  const go = $('#go');
  if (go) go.onclick = () => startTest(document.querySelector('input[name=pick]:checked').value);
}

function startTest(id) {
  const test = tests.find(t => t.id === id); if (!test) return;
  clearInterval(timer);
  run = { test, i: 0, ans: [], t0: Date.now() };
  show('take'); renderRun();
  timer = setInterval(tick, 1000);
}
const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
function tick() { const t = $('#timer'); if (t && run) t.textContent = fmt(Math.floor((Date.now() - run.t0) / 1000)); }

function renderRun() {
  screen('runner');
  const { test, i, ans } = run, n = test.questions.length, q = test.questions[i];
  $('#runner').innerHTML = `
    <div class="bar"><b>${esc(test.title)}</b><span id="timer"></span></div>
    <div class="map">${test.questions.map((_, k) => `<button data-k="${k}" class="${k === i ? 'cur' : ''} ${ans[k] != null ? 'ans' : ''}">${k + 1}</button>`).join('')}</div>
    <div class="card"><h3>${i + 1}/${n}. ${esc(q.q)}</h3>
      ${q.o.map((t, k) => `<button class="opt ${ans[i] === k ? 'sel' : ''}" data-o="${k}"><span>${L[k]}</span>${esc(t)}</button>`).join('')}</div>
    <div class="row"><button data-nav="-1" ${i ? '' : 'disabled'}>← Oldingi</button>
      ${i < n - 1 ? '<button data-nav="1" class="primary">Keyingi →</button>' : ''}
      <button data-fin="1" class="primary">Yakunlash</button></div>`;
  tick();
}
$('#runner').onclick = e => {
  const b = e.target.closest('button'); if (!b || !run) return;
  const d = b.dataset;
  if (d.o !== undefined) { run.ans[run.i] = +d.o; renderRun(); }
  else if (d.k !== undefined) { run.i = +d.k; renderRun(); }
  else if (d.nav) { run.i += +d.nav; renderRun(); }
  else if (d.fin) finish();
};

function finish() {
  const { test, ans, t0 } = run;
  const left = test.questions.filter((_, k) => ans[k] == null).length;
  if (left && !confirm(`${left} ta savolga javob berilmagan. Yakunlaysizmi?`)) return;
  clearInterval(timer);
  const items = test.questions.map((q, k) => ({ q: q.q, o: q.o, a: q.a, c: ans[k] == null ? null : ans[k] }));
  const correct = items.filter(x => x.c === x.a).length;
  const res = {
    id: uid(), title: test.title, date: Date.now(), total: items.length, correct,
    percent: Math.round(correct / items.length * 100), seconds: Math.floor((Date.now() - t0) / 1000), items
  };
  results.unshift(res); run = null; save();
  $('#result').innerHTML = resultHTML(res) + `<div class="row"><button data-again="${test.id}" class="primary">Qayta ishlash</button><button data-v2="done">Yechilgan testlar</button></div>`;
  screen('result');
}
$('#result').onclick = e => {
  if (e.target.dataset.again) startTest(e.target.dataset.again);
  if (e.target.dataset.v2) show('done');
};

function resultHTML(r) {
  const wrong = r.items.map((x, k) => ({ ...x, n: k + 1 })).filter(x => x.c !== x.a);
  return `<div class="card"><h3>${esc(r.title)}</h3>
    <div class="score"><b>${r.correct}/${r.total}</b><em>${r.percent}%</em><span class="meta">Vaqt: ${fmt(r.seconds)}</span></div>
    <div class="prog"><i style="width:${r.percent}%"></i></div>
    <p class="meta">To‘g‘ri: ${r.correct} · Xato: ${wrong.length}</p></div>
    <h3>${wrong.length ? 'Xatolar tahlili' : 'Barcha javoblar to‘g‘ri!'}</h3>
    ${wrong.map(x => `<div class="card"><b>${x.n}.</b> ${esc(x.q)}
      <div class="line bad">Sizning javobingiz: ${x.c == null ? 'javob berilmagan' : L[x.c] + ') ' + esc(x.o[x.c])}</div>
      <div class="line ok">To‘g‘ri javob: ${L[x.a]}) ${esc(x.o[x.a])}</div></div>`).join('')}`;
}

/* ---------- Yechilgan testlar ---------- */
function renderDone() {
  $('#doneList').innerHTML = results.length ? results.map(r => `
    <div class="card item"><div><b>${esc(r.title)}</b>
      <div class="meta">${new Date(r.date).toLocaleString()} · ${fmt(r.seconds)}</div></div>
      <div class="row" style="margin:0"><b>${r.correct}/${r.total} · ${r.percent}%</b>
        <button data-view="${r.id}">Xatolarni ko‘rish</button>
        <button class="danger" data-del="${r.id}">O‘chirish</button></div></div>`).join('')
    + '<button id="clr" class="danger">Tarixni tozalash</button>'
    : '<p class="empty">Hali birorta test yechilmagan.</p>';
}
$('#doneList').onclick = e => {
  const d = e.target.dataset;
  if (d.view) { $('#detail').innerHTML = resultHTML(results.find(r => r.id === d.view)); $('#detail').scrollIntoView({ behavior: 'smooth' }); }
  if (d.del) { results = results.filter(r => r.id !== d.del); save(); $('#detail').innerHTML = ''; renderDone(); }
  if (e.target.id === 'clr' && confirm('Barcha natijalar o‘chiriladi. Davom etasizmi?')) { results = []; save(); $('#detail').innerHTML = ''; renderDone(); }
};

renderDraft();