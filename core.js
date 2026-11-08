// Biology Vocab: the study path (Flashcards → Recognition → Recall) shared by every version of the site.
// Storage is handled by an "adapter" passed in by the page (Firebase on GitHub, browser storage in the Claude preview).
// The word list (data.js) is loaded at start-up with loadData(), never cached, so uploading
// a new data.js is all it takes to add vocabulary. checkData() lists mistakes in plain words.
export let SETS = [], UNITS = [], TERMS = [], NOTES = [];
export async function loadData() {
  try {
    const d = await import("./data.js?v=" + Date.now());
    for (const k of ["SETS", "UNITS", "TERMS", "NOTES"]) if (!Array.isArray(d[k])) throw new Error(`The list ${k} is missing from data.js.`);
    SETS = d.SETS; UNITS = d.UNITS; TERMS = d.TERMS; NOTES = d.NOTES;
    return { ok: true, problems: checkData() };
  } catch (e) {
    console.error(e);
    return { ok: false, error: String(e && e.message || e) };
  }
}
export const dataErrorHTML = err => `<h2>The word list has a mistake</h2>
  <p>The site couldn't read <b>data.js</b>, so it can't start. This usually means a missing comma, quote mark or bracket in the most recent edit.</p>
  <p><b>Teachers:</b> on GitHub, open data.js and choose <b>History</b> to see the last change, or upload the previous copy again.</p>
  <p class="small muted">Details: ${String(err).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))}</p>`;
export function checkData() {
  const out = [], seen = (list, what) => { const s = new Set(); list.forEach(x => { if (!x || !x.id) out.push(`A ${what} is missing its "id".`); else if (s.has(x.id)) out.push(`The ${what} id "${x.id}" is used more than once.`); else s.add(x.id); }); return s; };
  const sets = seen(SETS, "set"), units = seen(UNITS, "lesson"); seen(TERMS, "term"); seen(NOTES, "fill-in sentence");
  UNITS.forEach(u => {
    if (u && !u.name) out.push(`Lesson "${u.id}" is missing its "name".`);
    if (u && !sets.has(u.set)) out.push(`Lesson "${u.id}" has set "${u.set}", which isn't in SETS.`);
    if (u && u.start && u.start !== "TBD" && !(isDate(u.start) && !isNaN(new Date(u.start + "T00:00:00")))) out.push(`Lesson "${u.id}" has start "${u.start}". Use "TBD" or a date like "2027-02-15".`);
  });
  TERMS.forEach(t => {
    if (!t) return;
    if (t.id && !/^[a-z0-9_]+$/.test(t.id)) out.push(`Term id "${t.id}" should use only lowercase letters, numbers and underscores.`);
    if (!t.t || !t.d) out.push(`Term "${t.id}" needs both "t" (the word) and "d" (the definition).`);
    if (!units.has(t.u)) out.push(`Term "${t.id}" has lesson "${t.u}", which isn't in UNITS.`);
  });
  NOTES.forEach(n => {
    if (!n) return;
    if (!units.has(n.u)) out.push(`Fill-in sentence "${n.id}" has lesson "${n.u}", which isn't in UNITS.`);
    if (!/\[[^\]]+\]/.test(n.s || "")) out.push(`Fill-in sentence "${n.id}" has no [blank] in it.`);
    else if ((n.s.match(/\[/g) || []).length !== (n.s.match(/\]/g) || []).length) out.push(`Fill-in sentence "${n.id}" has an unmatched [ or ].`);
  });
  return out;
}
export const problemsHTML = list => list.length ? `<div class="notice"><b>data.js needs a fix (only teachers see this):</b><ul style="margin:6px 0 0;padding-left:20px">${list.slice(0, 12).map(p => `<li>${p.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</li>`).join("")}</ul>${list.length > 12 ? `<p style="margin:6px 0 0">…and ${list.length - 12} more.</p>` : ""}</div>` : "";

export const RECOG_GOAL = 2;   // correct answers in a row before a term counts as recognized
export const RECALL_GOAL = 1;  // first-check-correct completions in a row before a sentence counts as recalled

// Spaced repetition (Leitner boxes). Right answer on a due item: up one box. Wrong answer: back to box 1.
export const INTERVALS = [0, 1, 2, 4, 8, 16]; // days until the next review for boxes 1–5
export const LONG_TERM_BOX = 4;               // box 4+ = remembered after a week or more
export const REVIEW_SESSION = 20;             // items per Daily Review round
export const dayNum = (date = new Date()) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
export const todayISO = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; };
// A lesson is open with no start date, or once its date arrives. "TBD" (or anything that isn't a date) keeps it hidden.
export const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || "");
export const isOpen = u => !u.start || (isDate(u.start) && u.start <= todayISO());
export const opensLabel = u => isDate(u.start) ? "opens " + new Date(u.start + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "date not set";
// Items practiced before spaced repetition existed have no box yet: their streak sets the box and they're due now.
export const boxOf = st => !st || !st.a ? 0 : (st.b ?? Math.min(5, Math.max(1, st.s || 0)));
export const dueDay = st => !st || !st.a ? null : (st.d ?? dayNum());
export function updateItem(st, correct) {
  const t = dayNum();
  if (st.b == null && (st.a || 0) > 0) { st.b = Math.min(5, Math.max(1, st.s || 0)); st.d = t; }
  const wasDue = st.d == null || st.d <= t;
  st.a = (st.a || 0) + 1; if (correct) st.c = (st.c || 0) + 1; st.s = correct ? (st.s || 0) + 1 : 0;
  if (!correct) { st.b = 1; st.d = t + 1; }
  else if (wasDue) { st.b = Math.min(5, (st.b || 0) + 1); st.d = t + INTERVALS[st.b]; }
  st.l = t;
  return st;
}

const PRINT_URL = "https://docs.google.com/document/d/1UZq2VV1L9wvmPuFDq2-9GFkAlkarSOsqft8QgDiD_F4/edit?usp=sharing";
const STEPS = {
  review: { n: 0, name: "Daily Review", sub: "Spaced repetition", desc: "Terms and sentences come back right before you'd forget them. Get one right and it waits longer next time (1, 2, 4, 8, then 16 days). Miss it and it comes back tomorrow.", next: null },
  cards: { n: 1, name: "Flashcards", sub: "Metacognition", desc: "Check what you already know. Mark “Got it” only if you could explain the term without looking.", next: "recog" },
  recog: { n: 2, name: "Recognition", sub: "Quiz and Match", desc: `Pick the right answer from the choices. A term counts as recognized after ${RECOG_GOAL} correct answers in a row.`, next: "recall" },
  recall: { n: 3, name: "Recall", sub: "Notes Fill-In", desc: "Write the missing words from memory. A sentence counts as recalled when every blank is right on the first check.", next: null }
};

const $ = s => document.querySelector(s);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const unitName = id => (UNITS.find(u => u.id === id) || {}).name;
const setOf = u => (UNITS.find(x => x.id === u) || {}).set;
const setName = id => (SETS.find(s => s.id === id) || {}).name || "";

// adapter: { get(key, fallback), set(key, value), saveKnown(term, on, state), recordRecognition(ev, state), recordRecall(ev, state) }
export function createCore(adapter, opts = {}) {
  const state = { known: new Set(), stats: {}, recall: {} };
  // Two-level filter: a unit button (Lions 1st half, Elephants, ...) and a lesson dropdown inside it.
  let setSel = adapter.get("lv-set", "all"), lessonSel = adapter.get("lv-lesson", "all");
  let recogMode = adapter.get("lv-recog", "quiz");
  let mode = "cards";
  let started = false;

  // Lessons with a future "start" date stay hidden from students (teachers see them, marked).
  const openUnits = () => UNITS.filter(u => opts.preview || isOpen(u));
  const inSel = u => openUnits().some(x => x.id === u) && (setSel === "all" || setOf(u) === setSel) && (lessonSel === "all" || lessonSel === u);
  const pool = () => TERMS.filter(x => inSel(x.u));
  const notePool = () => NOTES.filter(x => inSel(x.u));
  const panel = $("#panel");
  let box = panel;

  /* ---------- progress ---------- */
  function setKnown(term, on) {
    if (on) state.known.add(term.id); else state.known.delete(term.id);
    adapter.saveKnown(term, on, state); updateMeters();
  }
  function recordRecognition(term, correct, quizMode, detail) {
    const st = updateItem(state.stats[term.id] || (state.stats[term.id] = {}), correct);
    adapter.recordRecognition({ mode: quizMode, term, correct, item: { ...st }, detail: detail || null }, state); updateMeters();
  }
  function recordRecall(note, correct, detail) {
    const st = updateItem(state.recall[note.id] || (state.recall[note.id] = {}), correct);
    adapter.recordRecall({ note, correct, item: { ...st }, detail: detail || null }, state); updateMeters();
  }
  function dueItems() {
    const t = dayNum();
    const rec = pool().map(x => ({ kind: "rec", x, d: dueDay(state.stats[x.id]) })).filter(o => o.d != null && o.d <= t);
    const rcl = notePool().map(n => ({ kind: "rcl", n, d: dueDay(state.recall[n.id]) })).filter(o => o.d != null && o.d <= t);
    return [...rec, ...rcl];
  }
  function updateMeters() {
    const terms = pool(), notes = notePool();
    const got = terms.filter(t => state.known.has(t.id)).length;
    const rec = terms.filter(t => (state.stats[t.id]?.s || 0) >= RECOG_GOAL).length;
    const rcl = notes.filter(n => (state.recall[n.id]?.s || 0) >= RECALL_GOAL).length;
    const meter = (label, n, tot, cls, what) => `<div class="meter" title="${n} of ${tot} ${what}"><span>${label}</span><span class="mbar" role="img" aria-label="${label}: ${n} of ${tot} ${what}"><i class="${cls}" style="width:${tot ? n / tot * 100 : 0}%"></i></span><b>${n}/${tot}</b></div>`;
    const due = dueItems().length, badge = $("#duebadge");
    if (badge) { badge.textContent = due; badge.hidden = !due; }
    $("#meters").innerHTML = meter("Got it", got, terms.length, "m1", "terms marked Got it")
      + meter("Recognized", rec, terms.length, "m2", "terms recognized")
      + meter("Recalled", rcl, notes.length, "m3", "sentences recalled");
  }

  /* ---------- shell ---------- */
  function renderUnits() {
    const open = openUnits(), usable = s => open.some(u => u.set === s.id);
    if (setSel !== "all" && !SETS.some(s => s.id === setSel && usable(s))) setSel = "all";
    const lessons = open.filter(u => setSel === "all" || u.set === setSel);
    if (lessonSel !== "all" && !lessons.some(u => u.id === lessonSel)) lessonSel = "all";
    // Every unit gets a button. Units with no open lessons yet show "Soon" and can't be picked (teachers can preview them).
    const chip = s => {
      const ok = s === "all" || usable(s), id = s === "all" ? "all" : s.id, name = s === "all" ? "All units" : s.name;
      return `<button class="chip${s === "all" ? "" : " half"}${ok ? "" : " soon"}" data-set="${id}" aria-pressed="${id === setSel}" ${ok ? "" : `disabled title="Opens when your class starts this unit"`}>${esc(name)}${ok ? "" : ` <small>Soon</small>`}</button>`;
    };
    const label = u => esc(u.name) + (isOpen(u) ? "" : ` (${opensLabel(u)})`);
    const options = setSel === "all"
      ? SETS.filter(usable).map(s => `<optgroup label="${esc(s.name)}">${open.filter(u => u.set === s.id).map(u => `<option value="${u.id}" ${u.id === lessonSel ? "selected" : ""}>${label(u)}</option>`).join("")}</optgroup>`).join("")
      : lessons.map(u => `<option value="${u.id}" ${u.id === lessonSel ? "selected" : ""}>${label(u)}</option>`).join("");
    const curName = setSel === "all" ? "all units" : (SETS.find(s => s.id === setSel) || {}).name;
    $("#units").innerHTML = `<div class="unitrow" role="group" aria-label="Unit">${chip("all")}${SETS.map(chip).join("")}</div>
      <label class="lessonpick" for="lessonSel"><span>Lesson</span>
        <select id="lessonSel"><option value="all" ${lessonSel === "all" ? "selected" : ""}>All lessons in ${esc(curName)}</option>${options}</select></label>`;
    $("#lessonSel").onchange = e => { lessonSel = e.target.value; adapter.set("lv-lesson", lessonSel); updateMeters(); render(); };
  }
  $("#units").addEventListener("click", e => {
    const b = e.target.closest("[data-set]"); if (!b || b.disabled) return;
    setSel = b.dataset.set; lessonSel = "all"; adapter.set("lv-set", setSel); adapter.set("lv-lesson", "all"); renderUnits(); updateMeters(); render();
  });
  document.querySelector("nav.modes").addEventListener("click", e => {
    const b = e.target.closest("[data-mode]"); if (b) location.hash = b.dataset.mode;
  });
  const MODES = ["review", "cards", "recog", "recall", "list"];
  function readHash() {
    const h = location.hash.slice(1);
    mode = MODES.includes(h) ? h : h === "quiz" || h === "match" ? (recogMode = h, "recog") : h === "fill" ? "recall" : (dueItems().length ? "review" : "cards");
    document.querySelectorAll("nav.modes button").forEach(b => b.setAttribute("aria-selected", b.dataset.mode === mode));
    render();
  }
  window.addEventListener("hashchange", () => { if (started) readHash(); });

  function render() {
    if (mode === "list") { box = panel; return List(); }
    const st = STEPS[mode];
    panel.innerHTML = `<div class="stephead">
        <div><span class="stepnum">${st.n ? `Step ${st.n} of 3 · ` : ""}${st.sub}</span><h2>${st.name}</h2><p>${st.desc}</p></div>
        ${st.next ? `<a class="btn nextstep" href="#${st.next}">Next: ${STEPS[st.next].name} →</a>` : ""}
      </div>
      ${mode === "recog" ? `<div class="seg" role="group" aria-label="Recognition activity"><button data-r="quiz" aria-pressed="${recogMode === "quiz"}">Quiz</button><button data-r="match" aria-pressed="${recogMode === "match"}">Match</button></div>` : ""}
      <div id="box"></div>`;
    box = $("#box");
    if (mode === "review") return Review();
    if (mode === "recog") {
      panel.querySelectorAll(".seg button").forEach(b => b.onclick = () => { recogMode = b.dataset.r; adapter.set("lv-recog", recogMode); render(); });
      return recogMode === "match" ? Match() : Quiz();
    }
    mode === "cards" ? Cards() : Fill();
  }

  /* ---------- Daily Review (spaced repetition) ---------- */
  let rv;
  function Review() {
    const due = dueItems().sort((a, b) => a.d - b.d);
    const practiced = pool().some(x => state.stats[x.id]?.a) || notePool().some(n => state.recall[n.id]?.a);
    const longTerm = pool().filter(x => boxOf(state.stats[x.id]) >= LONG_TERM_BOX).length;
    if (!due.length) {
      const t = dayNum(), all = [...pool().map(x => dueDay(state.stats[x.id])), ...notePool().map(n => dueDay(state.recall[n.id]))].filter(d => d != null);
      const tomorrow = all.filter(d => d === t + 1).length, next = all.length ? Math.min(...all) : null;
      box.innerHTML = practiced
        ? `<h3 style="font-family:var(--display);font-size:24px;margin:0 0 6px">You're all caught up.</h3>
           <p class="muted">${tomorrow ? `${tomorrow} item${tomorrow === 1 ? "" : "s"} come back tomorrow.` : next ? `Your next review is in ${next - t} days.` : ""} ${longTerm} term${longTerm === 1 ? " is" : "s are"} in long-term memory (box ${LONG_TERM_BOX} or higher).</p>
           <div class="row"><a class="btn primary" href="#cards">Keep studying: Step 1 Flashcards</a><a class="btn" href="#recog">Step 2 Recognition</a></div>`
        : `<h3 style="font-family:var(--display);font-size:24px;margin:0 0 6px">Nothing to review yet.</h3>
           <p class="muted">Start the study path. Terms you answer in Recognition and sentences you try in Recall come back here when they're due.</p>
           <a class="btn primary" href="#cards">Start with Step 1 Flashcards</a>`;
      return;
    }
    rv = { items: shuffle(due.slice(0, REVIEW_SESSION)), total: due.length, i: 0, right: 0, missed: [] };
    drawReview();
  }
  function boxStrip() {
    const counts = [1, 2, 3, 4, 5].map(b => pool().filter(x => boxOf(state.stats[x.id]) === b).length + notePool().filter(n => boxOf(state.recall[n.id]) === b).length);
    return `<div class="boxes" aria-label="Items in each review box">${counts.map((n, k) => `<span class="bx b${k + 1}"><b>${n}</b>Box ${k + 1}<small>${INTERVALS[k + 1]} day${k ? "s" : ""}</small></span>`).join("")}</div>`;
  }
  function drawReview() {
    const { items, i } = rv;
    if (i >= items.length) {
      const left = dueItems().length;
      box.innerHTML = `<div class="row" style="gap:20px;align-items:end"><div class="score">${rv.right}/${items.length}</div><div class="muted">correct this round.${left ? ` ${left} more item${left === 1 ? " is" : "s are"} due.` : " You're caught up for today."}</div></div>
        ${rv.missed.length ? `<h3 style="font-family:var(--display);margin-top:22px">These come back tomorrow</h3><ul class="missed">${rv.missed.map(m => `<li>${m}</li>`).join("")}</ul>` : ""}
        ${boxStrip()}
        <div class="row" style="margin-top:16px">${left ? `<button class="btn primary" id="more">Review ${Math.min(left, REVIEW_SESSION)} more</button>` : ""}<a class="btn${left ? "" : " primary"}" href="#cards">Back to the study path</a></div>`;
      const more = $("#more"); if (more) more.onclick = Review;
      return;
    }
    const it = items[i];
    const head = `<div class="row spread small"><span class="muted" style="font-variant-numeric:tabular-nums">Review ${i + 1} of ${items.length}${rv.total > items.length ? ` (${rv.total} due)` : ""}</span><span class="row" style="gap:6px"><span class="tag">${esc(unitName(it.kind === "rec" ? it.x.u : it.n.u))}</span><span class="tag ${it.kind === "rec" ? "rectag" : "rcltag"}">${it.kind === "rec" ? "Recognition" : "Recall"}</span></span></div>`;
    const next = () => { rv.i++; drawReview(); };
    if (it.kind === "rec") {
      const x = it.x, dir = Math.random() < .5 ? "def" : "term";
      const same = TERMS.filter(o => o.id !== x.id && o.u === x.u), other = TERMS.filter(o => o.id !== x.id && o.u !== x.u);
      const opts = shuffle([x, ...[...shuffle(same), ...shuffle(other)].slice(0, 3)]);
      const prompt = dir === "def" ? `What does <b>${esc(x.t)}</b> mean?` : `Which term matches this definition?<br><span style="font-size:18px">“${esc(x.d)}”</span>`;
      box.innerHTML = `${head}<div class="q">${prompt}</div><div class="opts">${opts.map((o, k) => `<button class="opt" data-k="${k}">${esc(dir === "def" ? o.d : o.t)}</button>`).join("")}</div><div class="feedback" id="fb"></div>`;
      box.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        const pick = opts[+b.dataset.k], ok = pick === x;
        box.querySelectorAll(".opt").forEach(o => { o.disabled = true; if (opts[+o.dataset.k] === x) o.classList.add("right"); });
        if (ok) rv.right++; else { b.classList.add("wrong"); rv.missed.push(`<b>${esc(x.t)}</b>: ${esc(x.d)}`); }
        recordRecognition(x, ok, "quiz", { dir, picked: pick.id, review: true });
        const st = state.stats[x.id];
        $("#fb").innerHTML = `<div class="row spread"><span style="color:var(${ok ? "--good" : "--bad"});font-weight:700">${ok ? `Correct! Back in ${INTERVALS[st.b]} day${st.b > 1 ? "s" : ""}.` : "Not quite. It comes back tomorrow."}</span><button class="btn primary" id="nx">Next →</button></div>`;
        $("#nx").onclick = next; $("#nx").focus();
      });
    } else {
      const n = it.n, answers = [];
      const html = esc(n.s).replace(/\[([^\]]+)\]/g, (m, w) => { answers.push(w); const k = answers.length - 1; return `<input class="blank" data-k="${k}" aria-label="Blank ${k + 1}" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:${Math.max(5, w.length + 2)}ch">`; });
      let bank = false;
      box.innerHTML = `${head}<div class="sentence">${html}</div>
        <div class="row"><button class="btn primary" id="chk">Check</button><button class="btn" id="bk">Show word bank</button></div>
        <div class="bank" id="bank" hidden>${shuffle(answers).map(w => `<span>${esc(w)}</span>`).join("")}</div><div class="feedback" id="fb"></div>`;
      const inputs = [...box.querySelectorAll(".blank")];
      const norm = s => s.trim().toLowerCase().replace(/[%’']/g, "");
      inputs.forEach(inp => inp.addEventListener("keydown", e => { if (e.key === "Enter") $("#chk").click(); }));
      $("#bk").onclick = () => { bank = !bank; $("#bank").hidden = !bank; $("#bk").textContent = (bank ? "Hide" : "Show") + " word bank"; };
      $("#chk").onclick = () => {
        const wrong = [];
        inputs.forEach(inp => { const want = answers[+inp.dataset.k], ok = norm(inp.value) === norm(want); inp.classList.toggle("ok", ok); inp.classList.toggle("no", !ok); inp.disabled = true; if (!ok) wrong.push({ want, typed: inp.value.trim().slice(0, 40) }); });
        const ok = !wrong.length;
        if (ok) rv.right++; else rv.missed.push(esc(n.s.replace(/\[([^\]]+)\]/g, "$1")));
        recordRecall(n, ok, { wrong, usedBank: bank, review: true });
        const st = state.recall[n.id];
        $("#chk").remove(); $("#bk").remove();
        $("#fb").innerHTML = `<div class="row spread"><span style="color:var(${ok ? "--good" : "--bad"});font-weight:700">${ok ? `All correct! Back in ${INTERVALS[st.b]} day${st.b > 1 ? "s" : ""}.` : `Answer: ${answers.map(esc).join(", ")}. It comes back tomorrow.`}</span><button class="btn primary" id="nx">Next →</button></div>`;
        $("#nx").onclick = next; $("#nx").focus();
      };
      inputs[0] && inputs[0].focus({ preventScroll: true });
    }
  }

  /* ---------- Step 1: Flashcards ---------- */
  let deck = [], di = 0;
  const cardsOpts = { front: "term", hideKnown: false };
  function Cards() {
    let p = pool(); if (cardsOpts.hideKnown) p = p.filter(x => !state.known.has(x.id));
    deck = shuffle(p); di = 0; drawCard();
  }
  function drawCard() {
    if (!deck.length) {
      box.innerHTML = `<h3 style="font-family:var(--display)">Every card here is marked “Got it.”</h3>
        <p class="muted">Test yourself in Recognition next, or turn off “Skip terms I know” to review again.</p>
        <div class="row"><a class="btn primary" href="#recog">Go to Recognition →</a><button class="btn" id="showAll">Show all cards</button></div>`;
      $("#showAll").onclick = () => { cardsOpts.hideKnown = false; Cards(); }; return;
    }
    const x = deck[di], frontTerm = cardsOpts.front === "term";
    const exHTML = x.ex ? `<div class="ex">e.g. ${esc(x.ex)}</div>` : "";
    const termHTML = `<div class="term">${esc(x.t)}</div>`;
    box.innerHTML = `
      <div class="row spread small">
        <span class="muted" style="font-variant-numeric:tabular-nums">Card ${di + 1} of ${deck.length}</span>
        <div class="row">
          <button class="btn small" id="swap">Show ${frontTerm ? "definition" : "term"} first</button>
          <button class="btn small" id="hk" aria-pressed="${cardsOpts.hideKnown}">${cardsOpts.hideKnown ? "✓ " : ""}Skip terms I know</button>
        </div>
      </div>
      <div class="cardzone"><div class="card" id="card" tabindex="0" role="button" aria-label="Flip card">
        <div class="face front"><span class="tag">${esc(unitName(x.u))}</span>${frontTerm ? termHTML : `<div class="def">${esc(x.d)}</div>`}<span class="hint">Tap or press Space to flip</span></div>
        <div class="face back">${frontTerm ? `<div class="def">${esc(x.d)}</div>${exHTML}` : termHTML + exHTML}</div>
      </div></div>
      <div class="row spread">
        <button class="btn" id="prev" ${di === 0 ? "disabled" : ""}>← Back</button>
        <div class="row">
          <button class="btn bad" id="learn">Still learning</button>
          <button class="btn good" id="got">${state.known.has(x.id) ? "✓ Got it" : "Got it"}</button>
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

  /* ---------- Step 2: Recognition (Quiz) ---------- */
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
      box.innerHTML = `<div class="row" style="gap:20px;align-items:end"><div class="score">${quiz.right}/${qs.length}</div><div class="muted">${pct >= 90 ? "Excellent work! You're ready for Recall." : pct >= 70 ? "Good job. Review the ones you missed." : "Keep practicing. Flashcards can help with these terms."}</div></div>
        ${quiz.missed.length ? `<h3 style="font-family:var(--display);margin-top:22px">Review these</h3><ul class="missed">${quiz.missed.map(x => `<li><b>${esc(x.t)}</b>: ${esc(x.d)}</li>`).join("")}</ul>` : ""}
        <div class="row" style="margin-top:16px"><button class="btn primary" id="again">New quiz</button><a class="btn" href="#recall">Go to Recall →</a><a class="btn" href="#cards">Back to flashcards</a></div>`;
      $("#again").onclick = Quiz; return;
    }
    const q = qs[i];
    const prompt = q.dir === "def" ? `What does <b>${esc(q.x.t)}</b> mean?` : `Which term matches this definition?<br><span style="font-size:18px">“${esc(q.x.d)}”</span>`;
    box.innerHTML = `<div class="row spread small"><span class="muted" style="font-variant-numeric:tabular-nums">Question ${i + 1} of ${qs.length}</span><span class="tag">${esc(unitName(q.x.u))}</span></div>
      <div class="q">${prompt}</div>
      <div class="opts">${q.opts.map((o, k) => `<button class="opt" data-k="${k}">${esc(q.dir === "def" ? o.d : o.t)}</button>`).join("")}</div>
      <div class="feedback" id="fb"></div>`;
    box.querySelectorAll(".opt").forEach(b => b.onclick = () => {
      const pick = q.opts[+b.dataset.k], ok = pick === q.x;
      box.querySelectorAll(".opt").forEach(o => { o.disabled = true; if (q.opts[+o.dataset.k] === q.x) o.classList.add("right"); });
      if (ok) quiz.right++; else { b.classList.add("wrong"); quiz.missed.push(q.x); }
      recordRecognition(q.x, ok, "quiz", { dir: q.dir, picked: pick.id });
      $("#fb").innerHTML = `<div class="row spread"><span style="color:var(${ok ? "--good" : "--bad"});font-weight:700">${ok ? "Correct!" : "Not quite."}</span><button class="btn primary" id="nq">${i + 1 < qs.length ? "Next question →" : "See score"}</button></div>`;
      $("#nq").onclick = () => { quiz.i++; drawQ(); }; $("#nq").focus();
    });
  }

  /* ---------- Step 2: Recognition (Match) ---------- */
  let mt;
  function Match() {
    const set = shuffle(pool()).slice(0, 6);
    mt = { set, left: shuffle(set), right: shuffle(set), sel: null, done: 0, miss: 0 };
    drawMatch();
  }
  function drawMatch() {
    const byId = Object.fromEntries(mt.set.map(x => [x.id, x]));
    box.innerHTML = `<div class="row spread"><p class="muted small" style="margin:0">Tap a term, then tap its definition.</p><span class="small" id="mstat" style="font-variant-numeric:tabular-nums">Matched 0 of ${mt.set.length} · Misses 0</span></div>
      <div class="match"><div class="col">${mt.left.map(x => `<button class="tile t" data-t="${x.id}">${esc(x.t)}</button>`).join("")}</div>
      <div class="col">${mt.right.map(x => `<button class="tile" data-d="${x.id}">${esc(x.d)}</button>`).join("")}</div></div>
      <div id="mend"></div>`;
    const shake = el => { el.classList.add("shake"); setTimeout(() => el.classList.remove("shake"), 400); };
    box.querySelectorAll(".tile").forEach(b => b.onclick = () => {
      if (b.classList.contains("done")) return;
      if (b.dataset.t !== undefined) { box.querySelectorAll(".tile.t").forEach(t => t.classList.remove("sel")); b.classList.add("sel"); mt.sel = b; return; }
      if (!mt.sel) return shake(b);
      const term = byId[mt.sel.dataset.t];
      if (mt.sel.dataset.t === b.dataset.d) {
        mt.sel.classList.remove("sel"); mt.sel.classList.add("done"); b.classList.add("done"); mt.sel.disabled = b.disabled = true; mt.sel = null; mt.done++;
        recordRecognition(term, true, "match");
      } else {
        mt.miss++; shake(b); shake(mt.sel);
        recordRecognition(term, false, "match", { pickedDef: b.dataset.d });
      }
      $("#mstat").textContent = `Matched ${mt.done} of ${mt.set.length} · Misses ${mt.miss}`;
      if (mt.done === mt.set.length) {
        $("#mend").innerHTML = `<div class="row spread" style="margin-top:18px"><b style="color:var(--good)">${mt.miss === 0 ? "Perfect round!" : "All matched!"}</b><div class="row"><button class="btn primary" id="mag">New round</button><a class="btn" href="#recall">Go to Recall →</a></div></div>`;
        $("#mag").onclick = Match;
      }
    });
  }

  /* ---------- Step 3: Recall (Notes Fill-In) ---------- */
  let fl;
  function Fill() {
    const p = notePool();
    if (!p.length) { box.innerHTML = `<p>There are no fill-in sentences from the notes for this topic.</p><p><a class="btn" href="#recog">Practice Recognition instead</a></p>`; return; }
    fl = { list: shuffle(p), i: 0, bank: false, right: 0, counted: false };
    drawFill();
  }
  function drawFill() {
    if (fl.i >= fl.list.length) {
      box.innerHTML = `<div class="score">${fl.right}/${fl.list.length}</div><p class="muted">sentences completed correctly on the first check.</p><div class="row"><button class="btn primary" id="fa">Start over</button><a class="btn" href="#cards">Back to flashcards</a></div>`;
      $("#fa").onclick = Fill; return;
    }
    const item = fl.list[fl.i], answers = [];
    const html = esc(item.s).replace(/\[([^\]]+)\]/g, (m, w) => { answers.push(w); const k = answers.length - 1; return `<input class="blank" data-k="${k}" aria-label="Blank ${k + 1}" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:${Math.max(5, w.length + 2)}ch">`; });
    box.innerHTML = `<div class="row spread small"><span class="muted" style="font-variant-numeric:tabular-nums">Sentence ${fl.i + 1} of ${fl.list.length}</span><span class="tag">${esc(unitName(item.u))}</span></div>
      <div class="sentence">${html}</div>
      <div class="row"><button class="btn primary" id="chk">Check</button><button class="btn" id="bk">${fl.bank ? "Hide" : "Show"} word bank</button><button class="btn" id="rv">Show answers</button><button class="btn" id="sk">Next →</button></div>
      <div class="bank" id="bank" ${fl.bank ? "" : "hidden"}>${shuffle(answers).map(w => `<span>${esc(w)}</span>`).join("")}</div>
      <div class="feedback" id="ffb"></div>`;
    let checked = false;
    const inputs = [...box.querySelectorAll(".blank")];
    const norm = s => s.trim().toLowerCase().replace(/[%’']/g, "");
    inputs.forEach(inp => inp.addEventListener("keydown", e => { if (e.key === "Enter") $("#chk").click(); }));
    $("#chk").onclick = () => {
      const wrong = [];
      inputs.forEach(inp => { const want = answers[+inp.dataset.k], ok = norm(inp.value) === norm(want); inp.classList.toggle("ok", ok); inp.classList.toggle("no", !ok); if (!ok) wrong.push({ want, typed: inp.value.trim().slice(0, 40) }); });
      const all = wrong.length === 0;
      if (!checked) recordRecall(item, all, { wrong, usedBank: fl.bank });
      checked = true;
      if (all) {
        if (!fl.counted) fl.right++;
        $("#ffb").innerHTML = `<b style="color:var(--good)">All correct!</b>`;
        $("#chk").textContent = "Next →"; $("#chk").onclick = () => { fl.i++; fl.counted = false; drawFill(); };
      } else { fl.counted = true; $("#ffb").innerHTML = `<span style="color:var(--bad)">Some blanks need another try. Red lines are incorrect.</span>`; }
    };
    $("#bk").onclick = () => { fl.bank = !fl.bank; $("#bank").hidden = !fl.bank; $("#bk").textContent = (fl.bank ? "Hide" : "Show") + " word bank"; };
    $("#rv").onclick = () => {
      if (!checked) recordRecall(item, false, { revealed: true });
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
    box.innerHTML = `<p class="small muted" style="margin:0 0 10px">Need a paper copy? Open the <a href="${PRINT_URL}" target="_blank" rel="noopener" style="color:var(--gold);font-weight:700">printable word list</a> in Google Docs, then choose File → Print.</p>
      <input class="search" id="search" type="search" placeholder="Search terms or definitions" value="${esc(q)}" aria-label="Search terms"><div class="list" id="lst"></div>`;
    const s = $("#search"); s.oninput = () => { q = s.value; drawList(); }; drawList();
  }
  function drawList() {
    const qq = q.trim().toLowerCase();
    const items = pool().filter(x => !qq || x.t.toLowerCase().includes(qq) || x.d.toLowerCase().includes(qq));
    $("#lst").innerHTML = items.length ? items.map(x => {
      const rec = (state.stats[x.id]?.s || 0) >= RECOG_GOAL;
      return `<div class="entry"><h3>${esc(x.t)}</h3><div class="d"><p>${esc(x.d)}</p>${x.ex ? `<p class="ex">e.g. ${esc(x.ex)}</p>` : ""}<p style="margin-top:4px"><span class="tag halftag">${esc(setName(setOf(x.u)))}</span> <span class="tag">${esc(unitName(x.u))}</span>${rec ? ` <span class="tag rectag">Recognized</span>` : ""}</p></div><button class="star ${state.known.has(x.id) ? "on" : ""}" data-id="${x.id}" aria-pressed="${state.known.has(x.id)}">${state.known.has(x.id) ? "✓ Got it" : "Mark got it"}</button></div>`;
    }).join("") : `<p class="muted">No terms match “${esc(q)}”.</p>`;
    $("#lst").querySelectorAll(".star").forEach(b => b.onclick = () => { const t = TERMS.find(x => x.id === b.dataset.id); setKnown(t, !state.known.has(t.id)); drawList(); });
  }

  return {
    start(init) {
      state.known = new Set(init.known || []);
      state.stats = init.stats || {};
      state.recall = init.recall || {};
      started = true;
      renderUnits(); updateMeters(); readHash();
    }
  };
}
