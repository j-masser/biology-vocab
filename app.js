import { UNITS, TERMS, NOTES } from "./data.js";
import { loadFirebase, configured, isSchoolEmail, isTeacherEmail, SCHOOL_DOMAIN, GOOGLE_ICON } from "./fb.js";

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const panel = $("#panel"), gate = $("#gate");
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const unitName = id => (UNITS.find(u => u.id === id) || {}).name;
const firstName = n => (n || "").trim().split(/\s+/)[0] || "there";
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- state ---------- */
let fb = null, uref = null, profile = null;
let known = new Set();
let unit = store.get("lv-unit", "all");
let mode = "cards";
const pool = () => unit === "all" ? TERMS : TERMS.filter(x => x.u === unit);

/* ---------- gate screens ---------- */
function showGate(html) { gate.innerHTML = html; gate.hidden = false; $("#app").hidden = true; $("#progText").textContent = ""; $("#progBar").style.width = "0"; }
function showApp() { gate.hidden = true; $("#app").hidden = false; }

function showSignIn(message) {
  showGate(`
    <h2>Sign in to save your progress</h2>
    <p>Use your <b>@${esc(SCHOOL_DOMAIN)}</b> school Google account. Your flashcards, quiz answers and progress are saved so you can pick up where you left off.</p>
    ${message ? `<div class="notice">${esc(message)}</div>` : ""}
    <button class="gbtn" id="signin">${GOOGLE_ICON} Sign in with Google</button>`);
  $("#signin").onclick = signIn;
}

function showPeriodPicker(user, picked, error) {
  const teacher = isTeacherEmail(user.email);
  showGate(`
    <h2>Welcome, ${esc(firstName(user.displayName))}!</h2>
    <p>Which class period are you in?</p>
    <div class="periods">${[1, 2, 3, 4, 5, 6, 7].map(p => `<button class="period${picked === p ? " sel" : ""}" data-p="${p}" aria-pressed="${picked === p}">Period ${p}</button>`).join("")}</div>
    ${picked ? `<div class="row" style="margin-top:18px"><button class="btn primary" id="savePeriod">Save Period ${picked}</button>
      <span class="muted small">Double-check it. Only your teacher can change it later.</span></div>` : ""}
    ${error ? `<div class="notice">${esc(error)}</div>` : ""}
    ${teacher ? `<p class="small" style="margin-top:18px">You're signed in as a teacher. <a href="dashboard.html">Open the teacher dashboard</a></p>` : ""}
    <p class="small muted" style="margin-top:18px">Not you? <button class="btn small" id="switch">Use a different account</button></p>`);
  gate.querySelectorAll(".period").forEach(b => b.onclick = () => showPeriodPicker(user, +b.dataset.p));
  $("#switch").onclick = () => fb.A.signOut(fb.auth);
  const save = $("#savePeriod");
  if (save) save.onclick = async () => {
    save.disabled = true; save.textContent = "Saving…";
    const F = fb.F;
    const data = {
      uid: user.uid, name: user.displayName || user.email, email: user.email, period: picked,
      createdAt: F.serverTimestamp(), lastActive: F.serverTimestamp(),
      known: [], stats: {}, units: {}, counts: {}
    };
    try { await F.setDoc(uref, data); start(user, { ...data }); }
    catch (e) { console.error(e); showPeriodPicker(user, picked, "Your period didn't save. Check your internet connection and try again."); }
  };
}

function renderWho(user) {
  const who = $("#who");
  if (!user || !profile) { who.innerHTML = ""; return; }
  who.innerHTML = `<span><b>${esc(profile.name)}</b> · Period ${profile.period}</span>
    ${isTeacherEmail(user.email) ? `<a class="linkbtn" href="dashboard.html">Teacher dashboard</a>` : ""}
    <button class="linkbtn" id="signout">Sign out</button>
    <span class="savestate" id="savestate"></span>`;
  $("#signout").onclick = () => fb.A.signOut(fb.auth);
}
function setSaveState(text, isErr) { const el = $("#savestate"); if (el) { el.textContent = text; el.classList.toggle("err", !!isErr); } }

/* ---------- auth ---------- */
async function boot() {
  if (!configured()) {
    showGate(`<h2>Almost ready</h2><p>This site isn't connected to Firebase yet. Teachers: follow step 6 in SETUP.md to paste your Firebase config into <code>firebase-config.js</code>.</p>`);
    return;
  }
  try { fb = await loadFirebase(); }
  catch (e) { console.error(e); showGate(`<h2>Can't reach the server</h2><p>Check your internet connection, then reload the page.</p>`); return; }
  fb.A.onAuthStateChanged(fb.auth, onUser);
}

async function signIn() {
  const provider = new fb.A.GoogleAuthProvider();
  provider.setCustomParameters({ hd: SCHOOL_DOMAIN, prompt: "select_account" });
  try { await fb.A.signInWithPopup(fb.auth, provider); }
  catch (e) {
    if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return;
    if (e.code === "auth/popup-blocked") return showSignIn("Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.");
    console.error(e); showSignIn("Sign-in didn't work. Try again, or ask your teacher for help.");
  }
}

async function onUser(user) {
  profile = null; renderWho(null);
  if (!user) return showSignIn();
  if (!isSchoolEmail(user.email)) {
    await fb.A.signOut(fb.auth);
    return showSignIn(`You signed in as ${user.email}. Please use your @${SCHOOL_DOMAIN} school account.`);
  }
  uref = fb.F.doc(fb.db, "users", user.uid);
  showGate(`<p class="muted">Loading your progress…</p>`);
  try {
    const snap = await fb.F.getDoc(uref);
    if (snap.exists()) start(user, snap.data());
    else showPeriodPicker(user);
  } catch (e) {
    console.error(e);
    showGate(`<h2>Couldn't load your progress</h2><p>Reload the page. If it keeps happening, tell your teacher.</p>`);
  }
}

function start(user, data) {
  profile = { uid: user.uid, name: data.name || user.displayName || user.email, email: user.email, period: data.period };
  known = new Set(data.known || []);
  renderWho(user);
  renderUnits(); updateProgress(); showApp(); readHash();
  fb.F.updateDoc(uref, { lastActive: fb.F.serverTimestamp() }).catch(() => {});
}

/* ---------- saving answers ---------- */
let chain = Promise.resolve();
let pending = 0;
function queue(fn) {
  pending++; setSaveState("Saving…");
  chain = chain.then(fn).then(() => { pending--; if (!pending) setSaveState("All progress saved"); })
    .catch(e => { pending--; console.error(e); setSaveState("Not saved. Check your connection.", true); });
}
// ev: {mode, termId?, unit?, correct, scored, detail?}
function record(ev) {
  if (!profile) return;
  const F = fb.F;
  const upd = { lastActive: F.serverTimestamp(), [`counts.${ev.mode}`]: F.increment(1) };
  if (ev.scored) {
    if (ev.termId) { upd[`stats.${ev.termId}.a`] = F.increment(1); if (ev.correct) upd[`stats.${ev.termId}.c`] = F.increment(1); }
    if (ev.unit) { upd[`units.${ev.unit}.a`] = F.increment(1); if (ev.correct) upd[`units.${ev.unit}.c`] = F.increment(1); }
  }
  const resp = {
    uid: profile.uid, period: profile.period, mode: ev.mode,
    termId: ev.termId || null, unit: ev.unit || null,
    correct: typeof ev.correct === "boolean" ? ev.correct : null,
    detail: ev.detail || null, ts: F.serverTimestamp()
  };
  queue(() => Promise.all([F.updateDoc(uref, upd), F.addDoc(F.collection(fb.db, "responses"), resp)]));
}
function setKnown(term, on) {
  if (on) known.add(term.id); else known.delete(term.id);
  updateProgress();
  const F = fb.F;
  queue(() => F.updateDoc(uref, { known: on ? F.arrayUnion(term.id) : F.arrayRemove(term.id), lastActive: F.serverTimestamp() }));
  record({ mode: "cards", termId: term.id, unit: term.u, correct: on, scored: false, detail: { selfReport: on ? "got_it" : "still_learning" } });
}

/* ---------- shell ---------- */
function updateProgress() {
  const p = pool(), k = p.filter(x => known.has(x.id)).length;
  $("#progText").textContent = `${k} of ${p.length} terms marked “Got it”`;
  $("#progBar").style.width = (p.length ? k / p.length * 100 : 0) + "%";
}
function renderUnits() {
  const all = [{ id: "all", name: "All topics" }, ...UNITS];
  $("#units").innerHTML = all.map(u => `<button class="chip" data-unit="${u.id}" aria-pressed="${u.id === unit}">${u.name}</button>`).join("");
}
$("#units").addEventListener("click", e => {
  const b = e.target.closest("[data-unit]"); if (!b) return;
  unit = b.dataset.unit; store.set("lv-unit", unit); renderUnits(); updateProgress(); render();
});
document.querySelector("nav.modes").addEventListener("click", e => {
  const b = e.target.closest("[data-mode]"); if (b) location.hash = b.dataset.mode;
});
function readHash() {
  const h = location.hash.slice(1);
  mode = ["cards", "quiz", "match", "fill", "list"].includes(h) ? h : "cards";
  document.querySelectorAll("nav.modes button").forEach(b => b.setAttribute("aria-selected", b.dataset.mode === mode));
  render();
}
window.addEventListener("hashchange", () => { if (profile) readHash(); });
function render() { ({ cards: Cards, quiz: Quiz, match: Match, fill: Fill, list: List })[mode](); }

/* ---------- Flashcards ---------- */
let deck = [], di = 0;
const cardsOpts = { front: "term", hideKnown: false };
function Cards() {
  let p = pool(); if (cardsOpts.hideKnown) p = p.filter(x => !known.has(x.id));
  deck = shuffle(p); di = 0; drawCard();
}
function drawCard() {
  if (!deck.length) {
    panel.innerHTML = `<h2 style="font-family:var(--display)">Every card here is marked “Got it.”</h2>
      <p class="muted">Turn off “Skip terms I know” to review them again, or test yourself with the Quiz.</p>
      <div class="row"><button class="btn primary" id="showAll">Show all cards</button><a class="btn" href="#quiz">Take the quiz</a></div>`;
    $("#showAll").onclick = () => { cardsOpts.hideKnown = false; Cards(); }; return;
  }
  const x = deck[di], frontTerm = cardsOpts.front === "term";
  const exHTML = x.ex ? `<div class="ex">e.g. ${esc(x.ex)}</div>` : "";
  const termHTML = `<div class="term">${esc(x.t)}</div>`;
  panel.innerHTML = `
    <div class="row spread small">
      <span class="muted" style="font-variant-numeric:tabular-nums">Card ${di + 1} of ${deck.length}</span>
      <div class="row">
        <button class="btn small" id="swap">Show ${frontTerm ? "definition" : "term"} first</button>
        <button class="btn small" id="hk" aria-pressed="${cardsOpts.hideKnown}">${cardsOpts.hideKnown ? "✓ " : ""}Skip terms I know</button>
      </div>
    </div>
    <div class="cardzone"><div class="card" id="card" tabindex="0" role="button" aria-label="Flip card">
      <div class="face front"><span class="tag">${unitName(x.u)}</span>${frontTerm ? termHTML : `<div class="def">${esc(x.d)}</div>`}<span class="hint">Tap or press Space to flip</span></div>
      <div class="face back">${frontTerm ? `<div class="def">${esc(x.d)}</div>${exHTML}` : termHTML + exHTML}</div>
    </div></div>
    <div class="row spread">
      <button class="btn" id="prev" ${di === 0 ? "disabled" : ""}>← Back</button>
      <div class="row">
        <button class="btn bad" id="learn">Still learning</button>
        <button class="btn good" id="got">${known.has(x.id) ? "✓ Got it" : "Got it"}</button>
      </div>
      <button class="btn" id="next">Next →</button>
    </div>`;
  const card = $("#card"), flip = () => card.classList.toggle("flipped");
  card.onclick = flip; card.onkeydown = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } };
  $("#prev").onclick = () => { di--; drawCard(); };
  $("#next").onclick = nextCard;
  $("#got").onclick = () => { setKnown(x, true); nextCard(); };
  $("#learn").onclick = () => { setKnown(x, false); deck.push(x); nextCard(); };
  $("#swap").onclick = () => { cardsOpts.front = frontTerm ? "def" : "term"; drawCard(); };
  $("#hk").onclick = () => { cardsOpts.hideKnown = !cardsOpts.hideKnown; Cards(); };
  card.focus({ preventScroll: true });
}
function nextCard() { if (di < deck.length - 1) di++; else { deck = shuffle(deck); di = 0; } drawCard(); }

/* ---------- Quiz ---------- */
let quiz;
function Quiz() {
  const p = pool(), n = Math.min(10, p.length);
  quiz = {
    qs: shuffle(p).slice(0, n).map(x => {
      const same = TERMS.filter(o => o.id !== x.id && o.u === x.u), other = TERMS.filter(o => o.id !== x.id && o.u !== x.u);
      return { x, dir: Math.random() < .5 ? "def" : "term", opts: shuffle([x, ...[...shuffle(same), ...shuffle(other)].slice(0, 3)]) };
    }), i: 0, right: 0, missed: []
  };
  drawQ();
}
function drawQ() {
  const { qs, i } = quiz;
  if (i >= qs.length) {
    const pct = Math.round(quiz.right / qs.length * 100);
    panel.innerHTML = `<div class="row" style="gap:20px;align-items:end"><div class="score">${quiz.right}/${qs.length}</div><div class="muted">${pct >= 90 ? "Excellent work!" : pct >= 70 ? "Good job. Review the ones you missed." : "Keep practicing. Try the flashcards for these terms."}</div></div>
      ${quiz.missed.length ? `<h3 style="font-family:var(--display);margin-top:22px">Review these</h3><ul class="missed">${quiz.missed.map(x => `<li><b>${esc(x.t)}</b>: ${esc(x.d)}</li>`).join("")}</ul>` : ""}
      <div class="row" style="margin-top:16px"><button class="btn primary" id="again">New quiz</button><a class="btn" href="#cards">Flashcards</a></div>`;
    $("#again").onclick = Quiz; return;
  }
  const q = qs[i];
  const prompt = q.dir === "def" ? `What does <b>${esc(q.x.t)}</b> mean?` : `Which term matches this definition?<br><span style="font-size:18px">“${esc(q.x.d)}”</span>`;
  panel.innerHTML = `<div class="row spread small"><span class="muted" style="font-variant-numeric:tabular-nums">Question ${i + 1} of ${qs.length}</span><span class="tag">${unitName(q.x.u)}</span></div>
    <div class="q">${prompt}</div>
    <div class="opts">${q.opts.map((o, k) => `<button class="opt" data-k="${k}">${esc(q.dir === "def" ? o.d : o.t)}</button>`).join("")}</div>
    <div class="feedback" id="fb"></div>`;
  panel.querySelectorAll(".opt").forEach(b => b.onclick = () => {
    const pick = q.opts[+b.dataset.k], ok = pick === q.x;
    panel.querySelectorAll(".opt").forEach(o => { o.disabled = true; if (q.opts[+o.dataset.k] === q.x) o.classList.add("right"); });
    if (ok) quiz.right++; else { b.classList.add("wrong"); quiz.missed.push(q.x); }
    record({ mode: "quiz", termId: q.x.id, unit: q.x.u, correct: ok, scored: true, detail: { dir: q.dir, picked: pick.id } });
    $("#fb").innerHTML = `<div class="row spread"><span style="color:var(${ok ? "--good" : "--bad"});font-weight:700">${ok ? "Correct!" : "Not quite."}</span><button class="btn primary" id="nq">${i + 1 < qs.length ? "Next question →" : "See score"}</button></div>`;
    $("#nq").onclick = () => { quiz.i++; drawQ(); }; $("#nq").focus();
  });
}

/* ---------- Match ---------- */
let mt;
function Match() {
  const set = shuffle(pool()).slice(0, 6);
  mt = { set, left: shuffle(set), right: shuffle(set), sel: null, done: 0, miss: 0 };
  drawMatch();
}
function drawMatch() {
  const byId = Object.fromEntries(mt.set.map(x => [x.id, x]));
  panel.innerHTML = `<div class="row spread"><p class="muted small" style="margin:0">Tap a term, then tap its definition.</p><span class="small" id="mstat" style="font-variant-numeric:tabular-nums">Matched 0 of ${mt.set.length} · Misses 0</span></div>
    <div class="match"><div class="col">${mt.left.map(x => `<button class="tile t" data-t="${x.id}">${esc(x.t)}</button>`).join("")}</div>
    <div class="col">${mt.right.map(x => `<button class="tile" data-d="${x.id}">${esc(x.d)}</button>`).join("")}</div></div>
    <div id="mend"></div>`;
  const shake = el => { el.classList.add("shake"); setTimeout(() => el.classList.remove("shake"), 400); };
  panel.querySelectorAll(".tile").forEach(b => b.onclick = () => {
    if (b.classList.contains("done")) return;
    if (b.dataset.t !== undefined) { panel.querySelectorAll(".tile.t").forEach(t => t.classList.remove("sel")); b.classList.add("sel"); mt.sel = b; return; }
    if (!mt.sel) return shake(b);
    const term = byId[mt.sel.dataset.t];
    if (mt.sel.dataset.t === b.dataset.d) {
      mt.sel.classList.remove("sel"); mt.sel.classList.add("done"); b.classList.add("done"); mt.sel.disabled = b.disabled = true; mt.sel = null; mt.done++;
      record({ mode: "match", termId: term.id, unit: term.u, correct: true, scored: true });
    } else {
      mt.miss++; shake(b); shake(mt.sel);
      record({ mode: "match", termId: term.id, unit: term.u, correct: false, scored: true, detail: { pickedDef: b.dataset.d } });
    }
    $("#mstat").textContent = `Matched ${mt.done} of ${mt.set.length} · Misses ${mt.miss}`;
    if (mt.done === mt.set.length) {
      $("#mend").innerHTML = `<div class="row spread" style="margin-top:18px"><b style="color:var(--good)">${mt.miss === 0 ? "Perfect round!" : "All matched!"}</b><button class="btn primary" id="mag">New round</button></div>`;
      $("#mag").onclick = Match;
    }
  });
}

/* ---------- Notes fill-in ---------- */
let fl;
function Fill() {
  const p = unit === "all" ? NOTES : NOTES.filter(x => x.u === unit);
  if (!p.length) { panel.innerHTML = `<p>There are no fill-in sentences from the notes for this topic.</p><p><a class="btn" href="#cards">Use flashcards instead</a></p>`; return; }
  fl = { list: shuffle(p), i: 0, bank: false, right: 0 };
  drawFill();
}
function drawFill() {
  if (fl.i >= fl.list.length) {
    panel.innerHTML = `<div class="score">${fl.right}/${fl.list.length}</div><p class="muted">sentences completed correctly on the first check.</p><button class="btn primary" id="fa">Start over</button>`;
    $("#fa").onclick = Fill; return;
  }
  const item = fl.list[fl.i], answers = [];
  const html = esc(item.s).replace(/\[([^\]]+)\]/g, (m, w) => { answers.push(w); const k = answers.length - 1; return `<input class="blank" data-k="${k}" aria-label="Blank ${k + 1}" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:${Math.max(5, w.length + 2)}ch">`; });
  panel.innerHTML = `<div class="row spread small"><span class="muted" style="font-variant-numeric:tabular-nums">Sentence ${fl.i + 1} of ${fl.list.length}</span><span class="tag">${unitName(item.u)}</span></div>
    <div class="sentence">${html}</div>
    <div class="row"><button class="btn primary" id="chk">Check</button><button class="btn" id="bk">${fl.bank ? "Hide" : "Show"} word bank</button><button class="btn" id="rv">Show answers</button><button class="btn" id="sk">Next →</button></div>
    <div class="bank" id="bank" ${fl.bank ? "" : "hidden"}>${shuffle(answers).map(w => `<span>${esc(w)}</span>`).join("")}</div>
    <div class="feedback" id="ffb"></div>`;
  let checked = false;
  const inputs = [...panel.querySelectorAll(".blank")];
  const norm = s => s.trim().toLowerCase().replace(/[%’']/g, "");
  inputs.forEach(inp => inp.addEventListener("keydown", e => { if (e.key === "Enter") $("#chk").click(); }));
  $("#chk").onclick = () => {
    const wrong = [];
    inputs.forEach(inp => { const want = answers[+inp.dataset.k], ok = norm(inp.value) === norm(want); inp.classList.toggle("ok", ok); inp.classList.toggle("no", !ok); if (!ok) wrong.push({ want, typed: inp.value.trim().slice(0, 40) }); });
    const all = wrong.length === 0;
    if (!checked) record({ mode: "fill", unit: item.u, correct: all, scored: true, detail: { noteId: item.id, wrong } });
    checked = true;
    if (all) {
      if (!fl.counted) fl.right++;
      $("#ffb").innerHTML = `<b style="color:var(--good)">All correct!</b>`;
      $("#chk").textContent = "Next →"; $("#chk").onclick = () => { fl.i++; fl.counted = false; drawFill(); };
    } else { fl.counted = true; $("#ffb").innerHTML = `<span style="color:var(--bad)">Some blanks need another try. Red lines are incorrect.</span>`; }
  };
  $("#bk").onclick = () => { fl.bank = !fl.bank; $("#bank").hidden = !fl.bank; $("#bk").textContent = (fl.bank ? "Hide" : "Show") + " word bank"; };
  $("#rv").onclick = () => {
    if (!checked) record({ mode: "fill", unit: item.u, correct: false, scored: true, detail: { noteId: item.id, revealed: true } });
    checked = true; fl.counted = true;
    inputs.forEach(inp => { inp.value = answers[+inp.dataset.k]; inp.classList.add("ok"); inp.classList.remove("no"); });
    $("#ffb").innerHTML = `<span class="muted">Answers filled in. Read the sentence once more, then go on.</span>`;
  };
  $("#sk").onclick = () => { fl.i++; fl.counted = false; drawFill(); };
  inputs[0] && inputs[0].focus({ preventScroll: true });
}

/* ---------- Word list ---------- */
let q = "";
function List() {
  panel.innerHTML = `<p class="small muted" style="margin:0 0 10px">Need a paper copy? Open the <a href="https://docs.google.com/document/d/1UZq2VV1L9wvmPuFDq2-9GFkAlkarSOsqft8QgDiD_F4/edit?usp=sharing" target="_blank" rel="noopener" style="color:var(--gold);font-weight:700">printable word list</a> in Google Docs, then choose File → Print.</p>
    <input class="search" id="search" type="search" placeholder="Search terms or definitions" value="${esc(q)}" aria-label="Search terms"><div class="list" id="lst"></div>`;
  const s = $("#search"); s.oninput = () => { q = s.value; drawList(); }; drawList();
}
function drawList() {
  const qq = q.trim().toLowerCase();
  const items = pool().filter(x => !qq || x.t.toLowerCase().includes(qq) || x.d.toLowerCase().includes(qq));
  $("#lst").innerHTML = items.length ? items.map(x => `<div class="entry"><h3>${esc(x.t)}</h3><div class="d"><p>${esc(x.d)}</p>${x.ex ? `<p class="ex">e.g. ${esc(x.ex)}</p>` : ""}<p style="margin-top:4px"><span class="tag">${unitName(x.u)}</span></p></div><button class="star ${known.has(x.id) ? "on" : ""}" data-id="${x.id}" aria-pressed="${known.has(x.id)}">${known.has(x.id) ? "✓ Got it" : "Mark got it"}</button></div>`).join("") : `<p class="muted">No terms match “${esc(q)}”.</p>`;
  $("#lst").querySelectorAll(".star").forEach(b => b.onclick = () => { const t = TERMS.find(x => x.id === b.dataset.id); setKnown(t, !known.has(t.id)); drawList(); });
}

boot();
