import { UNITS, TERMS, NOTES } from "./data.js";
import { loadFirebase, configured, isTeacherEmail, SCHOOL_DOMAIN, GOOGLE_ICON } from "./fb.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const unitName = id => (UNITS.find(u => u.id === id) || {}).name || id;
const TERM = Object.fromEntries(TERMS.map(t => [t.id, t]));
const NOTE = Object.fromEntries(NOTES.map(n => [n.id, n]));
const gate = $("#gate"), main = $("#main");
const DEMO = new URLSearchParams(location.search).has("demo");

// Thresholds used everywhere on the page
const MIN_TERM = 2;          // a student needs this many answers on a term before we judge it
const MIN_CLASS_TERM = 3;    // class-wide answers needed before a term shows in the class lists
const LOW = 0.6, HIGH = 0.8; // below 60% = struggling, 80%+ = strong

let fb = null, students = [], period = "all", view = "class", selUid = null, sortBy = "period";

/* ---------- math ---------- */
const pct = (c, a) => a ? Math.round(c / a * 100) : null;
const lvl = p => p == null ? "none" : p < LOW * 100 ? "bad" : p < HIGH * 100 ? "mid" : "good";
const sumUnits = s => Object.values(s.units).reduce((t, u) => ({ a: t.a + (u.a || 0), c: t.c + (u.c || 0) }), { a: 0, c: 0 });
function status(s) {
  const t = sumUnits(s);
  if (t.a < 5) return { cls: "none", label: "Not enough answers" };
  const p = pct(t.c, t.a);
  return p < LOW * 100 ? { cls: "bad", label: "Needs support" } : p < HIGH * 100 ? { cls: "mid", label: "Developing" } : { cls: "good", label: "Strong" };
}
function weakestUnit(s) {
  let w = null;
  for (const u of UNITS) { const x = s.units[u.id]; if (!x || (x.a || 0) < 3) continue; const p = pct(x.c || 0, x.a); if (!w || p < w.p) w = { id: u.id, p }; }
  return w;
}
const termRows = s => TERMS.map(t => { const x = s.stats[t.id] || {}; const a = x.a || 0, c = x.c || 0; return { t, a, c, p: pct(c, a) }; });
const filtered = () => period === "all" ? students : students.filter(s => s.period === +period);
const fmtDate = d => d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "Never";
const daysAgo = d => d ? (Date.now() - d.getTime()) / 864e5 : Infinity;

function norm(d) {
  return {
    uid: d.uid, name: d.name || d.email || "Unknown", email: d.email || "", period: d.period,
    lastActive: d.lastActive && d.lastActive.toDate ? d.lastActive.toDate() : (d.lastActive instanceof Date ? d.lastActive : null),
    known: d.known || [], stats: d.stats || {}, units: d.units || {}, counts: d.counts || {}
  };
}

/* ---------- boot / auth ---------- */
function showGate(html) { gate.innerHTML = html; gate.hidden = false; $("#app").hidden = true; }
function showSignIn(msg) {
  showGate(`<h2>Teacher sign-in</h2><p>Sign in with your @${esc(SCHOOL_DOMAIN)} teacher account to see student progress.</p>
    ${msg ? `<div class="notice">${esc(msg)}</div>` : ""}
    <button class="gbtn" id="signin">${GOOGLE_ICON} Sign in with Google</button>
    <p class="small muted" style="margin-top:16px">Want to look around first? <a href="dashboard.html?demo">Preview with made-up data</a></p>`);
  $("#signin").onclick = async () => {
    const p = new fb.A.GoogleAuthProvider(); p.setCustomParameters({ hd: SCHOOL_DOMAIN, prompt: "select_account" });
    try { await fb.A.signInWithPopup(fb.auth, p); }
    catch (e) { if (!/closed-by-user|cancelled-popup/.test(e.code || "")) showSignIn(e.code === "auth/popup-blocked" ? "Your browser blocked the sign-in window. Allow pop-ups for this site and try again." : "Sign-in didn't work. Try again."); }
  };
}

async function boot() {
  if (DEMO) { students = makeDemo(); $("#demoBanner").hidden = false; $("#who").innerHTML = `<a class="linkbtn" href="dashboard.html">Exit demo</a>`; startApp(); return; }
  if (!configured()) { showGate(`<h2>Almost ready</h2><p>Paste your Firebase config into <code>firebase-config.js</code> (step 6 in SETUP.md). Until then you can <a href="dashboard.html?demo">preview the dashboard with made-up data</a>.</p>`); return; }
  try { fb = await loadFirebase(); } catch (e) { showGate(`<h2>Can't reach the server</h2><p>Check your connection and reload.</p>`); return; }
  fb.A.onAuthStateChanged(fb.auth, async user => {
    if (!user) return showSignIn();
    if (!isTeacherEmail(user.email)) {
      showGate(`<h2>This dashboard is for teachers only</h2><p>You're signed in as ${esc(user.email)}.</p>
        <div class="row"><a class="btn primary" href="index.html">Go to the student site</a><button class="btn" id="out">Sign out</button></div>`);
      $("#out").onclick = () => fb.A.signOut(fb.auth); return;
    }
    $("#who").innerHTML = `<span><b>${esc(user.displayName || user.email)}</b></span><button class="linkbtn" id="signout">Sign out</button>`;
    $("#signout").onclick = () => fb.A.signOut(fb.auth);
    await load();
  });
}

async function load() {
  showGate(`<p class="muted">Loading student progress…</p>`);
  try {
    const snap = await fb.F.getDocs(fb.F.collection(fb.db, "users"));
    students = snap.docs.map(d => norm(d.data())).filter(s => !isTeacherEmail(s.email));
    startApp();
  } catch (e) {
    console.error(e);
    showGate(`<h2>Couldn't load student data</h2><p>${e.code === "permission-denied" ? "The database refused access. Make sure the security rules from firestore.rules are published in Firebase console → Firestore Database → Rules (step 4 in SETUP.md) and that your email is in the teacher list." : "Check your connection and try Refresh."}</p><button class="btn" id="retry">Try again</button>`);
    $("#retry").onclick = load;
  }
}

let wired = false;
function startApp() {
  gate.hidden = true; $("#app").hidden = false;
  if (!wired) {
    wired = true;
    $("#periods").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (!b) return; period = b.dataset.p; selUid = null; render(); });
    document.querySelector("nav.modes").addEventListener("click", e => { const b = e.target.closest("[data-view]"); if (!b) return; view = b.dataset.view; selUid = null; render(); });
    $("#refresh").onclick = () => DEMO ? render() : load();
    $("#csv").onclick = downloadCSV;
  }
  render();
}

/* ---------- render ---------- */
function render() {
  const counts = {}; students.forEach(s => counts[s.period] = (counts[s.period] || 0) + 1);
  $("#periods").innerHTML = [["all", `All periods (${students.length})`], ...[1, 2, 3, 4, 5, 6, 7].map(p => [String(p), `P${p} (${counts[p] || 0})`])]
    .map(([v, l]) => `<button class="chip" data-p="${v}" aria-pressed="${period === v}">${l}</button>`).join("");
  document.querySelectorAll("nav.modes button").forEach(b => b.setAttribute("aria-selected", b.dataset.view === view));
  if (selUid) return renderStudent(students.find(s => s.uid === selUid));
  view === "class" ? renderClass() : renderStudents();
}

function bar(label, c, a, extra = "") {
  const p = pct(c, a);
  return `<div class="barrow"><span class="lbl">${esc(label)}</span><div class="track" role="img" aria-label="${esc(label)}: ${p == null ? "no answers" : p + "% correct"}"><i class="lv-${lvl(p)}" style="width:${p ?? 0}%"></i></div>
    <span class="val">${p == null ? "No answers yet" : `<b>${p}%</b> of ${a} ${extra}`}</span></div>`;
}

function renderClass() {
  const list = filtered();
  if (!list.length) { main.innerHTML = `<div class="panel empty">No students ${period === "all" ? "have signed in yet" : "in Period " + period + " yet"}. They'll show up here after they sign in and pick their period.</div>`; return; }
  const tot = list.reduce((t, s) => { const u = sumUnits(s); return { a: t.a + u.a, c: t.c + u.c }; }, { a: 0, c: 0 });
  const active = list.filter(s => daysAgo(s.lastActive) <= 7).length;
  const avgKnown = Math.round(list.reduce((t, s) => t + s.known.length, 0) / list.length);
  const need = list.filter(s => status(s).cls === "bad").length;

  const terms = TERMS.map(t => {
    let a = 0, c = 0; const strug = [], gotItMissed = [];
    list.forEach(s => { const x = s.stats[t.id]; if (!x) return; a += x.a || 0; c += x.c || 0; if ((x.a || 0) >= MIN_TERM && (x.c || 0) / x.a < LOW) { strug.push(s); if (s.known.includes(t.id)) gotItMissed.push(s); } });
    return { t, a, c, p: pct(c, a), strug, gotItMissed };
  });
  const rated = terms.filter(x => x.a >= MIN_CLASS_TERM);
  const hard = [...rated].sort((x, y) => x.p - y.p || y.a - x.a).filter(x => x.p < HIGH * 100).slice(0, 12);
  const easy = [...rated].sort((x, y) => y.p - x.p || y.a - x.a).filter(x => x.p >= HIGH * 100).slice(0, 10);
  const untouched = terms.filter(x => x.a === 0);
  const names = arr => arr.length ? arr.slice(0, 3).map(s => esc(s.name.split(" ")[0] + " " + (s.name.split(" ")[1] || "").charAt(0))).join(", ") + (arr.length > 3 ? ` +${arr.length - 3}` : "") : "—";
  const needList = list.filter(s => status(s).cls === "bad").sort((a, b) => pct(sumUnits(a).c, sumUnits(a).a) - pct(sumUnits(b).c, sumUnits(b).a));

  main.innerHTML = `
    <div class="tiles">
      <div class="stat"><b>${list.length}</b><span>students signed up</span></div>
      <div class="stat"><b>${active}</b><span>practiced in the last 7 days</span></div>
      <div class="stat"><b>${pct(tot.c, tot.a) ?? "—"}${tot.a ? "%" : ""}</b><span>answers correct (${tot.a} answers)</span></div>
      <div class="stat"><b>${avgKnown}<small style="font-size:16px">/${TERMS.length}</small></b><span>terms marked “Got it” (average)</span></div>
      <div class="stat"><b>${need}</b><span>students below 60%</span></div>
    </div>

    <div class="section">
      <h2>Accuracy by topic</h2>
      <p class="sub">Quiz, match and fill-in answers for ${period === "all" ? "all periods" : "Period " + period}.</p>
      <div class="bars">${UNITS.map(u => { let a = 0, c = 0; list.forEach(s => { const x = s.units[u.id]; if (x) { a += x.a || 0; c += x.c || 0; } }); return bar(u.name, c, a, "answers"); }).join("")}</div>
    </div>

    <div class="section">
      <h2>Terms the class struggles with</h2>
      <p class="sub">Lowest accuracy first. Shows terms with at least ${MIN_CLASS_TERM} answers and below 80% correct.</p>
      ${hard.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>Term</th><th>Topic</th><th>Correct</th><th>Answers</th><th>Students struggling</th><th>Said “Got it” but missing it</th></tr></thead><tbody>
        ${hard.map(x => `<tr><td><b>${esc(x.t.t)}</b></td><td>${esc(unitName(x.t.u))}</td><td><span class="pill ${lvl(x.p)}">${x.p}%</span></td><td>${x.a}</td><td>${x.strug.length} <span class="muted small">${names(x.strug)}</span></td><td>${x.gotItMissed.length || "—"}</td></tr>`).join("")}
      </tbody></table></div>` : `<div class="panel empty">No trouble spots yet. Terms appear here once students have answered them a few times.</div>`}
    </div>

    <div class="two">
      <div class="section">
        <h2>What the class knows</h2>
        <p class="sub">80% or more correct.</p>
        ${easy.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>Term</th><th>Correct</th><th>Answers</th></tr></thead><tbody>
          ${easy.map(x => `<tr><td><b>${esc(x.t.t)}</b> <span class="muted small">${esc(unitName(x.t.u))}</span></td><td><span class="pill good">${x.p}%</span></td><td>${x.a}</td></tr>`).join("")}</tbody></table></div>` : `<div class="panel empty">None yet.</div>`}
      </div>
      <div class="section">
        <h2>Students who need support</h2>
        <p class="sub">Below 60% correct, with at least 5 answers.</p>
        ${needList.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>Student</th><th>Period</th><th>Correct</th><th>Weakest topic</th></tr></thead><tbody>
          ${needList.map(s => { const t = sumUnits(s), w = weakestUnit(s); return `<tr class="click" tabindex="0" data-uid="${s.uid}"><td><b>${esc(s.name)}</b></td><td>${s.period}</td><td><span class="pill bad">${pct(t.c, t.a)}%</span></td><td>${w ? esc(unitName(w.id)) + ` (${w.p}%)` : "—"}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="panel empty">No one is below 60% right now.</div>`}
      </div>
    </div>

    <div class="section">
      <h2>Not practiced yet</h2>
      <p class="sub">${untouched.length ? `${untouched.length} of ${TERMS.length} terms have no quiz or match answers from this group.` : "Every term has been practiced at least once."}</p>
      ${untouched.length ? `<div class="chiplist">${untouched.map(x => `<span>${esc(x.t.t)}</span>`).join("")}</div>` : ""}
    </div>`;
  wireRows();
}

function renderStudents() {
  const list = filtered().map(s => ({ s, t: sumUnits(s), st: status(s), w: weakestUnit(s) }));
  const sorters = {
    period: (a, b) => a.s.period - b.s.period || a.s.name.localeCompare(b.s.name),
    name: (a, b) => a.s.name.localeCompare(b.s.name),
    low: (a, b) => (pct(a.t.c, a.t.a) ?? 101) - (pct(b.t.c, b.t.a) ?? 101),
    recent: (a, b) => (b.s.lastActive?.getTime() || 0) - (a.s.lastActive?.getTime() || 0),
    inactive: (a, b) => (a.s.lastActive?.getTime() || 0) - (b.s.lastActive?.getTime() || 0)
  };
  list.sort(sorters[sortBy]);
  main.innerHTML = `
    <div class="row spread" style="margin-bottom:12px">
      <span class="muted small">${list.length} student${list.length === 1 ? "" : "s"}. Select a student to see their details.</span>
      <label class="small">Sort by <select class="sel" id="sort">
        ${[["period", "Period, then name"], ["name", "Name"], ["low", "Lowest accuracy first"], ["recent", "Most recently active"], ["inactive", "Least recently active"]].map(([v, l]) => `<option value="${v}" ${sortBy === v ? "selected" : ""}>${l}</option>`).join("")}
      </select></label>
    </div>
    ${list.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>Student</th><th>Period</th><th>Last active</th><th>Got it</th><th>Correct</th><th>Answers</th><th>Weakest topic</th><th>Status</th></tr></thead><tbody>
      ${list.map(({ s, t, st, w }) => `<tr class="click" tabindex="0" data-uid="${s.uid}"><td><b>${esc(s.name)}</b><br><span class="muted small">${esc(s.email)}</span></td><td>${s.period}</td><td>${fmtDate(s.lastActive)}</td><td>${s.known.length}/${TERMS.length}</td><td>${t.a ? `${pct(t.c, t.a)}%` : "—"}</td><td>${t.a}</td><td>${w ? esc(unitName(w.id)) : "—"}</td><td><span class="pill ${st.cls}">${st.label}</span></td></tr>`).join("")}
    </tbody></table></div>` : `<div class="panel empty">No students here yet.</div>`}`;
  $("#sort").onchange = e => { sortBy = e.target.value; renderStudents(); };
  wireRows();
}

function wireRows() {
  main.querySelectorAll("tr.click").forEach(r => {
    const open = () => { selUid = r.dataset.uid; render(); window.scrollTo({ top: 0 }); };
    r.onclick = open; r.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
  });
}

async function renderStudent(s) {
  if (!s) { selUid = null; return render(); }
  const t = sumUnits(s), st = status(s), rows = termRows(s);
  const strug = rows.filter(r => r.a >= MIN_TERM && r.p < LOW * 100).sort((a, b) => a.p - b.p || b.a - a.a);
  const mismatch = strug.filter(r => s.known.includes(r.t.id));
  const strong = rows.filter(r => r.a >= MIN_TERM && r.p >= HIGH * 100).sort((a, b) => b.p - a.p || b.a - a.a);
  const untouched = rows.filter(r => r.a === 0);
  main.innerHTML = `
    <button class="btn small" id="back">← Back to ${view === "class" ? "class summary" : "all students"}</button>
    <div class="row spread" style="margin:16px 0 14px;align-items:flex-end">
      <div><h2 style="font-family:var(--display);font-size:28px;margin:0">${esc(s.name)}</h2><span class="muted">${esc(s.email)}</span></div>
      <label class="small">Period <select class="sel" id="per">${[1, 2, 3, 4, 5, 6, 7].map(p => `<option ${p === s.period ? "selected" : ""}>${p}</option>`).join("")}</select></label>
    </div>
    <div class="tiles">
      <div class="stat"><b>${t.a ? pct(t.c, t.a) + "%" : "—"}</b><span>answers correct</span></div>
      <div class="stat"><b>${t.a}</b><span>quiz, match and fill-in answers</span></div>
      <div class="stat"><b>${s.known.length}<small style="font-size:16px">/${TERMS.length}</small></b><span>terms marked “Got it”</span></div>
      <div class="stat"><b style="font-size:18px;line-height:1.5">${fmtDate(s.lastActive)}</b><span>last active</span></div>
      <div class="stat"><b style="font-size:18px;line-height:1.5"><span class="pill ${st.cls}" style="font-size:15px">${st.label}</span></b><span>overall</span></div>
    </div>
    <div class="section"><h2>Accuracy by topic</h2><div class="bars">${UNITS.map(u => { const x = s.units[u.id] || {}; return bar(u.name, x.c || 0, x.a || 0, "answers"); }).join("")}</div></div>
    <div class="two">
      <div class="section"><h2>Struggling with</h2><p class="sub">Below 60% correct, at least ${MIN_TERM} answers.</p>
        ${strug.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>Term</th><th>Correct</th><th>Answers</th></tr></thead><tbody>${strug.map(r => `<tr><td><b>${esc(r.t.t)}</b> <span class="muted small">${esc(unitName(r.t.u))}</span>${s.known.includes(r.t.id) ? ` <span class="pill mid">said “Got it”</span>` : ""}</td><td><span class="pill bad">${r.p}%</span></td><td>${r.a}</td></tr>`).join("")}</tbody></table></div>` : `<div class="panel empty">Nothing yet.</div>`}
        ${mismatch.length ? `<p class="small" style="margin-top:8px"><b>${mismatch.length}</b> of these ${mismatch.length === 1 ? "is a term" : "are terms"} the student marked “Got it” on flashcards but keeps missing.</p>` : ""}
      </div>
      <div class="section"><h2>Knows well</h2><p class="sub">80% or more correct, at least ${MIN_TERM} answers.</p>
        ${strong.length ? `<div class="chiplist">${strong.map(r => `<span>${esc(r.t.t)} · ${r.p}%</span>`).join("")}</div>` : `<div class="panel empty">Nothing yet.</div>`}
      </div>
    </div>
    <div class="section"><h2>Not practiced yet</h2><p class="sub">${untouched.length} of ${TERMS.length} terms have no quiz or match answers.</p>
      ${untouched.length ? `<div class="chiplist">${untouched.map(r => `<span>${esc(r.t.t)}</span>`).join("")}</div>` : ""}</div>
    <div class="section"><h2>Recent answers</h2><div id="recent"><p class="muted">Loading…</p></div></div>`;
  $("#back").onclick = () => { selUid = null; render(); };
  $("#per").onchange = async e => {
    const p = +e.target.value;
    if (DEMO) { s.period = p; return render(); }
    try { await fb.F.updateDoc(fb.F.doc(fb.db, "users", s.uid), { period: p }); s.period = p; render(); }
    catch (err) { alertLine("The period change didn't save. Try again."); e.target.value = s.period; }
  };
  loadRecent(s);
}

function alertLine(msg) { const el = document.createElement("div"); el.className = "notice"; el.textContent = msg; main.prepend(el); setTimeout(() => el.remove(), 5000); }

async function loadRecent(s) {
  const box = $("#recent");
  if (DEMO) { box.innerHTML = `<p class="muted">Recent answers appear here with real student data.</p>`; return; }
  try {
    const F = fb.F;
    const snap = await F.getDocs(F.query(F.collection(fb.db, "responses"), F.where("uid", "==", s.uid), F.limit(500)));
    const rows = snap.docs.map(d => d.data()).filter(r => r.mode !== "cards")
      .sort((a, b) => (b.ts?.toMillis?.() || 0) - (a.ts?.toMillis?.() || 0)).slice(0, 30);
    if (!document.body.contains(box)) return;
    const modeName = { quiz: "Quiz", match: "Match", fill: "Fill-in" };
    box.innerHTML = rows.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>When</th><th>Activity</th><th>Item</th><th>Result</th></tr></thead><tbody>
      ${rows.map(r => {
        let item = r.termId ? esc(TERM[r.termId]?.t || r.termId) : "";
        if (r.mode === "fill") { const n = NOTE[r.detail?.noteId]; item = n ? esc(n.s.replace(/\[([^\]]+)\]/g, "___")) : esc(unitName(r.unit)); }
        let res = r.correct ? `<span class="pill good">Correct</span>` : `<span class="pill bad">Missed</span>`;
        if (r.mode === "quiz" && !r.correct && r.detail?.picked) res += ` <span class="muted small">chose ${esc(TERM[r.detail.picked]?.t || "")}</span>`;
        if (r.mode === "match" && !r.correct && r.detail?.pickedDef) res += ` <span class="muted small">matched it to the definition of ${esc(TERM[r.detail.pickedDef]?.t || "")}</span>`;
        if (r.mode === "fill" && r.detail?.revealed) res += ` <span class="muted small">showed answers</span>`;
        if (r.mode === "fill" && r.detail?.wrong?.length) res += ` <span class="muted small">${r.detail.wrong.map(w => `wrote “${esc(w.typed || "blank")}” for ${esc(w.want)}`).join("; ")}</span>`;
        return `<tr><td>${fmtDate(r.ts?.toDate?.())}</td><td>${modeName[r.mode] || r.mode}</td><td>${item}</td><td>${res}</td></tr>`;
      }).join("")}</tbody></table></div>` : `<p class="muted">No answers yet.</p>`;
  } catch (e) { console.error(e); box.innerHTML = `<p class="muted">Couldn't load recent answers.</p>`; }
}

/* ---------- CSV ---------- */
function downloadCSV() {
  const list = filtered();
  const head = ["Name", "Email", "Period", "Last active", "Got it (of " + TERMS.length + ")", "Answers", "Correct %", "Status", "Weakest topic", ...UNITS.map(u => u.name + " %"), "Struggling terms"];
  const lines = [head];
  list.forEach(s => {
    const t = sumUnits(s), w = weakestUnit(s);
    const strug = termRows(s).filter(r => r.a >= MIN_TERM && r.p < LOW * 100).map(r => r.t.t).join("; ");
    lines.push([s.name, s.email, s.period, s.lastActive ? s.lastActive.toISOString() : "", s.known.length, t.a, pct(t.c, t.a) ?? "", status(s).label, w ? unitName(w.id) : "",
      ...UNITS.map(u => { const x = s.units[u.id]; return x ? pct(x.c || 0, x.a) ?? "" : ""; }), strug]);
  });
  const csv = lines.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
  a.download = `lions-vocab-${period === "all" ? "all-periods" : "period-" + period}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- demo data (preview only) ---------- */
function makeDemo() {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const first = ["Ava", "Liam", "Noah", "Emma", "Mia", "Eli", "Zoe", "Owen", "Lily", "Jack", "Ruby", "Leo", "Nora", "Cole", "Ivy", "Max", "Ella", "Sam", "Gia", "Ben", "Kai", "Luna", "Finn", "Rose"];
  const last = ["Demo", "Sample", "Example", "Test"];
  const hardness = Object.fromEntries(TERMS.map(t => [t.id, rnd() * 0.5 + (["macro", "enz", "gen"].includes(t.u) ? 0.25 : 0)]));
  return first.map((f, i) => {
    const skill = 0.35 + rnd() * 0.6, stats = {}, units = {}, known = [];
    TERMS.forEach(t => {
      if (rnd() < 0.35) return;
      const a = 1 + Math.floor(rnd() * 5); let c = 0;
      for (let k = 0; k < a; k++) if (rnd() < Math.min(0.97, skill + 0.4 - hardness[t.id])) c++;
      stats[t.id] = { a, c };
      units[t.u] = units[t.u] || { a: 0, c: 0 }; units[t.u].a += a; units[t.u].c += c;
      if (rnd() < skill) known.push(t.id);
    });
    return norm({ uid: "demo" + i, name: `${f} ${last[i % 4]}`, email: `${f.toLowerCase()}.demo@example.com`, period: 1 + (i % 7),
      lastActive: new Date(Date.now() - rnd() * 12 * 864e5), stats, units, known, counts: {} });
  });
}

boot();
