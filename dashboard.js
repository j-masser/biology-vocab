// Biology Vocab teacher dashboard. Tracks the three study-path steps separately:
// Flashcards (self-reported "Got it"), Recognition (quiz + match) and Recall (notes fill-in).
import * as Core from "./core.js";
import { RECOG_GOAL, RECALL_GOAL, INTERVALS, LONG_TERM_BOX, dayNum, isOpen, opensLabel, boxOf, dueDay, loadData, dataErrorHTML, problemsHTML } from "./core.js";
import { loadFirebase, configured, isTeacherEmail, SCHOOL_DOMAIN, GOOGLE_ICON } from "./fb.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const unitName = id => (UNITS.find(u => u.id === id) || {}).name || id;
// Filled in by boot() from data.js (loaded fresh every time, see core.js).
let SETS = [], UNITS = [], TERMS = [], NOTES = [], TERM = {}, NOTE = {}, dataProblems = [];
const blanked = n => n.s.replace(/\[([^\]]+)\]/g, "___");
const gate = $("#gate"), main = $("#main");
const DEMO = new URLSearchParams(location.search).has("demo");

// Thresholds
const MIN_ITEM = 2;          // a student's answers on one term before we judge it
const MIN_CLASS_ITEM = 3;    // class-wide answers before a term or sentence shows in class lists
const MIN_STAGE = 5;         // answers in a step before a student gets a status for it
const LOW = 60, HIGH = 80;   // percent: below 60 = needs support, 80+ = strong

let fb = null, students = [], period = "all", scope = "all", view = "class", selUid = null, sortBy = "period";

/* ---------- scope + per-student numbers ---------- */
// Only lessons that have opened (no "start" date, or a start date that has passed) count on the dashboard.
const scopeUnits = () => UNITS.filter(u => isOpen(u) && (scope === "all" || u.set === scope));
const scopeIds = () => new Set(scopeUnits().map(u => u.id));
const scopeTerms = () => { const ids = scopeIds(); return TERMS.filter(t => ids.has(t.u)); };
const scopeNotes = () => { const ids = scopeIds(); return NOTES.filter(n => ids.has(n.u)); };
const scopeName = () => scope === "all" ? "all units" : (SETS.find(x => x.id === scope) || {}).name;
const filtered = () => period === "all" ? students : students.filter(s => s.period === +period);

const pct = (c, a) => a ? Math.round(c / a * 100) : null;
const lvl = p => p == null ? "none" : p < LOW ? "bad" : p < HIGH ? "mid" : "good";
const sumOver = (map) => scopeUnits().reduce((t, u) => { const x = map[u.id] || {}; return { a: t.a + (x.a || 0), c: t.c + (x.c || 0) }; }, { a: 0, c: 0 });

function metrics(s) {
  const terms = scopeTerms(), notes = scopeNotes();
  const rec = sumOver(s.recogUnits), rcl = sumOver(s.recallUnits), t = dayNum();
  const recItems = terms.map(x => s.stats[x.id]), rclItems = notes.map(n => s.recall[n.id]);
  const isDue = st => { const d = dueDay(st); return d != null && d <= t; };
  const isLate = st => { const d = dueDay(st); return d != null && d <= t - 3; };
  const boxes = items => [1, 2, 3, 4, 5].map(b => items.filter(st => boxOf(st) === b).length);
  const both = [...recItems, ...rclItems];
  return {
    due: both.filter(isDue).length, late: both.filter(isLate).length,
    longTerm: recItems.filter(st => boxOf(st) >= LONG_TERM_BOX).length,
    reviewedWeek: both.filter(st => st && st.l != null && st.l >= t - 6).length,
    started: both.some(st => st && st.a),
    recBoxes: boxes(recItems), rclBoxes: boxes(rclItems),
    got: terms.filter(t => s.known.includes(t.id)).length,
    recognized: terms.filter(t => (s.stats[t.id]?.s || 0) >= RECOG_GOAL).length,
    recalled: notes.filter(n => (s.recall[n.id]?.s || 0) >= RECALL_GOAL).length,
    rec, rcl, recP: pct(rec.c, rec.a), rclP: pct(rcl.c, rcl.a),
    nTerms: terms.length, nNotes: notes.length
  };
}
function stagePill(p, a) {
  if (a < MIN_STAGE) return `<span class="pill none">${a ? p + "%" : "—"}</span>`;
  return `<span class="pill ${lvl(p)}">${p}%</span>`;
}
const needsSupport = m => (m.rec.a >= MIN_STAGE && m.recP < LOW) || (m.rcl.a >= MIN_STAGE && m.rclP < LOW);
function weakestUnit(s) {
  let w = null;
  for (const u of scopeUnits()) {
    const a = (s.recogUnits[u.id]?.a || 0) + (s.recallUnits[u.id]?.a || 0), c = (s.recogUnits[u.id]?.c || 0) + (s.recallUnits[u.id]?.c || 0);
    if (a < 3) continue; const p = pct(c, a); if (!w || p < w.p) w = { id: u.id, p };
  }
  return w;
}
const fmtDate = d => d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "Never";
const daysAgo = d => d ? (Date.now() - d.getTime()) / 864e5 : Infinity;

function norm(d) {
  return {
    uid: d.uid, name: d.name || d.email || "Unknown", email: d.email || "", period: d.period,
    lastActive: d.lastActive && d.lastActive.toDate ? d.lastActive.toDate() : (d.lastActive instanceof Date ? d.lastActive : null),
    known: d.known || [], stats: d.stats || {}, recall: d.recall || {},
    recogUnits: d.recogUnits || {}, recallUnits: d.recallUnits || {}
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
  const data = await loadData();
  if (!data.ok) { showGate(dataErrorHTML(data.error)); return; }
  ({ SETS, UNITS, TERMS, NOTES } = Core);
  TERM = Object.fromEntries(TERMS.map(t => [t.id, t])); NOTE = Object.fromEntries(NOTES.map(n => [n.id, n]));
  dataProblems = data.problems;
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
    $("#scopes").addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (!b || b.disabled) return; scope = b.dataset.s; render(); });
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
  const openSets = SETS.filter(x => UNITS.some(u => u.set === x.id && isOpen(u)));
  if (scope !== "all" && !openSets.some(x => x.id === scope)) scope = "all";
  $("#scopes").innerHTML = [["all", "All units"], ...SETS.map(x => [x.id, x.name])]
    .map(([v, l]) => { const ok = v === "all" || openSets.some(x => x.id === v);
      return `<button class="chip${v === "all" ? "" : " half"}${ok ? "" : " soon"}" data-s="${v}" aria-pressed="${scope === v}" ${ok ? "" : `disabled title="No lessons have opened yet"`}>${esc(l)}${ok ? "" : " <small>Soon</small>"}</button>`; }).join("");
  document.querySelectorAll("nav.modes button").forEach(b => b.setAttribute("aria-selected", b.dataset.view === view));
  if (selUid) return renderStudent(students.find(s => s.uid === selUid));
  view === "class" ? renderClass() : renderStudents();
}

const track = (p, label) => `<div class="track" role="img" aria-label="${esc(label)}: ${p == null ? "no answers" : p + "%"}"><i class="lv-${lvl(p)}" style="width:${p ?? 0}%"></i></div>`;
function pathCards(got, nT, recog, rcl, nN, rec, rclAcc, avg) {
  const card = (n, name, what, count, total, cls, acc) => `<div class="pathcard">
      <span class="stepnum">Step ${n}</span><h3>${name}</h3>
      <div class="pc-big"><b>${count}</b><span>/${total} ${what}${avg ? " (average)" : ""}</span></div>
      <div class="mbar dark"><i class="${cls}" style="width:${total ? Math.min(100, count / total * 100) : 0}%"></i></div>
      <p>${acc}</p></div>`;
  return `<div class="path">
    ${card(1, "Flashcards", "marked “Got it”", got, nT, "m1", "Self-check. Students decide this themselves.")}
    ${card(2, "Recognition", "terms recognized", recog, nT, "m2", rec.a ? `<b>${pct(rec.c, rec.a)}%</b> correct on ${rec.a} quiz and match answers` : "No quiz or match answers yet")}
    ${card(3, "Recall", "sentences recalled", rcl, nN, "m3", rclAcc.a ? `<b>${pct(rclAcc.c, rclAcc.a)}%</b> correct on ${rclAcc.a} fill-in sentences` : "No fill-in answers yet")}
  </div>`;
}
const BOX_COLORS = ["lv-bad", "lv-mid", "bx3", "bx4", "lv-good"];
function boxBar(label, counts, total, what) {
  const notStarted = Math.max(0, total - counts.reduce((a, b) => a + b, 0));
  const seg = (n, cls, name) => n ? `<i class="${cls}" style="width:${n / total * 100}%" title="${name}: ${n}"></i>` : "";
  return `<div class="boxrow"><span class="lbl">${label}</span>
    <div class="stack" role="img" aria-label="${label}: ${counts.map((n, k) => `box ${k + 1}: ${n}`).join(", ")}, not started: ${notStarted}">${counts.map((n, k) => seg(n, BOX_COLORS[k], `Box ${k + 1}`)).join("")}${seg(notStarted, "ns", "Not started")}</div>
    <span class="val">${total} ${what}</span></div>`;
}
const boxLegend = () => `<div class="legend">${[1, 2, 3, 4, 5].map(b => `<span><i class="${BOX_COLORS[b - 1]}"></i>Box ${b} · every ${INTERVALS[b]} day${b > 1 ? "s" : ""}</span>`).join("")}<span><i class="ns"></i>Not started</span></div>`;

function topicTable(getRec, getRcl) {
  return `<div class="tablewrap"><table class="data topics"><thead><tr><th>Topic</th><th>Recognition (quiz + match)</th><th>Recall (fill-in)</th></tr></thead><tbody>
    ${scopeUnits().map(u => { const r = getRec(u.id), c = getRcl(u.id), rp = pct(r.c, r.a), cp = pct(c.c, c.a);
      return `<tr><td><b>${esc(u.name)}</b></td>
        <td><div class="tcell">${track(rp, u.name + " recognition")}<span>${rp == null ? "—" : `<b>${rp}%</b> of ${r.a}`}</span></div></td>
        <td><div class="tcell">${track(cp, u.name + " recall")}<span>${cp == null ? "—" : `<b>${cp}%</b> of ${c.a}`}</span></div></td></tr>`; }).join("")}
  </tbody></table></div>`;
}

function renderClass() {
  const list = filtered();
  if (!list.length) { main.innerHTML = `<div class="panel empty">No students ${period === "all" ? "have signed in yet" : "in Period " + period + " yet"}. They'll show up here after they sign in and pick their period.</div>`; return; }
  const ms = list.map(s => ({ s, m: metrics(s) }));
  const avg = k => Math.round(ms.reduce((t, x) => t + x.m[k], 0) / ms.length);
  const sum = k => ms.reduce((t, x) => ({ a: t.a + x.m[k].a, c: t.c + x.m[k].c }), { a: 0, c: 0 });
  const active = list.filter(s => daysAgo(s.lastActive) <= 7).length;
  const T = scopeTerms(), N = scopeNotes();
  const short = s => esc(s.name.split(" ")[0] + " " + (s.name.split(" ")[1] || "").charAt(0));
  const names = arr => arr.length ? arr.slice(0, 3).map(short).join(", ") + (arr.length > 3 ? ` +${arr.length - 3}` : "") : "—";

  const terms = T.map(t => {
    let a = 0, c = 0; const strug = [], gotMiss = [];
    list.forEach(s => { const x = s.stats[t.id]; if (!x) return; a += x.a || 0; c += x.c || 0; if ((x.a || 0) >= MIN_ITEM && (x.c || 0) / x.a < LOW / 100) { strug.push(s); if (s.known.includes(t.id)) gotMiss.push(s); } });
    return { t, a, c, p: pct(c, a), strug, gotMiss };
  });
  const rated = terms.filter(x => x.a >= MIN_CLASS_ITEM);
  const hard = [...rated].filter(x => x.p < HIGH).sort((x, y) => x.p - y.p || y.a - x.a).slice(0, 12);
  const easy = [...rated].filter(x => x.p >= HIGH).sort((x, y) => y.p - x.p || y.a - x.a).slice(0, 10);
  const untouched = terms.filter(x => x.a === 0);
  const sentences = N.map(n => {
    let a = 0, c = 0; const strug = [];
    list.forEach(s => { const x = s.recall[n.id]; if (!x) return; a += x.a || 0; c += x.c || 0; if ((x.a || 0) >= 1 && (x.s || 0) < RECALL_GOAL) strug.push(s); });
    return { n, a, c, p: pct(c, a), strug };
  }).filter(x => x.a >= MIN_CLASS_ITEM && x.p < HIGH).sort((x, y) => x.p - y.p || y.a - x.a).slice(0, 10);
  const needList = ms.filter(x => needsSupport(x.m)).sort((a, b) => Math.min(a.m.recP ?? 101, a.m.rclP ?? 101) - Math.min(b.m.recP ?? 101, b.m.rclP ?? 101));
  const unitSum = key => id => list.reduce((t, s) => { const x = s[key][id] || {}; return { a: t.a + (x.a || 0), c: t.c + (x.c || 0) }; }, { a: 0, c: 0 });

  const started = ms.filter(x => x.m.started);
  const caughtUp = started.filter(x => x.m.due === 0).length, behind = ms.filter(x => x.m.late >= 5);
  const boxSum = k => [0, 1, 2, 3, 4].map(i => ms.reduce((t, x) => t + x.m[k][i], 0));
  const upcoming = UNITS.filter(u => !isOpen(u) && (scope === "all" || u.set === scope));
  const unknown = new Set(); students.forEach(st => { Object.keys(st.stats).forEach(k => { if (!TERM[k]) unknown.add(k); }); Object.keys(st.recall).forEach(k => { if (!NOTE[k]) unknown.add(k); }); });
  main.innerHTML = `
    ${problemsHTML(dataProblems)}
    ${unknown.size ? `<div class="notice">Saved progress includes ${unknown.size} term or sentence id${unknown.size === 1 ? "" : "s"} that ${unknown.size === 1 ? "isn't" : "aren't"} in data.js (${[...unknown].slice(0, 5).map(esc).join(", ")}${unknown.size > 5 ? ", …" : ""}). If an id was renamed, change it back so students keep that progress.</div>` : ""}
    <div class="row small muted" style="gap:18px;margin-bottom:12px"><span><b style="color:var(--ink)">${list.length}</b> students signed up</span><span><b style="color:var(--ink)">${active}</b> practiced in the last 7 days</span><span>Showing ${esc(scopeName())}</span>${upcoming.length ? `<span>Coming up: ${upcoming.map(u => `${esc(u.name)} (${opensLabel(u)})`).join(", ")}</span>` : ""}</div>
    ${pathCards(avg("got"), T.length, avg("recognized"), avg("recalled"), N.length, sum("rec"), sum("rcl"), true)}

    <div class="section"><h2>Daily Review (spaced repetition)</h2>
      <p class="sub">Items come back after 1, 2, 4, 8 and 16 days as students get them right. A miss sends an item back to box 1.</p>
      <div class="tiles">
        <div class="stat"><b>${caughtUp}<small style="font-size:16px">/${started.length}</small></b><span>students caught up (nothing due)</span></div>
        <div class="stat"><b>${avg("due")}</b><span>items due per student (average)</span></div>
        <div class="stat"><b>${behind.length}</b><span>students with 5+ items 3 or more days late</span></div>
        <div class="stat"><b>${avg("longTerm")}<small style="font-size:16px">/${T.length}</small></b><span>terms in long-term memory, box ${LONG_TERM_BOX}+ (average)</span></div>
      </div>
      <div class="bars" style="margin-top:14px">${boxBar("Recognition", boxSum("recBoxes"), T.length * list.length, "student-terms")}${boxBar("Recall", boxSum("rclBoxes"), N.length * list.length, "student-sentences")}</div>
      ${boxLegend()}
      ${behind.length ? `<p class="small" style="margin-top:10px"><b>Falling behind on review:</b> ${behind.sort((a, b) => b.m.late - a.m.late).map(x => `${esc(x.s.name)} (${x.m.late} late)`).join(", ")}</p>` : ""}
    </div>

    <div class="section"><h2>Accuracy by topic</h2><p class="sub">Recognition is choosing the right answer. Recall is writing it from memory.</p>
      ${topicTable(unitSum("recogUnits"), unitSum("recallUnits"))}</div>

    <div class="section">
      <h2>Recognition: terms the class struggles with</h2>
      <p class="sub">Quiz and match answers, lowest accuracy first. Terms with at least ${MIN_CLASS_ITEM} answers and below ${HIGH}% correct.</p>
      ${hard.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>Term</th><th>Topic</th><th>Correct</th><th>Answers</th><th>Students struggling</th><th>Said “Got it” but missing it</th></tr></thead><tbody>
        ${hard.map(x => `<tr><td><b>${esc(x.t.t)}</b></td><td>${esc(unitName(x.t.u))}</td><td><span class="pill ${lvl(x.p)}">${x.p}%</span></td><td>${x.a}</td><td>${x.strug.length} <span class="muted small">${names(x.strug)}</span></td><td>${x.gotMiss.length || "—"}</td></tr>`).join("")}
      </tbody></table></div>` : `<div class="panel empty">No trouble spots yet. Terms appear here once students have answered them a few times.</div>`}
    </div>

    <div class="section">
      <h2>Recall: sentences the class struggles with</h2>
      <p class="sub">Notes fill-in, lowest first-check accuracy first. Sentences with at least ${MIN_CLASS_ITEM} attempts and below ${HIGH}%.</p>
      ${sentences.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>Sentence</th><th>Topic</th><th>Correct</th><th>Attempts</th><th>Not recalled yet</th></tr></thead><tbody>
        ${sentences.map(x => `<tr><td>${esc(blanked(x.n))}</td><td>${esc(unitName(x.n.u))}</td><td><span class="pill ${lvl(x.p)}">${x.p}%</span></td><td>${x.a}</td><td>${x.strug.length} <span class="muted small">${names(x.strug)}</span></td></tr>`).join("")}
      </tbody></table></div>` : `<div class="panel empty">No trouble spots yet. Sentences appear here once students have tried them a few times.</div>`}
    </div>

    <div class="two">
      <div class="section"><h2>What the class recognizes</h2><p class="sub">${HIGH}% or more correct in quiz and match.</p>
        ${easy.length ? `<div class="chiplist">${easy.map(x => `<span>${esc(x.t.t)} · ${x.p}%</span>`).join("")}</div>` : `<div class="panel empty">None yet.</div>`}</div>
      <div class="section"><h2>Students who need support</h2><p class="sub">Below ${LOW}% in recognition or recall, with at least ${MIN_STAGE} answers in that step.</p>
        ${needList.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>Student</th><th>Period</th><th>Recognition</th><th>Recall</th></tr></thead><tbody>
          ${needList.map(({ s, m }) => `<tr class="click" tabindex="0" data-uid="${s.uid}"><td><b>${esc(s.name)}</b></td><td>${s.period}</td><td>${stagePill(m.recP, m.rec.a)}</td><td>${stagePill(m.rclP, m.rcl.a)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="panel empty">No one is below ${LOW}% right now.</div>`}</div>
    </div>

    <div class="section"><h2>Not practiced in Recognition yet</h2>
      <p class="sub">${untouched.length ? `${untouched.length} of ${T.length} terms have no quiz or match answers from this group.` : "Every term has quiz or match answers."}</p>
      ${untouched.length ? `<div class="chiplist">${untouched.map(x => `<span>${esc(x.t.t)}</span>`).join("")}</div>` : ""}</div>`;
  wireRows();
}

function renderStudents() {
  const list = filtered().map(s => ({ s, m: metrics(s), w: weakestUnit(s) }));
  const sorters = {
    period: (a, b) => a.s.period - b.s.period || a.s.name.localeCompare(b.s.name),
    name: (a, b) => a.s.name.localeCompare(b.s.name),
    lowrec: (a, b) => (a.m.recP ?? 101) - (b.m.recP ?? 101),
    lowrcl: (a, b) => (a.m.rclP ?? 101) - (b.m.rclP ?? 101),
    due: (a, b) => b.m.due - a.m.due || b.m.late - a.m.late,
    recent: (a, b) => (b.s.lastActive?.getTime() || 0) - (a.s.lastActive?.getTime() || 0),
    inactive: (a, b) => (a.s.lastActive?.getTime() || 0) - (b.s.lastActive?.getTime() || 0)
  };
  list.sort(sorters[sortBy]);
  main.innerHTML = `
    <div class="row spread" style="margin-bottom:12px">
      <span class="muted small">${list.length} student${list.length === 1 ? "" : "s"} · ${esc(scopeName())}. Select a student to see their details.</span>
      <label class="small">Sort by <select class="sel" id="sort">
        ${[["period", "Period, then name"], ["name", "Name"], ["lowrec", "Lowest recognition first"], ["lowrcl", "Lowest recall first"], ["due", "Most review due first"], ["recent", "Most recently active"], ["inactive", "Least recently active"]].map(([v, l]) => `<option value="${v}" ${sortBy === v ? "selected" : ""}>${l}</option>`).join("")}
      </select></label>
    </div>
    ${list.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>Student</th><th>Period</th><th>Last active</th><th>1 · Got it</th><th>2 · Recognized</th><th>Recognition</th><th>3 · Recalled</th><th>Recall</th><th>Review due</th><th>Weakest topic</th></tr></thead><tbody>
      ${list.map(({ s, m, w }) => `<tr class="click" tabindex="0" data-uid="${s.uid}"><td><b>${esc(s.name)}</b><br><span class="muted small">${esc(s.email)}</span></td><td>${s.period}</td><td>${fmtDate(s.lastActive)}</td>
        <td>${m.got}/${m.nTerms}</td><td>${m.recognized}/${m.nTerms}</td><td>${stagePill(m.recP, m.rec.a)} <span class="muted small">${m.rec.a}</span></td>
        <td>${m.recalled}/${m.nNotes}</td><td>${stagePill(m.rclP, m.rcl.a)} <span class="muted small">${m.rcl.a}</span></td>
        <td>${!m.started ? "—" : m.due ? `${m.due}${m.late ? ` <span class="pill bad">${m.late} late</span>` : ""}` : `<span class="pill good">Caught up</span>`}</td><td>${w ? esc(unitName(w.id)) : "—"}</td></tr>`).join("")}
    </tbody></table></div>
    <p class="small muted">Recognition and Recall show percent correct, then the number of answers. Gray means fewer than ${MIN_STAGE} answers. “Late” counts review items due 3 or more days ago.</p>` : `<div class="panel empty">No students here yet.</div>`}`;
  $("#sort").onchange = e => { sortBy = e.target.value; renderStudents(); };
  wireRows();
}

function wireRows() {
  main.querySelectorAll("tr.click").forEach(r => {
    const open = () => { selUid = r.dataset.uid; render(); window.scrollTo({ top: 0 }); };
    r.onclick = open; r.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
  });
}

function renderStudent(s) {
  if (!s) { selUid = null; return render(); }
  const m = metrics(s);
  const rows = scopeTerms().map(t => { const x = s.stats[t.id] || {}; const a = x.a || 0, c = x.c || 0; return { t, a, c, p: pct(c, a), st: x.s || 0 }; });
  const strug = rows.filter(r => r.a >= MIN_ITEM && r.p < LOW).sort((a, b) => a.p - b.p || b.a - a.a);
  const mismatch = rows.filter(r => s.known.includes(r.t.id) && r.a >= 1 && r.st < RECOG_GOAL && r.p < HIGH);
  const strong = rows.filter(r => r.st >= RECOG_GOAL).sort((a, b) => b.p - a.p);
  const untouched = rows.filter(r => r.a === 0);
  const missed = scopeNotes().map(n => ({ n, x: s.recall[n.id] })).filter(o => o.x && (o.x.a || 0) >= 1 && (o.x.s || 0) < RECALL_GOAL)
    .sort((a, b) => pct(a.x.c || 0, a.x.a) - pct(b.x.c || 0, b.x.a));
  const notTried = scopeNotes().filter(n => !s.recall[n.id]).length;
  main.innerHTML = `
    <button class="btn small" id="back">← Back to ${view === "class" ? "class summary" : "all students"}</button>
    <div class="row spread" style="margin:16px 0 14px;align-items:flex-end">
      <div><h2 style="font-family:var(--display);font-size:28px;margin:0">${esc(s.name)}</h2><span class="muted">${esc(s.email)} · Last active ${fmtDate(s.lastActive)} · ${esc(scopeName())}</span></div>
      <label class="small">Period <select class="sel" id="per">${[1, 2, 3, 4, 5, 6, 7].map(p => `<option ${p === s.period ? "selected" : ""}>${p}</option>`).join("")}</select></label>
    </div>
    ${pathCards(m.got, m.nTerms, m.recognized, m.recalled, m.nNotes, m.rec, m.rcl, false)}
    <div class="section"><h2>Daily Review (spaced repetition)</h2>
      <div class="tiles">
        <div class="stat"><b>${m.due}</b><span>items due now</span></div>
        <div class="stat"><b>${m.late}</b><span>due 3 or more days ago</span></div>
        <div class="stat"><b>${m.longTerm}<small style="font-size:16px">/${m.nTerms}</small></b><span>terms in long-term memory (box ${LONG_TERM_BOX}+)</span></div>
        <div class="stat"><b>${m.reviewedWeek}</b><span>items practiced in the last 7 days</span></div>
      </div>
      <div class="bars" style="margin-top:14px">${boxBar("Recognition", m.recBoxes, m.nTerms, "terms")}${boxBar("Recall", m.rclBoxes, m.nNotes, "sentences")}</div>
      ${boxLegend()}
    </div>
    <div class="section"><h2>Accuracy by topic</h2>${topicTable(id => s.recogUnits[id] || { a: 0, c: 0 }, id => s.recallUnits[id] || { a: 0, c: 0 })}</div>
    <div class="two">
      <div class="section"><h2>Recognition: struggling with</h2><p class="sub">Below ${LOW}% correct in quiz and match, at least ${MIN_ITEM} answers.</p>
        ${strug.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>Term</th><th>Correct</th><th>Answers</th></tr></thead><tbody>${strug.map(r => `<tr><td><b>${esc(r.t.t)}</b> <span class="muted small">${esc(unitName(r.t.u))}</span>${s.known.includes(r.t.id) ? ` <span class="pill mid">said “Got it”</span>` : ""}</td><td><span class="pill bad">${r.p}%</span></td><td>${r.a}</td></tr>`).join("")}</tbody></table></div>` : `<div class="panel empty">Nothing yet.</div>`}
      </div>
      <div class="section"><h2>Recall: sentences not recalled yet</h2><p class="sub">Tried, but not completed correctly on the first check most recently. ${notTried} sentence${notTried === 1 ? "" : "s"} not tried yet.</p>
        ${missed.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>Sentence</th><th>Correct</th><th>Tries</th></tr></thead><tbody>${missed.map(o => `<tr><td>${esc(blanked(o.n))}</td><td><span class="pill ${lvl(pct(o.x.c || 0, o.x.a))}">${pct(o.x.c || 0, o.x.a)}%</span></td><td>${o.x.a}</td></tr>`).join("")}</tbody></table></div>` : `<div class="panel empty">Nothing yet.</div>`}
      </div>
    </div>
    <div class="section"><h2>Self-check vs. Recognition</h2><p class="sub">Terms marked “Got it” on flashcards that aren't recognized yet. These show where the student is overconfident.</p>
      ${mismatch.length ? `<div class="chiplist">${mismatch.map(r => `<span>${esc(r.t.t)} · ${r.p}% of ${r.a}</span>`).join("")}</div>` : `<div class="panel empty">None. Their “Got it” marks match their quiz and match results so far.</div>`}</div>
    <div class="two">
      <div class="section"><h2>Recognized</h2><p class="sub">${RECOG_GOAL} correct answers in a row.</p>${strong.length ? `<div class="chiplist">${strong.map(r => `<span>${esc(r.t.t)}</span>`).join("")}</div>` : `<div class="panel empty">Nothing yet.</div>`}</div>
      <div class="section"><h2>Not practiced in Recognition yet</h2><p class="sub">${untouched.length} of ${m.nTerms} terms.</p>${untouched.length ? `<div class="chiplist">${untouched.map(r => `<span>${esc(r.t.t)}</span>`).join("")}</div>` : ""}</div>
    </div>
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
    const rows = snap.docs.map(d => d.data()).sort((a, b) => (b.ts?.toMillis?.() || 0) - (a.ts?.toMillis?.() || 0)).slice(0, 40);
    if (!document.body.contains(box)) return;
    const stepName = { cards: "1 · Flashcards", quiz: "2 · Quiz", match: "2 · Match", fill: "3 · Recall" };
    box.innerHTML = rows.length ? `<div class="tablewrap"><table class="data"><thead><tr><th>When</th><th>Step</th><th>Item</th><th>Result</th></tr></thead><tbody>
      ${rows.map(r => {
        let item = r.termId ? esc(TERM[r.termId]?.t || r.termId) : "";
        const nid = r.noteId || r.detail?.noteId;
        if (r.mode === "fill") { const n = NOTE[nid]; item = n ? esc(blanked(n)) : esc(unitName(r.unit)); }
        let res;
        if (r.mode === "cards") res = r.correct ? `<span class="pill good">Got it</span>` : `<span class="pill mid">Still learning</span>`;
        else res = r.correct ? `<span class="pill good">Correct</span>` : `<span class="pill bad">Missed</span>`;
        if (r.mode === "quiz" && !r.correct && r.detail?.picked) res += ` <span class="muted small">chose ${esc(TERM[r.detail.picked]?.t || "")}</span>`;
        if (r.mode === "match" && !r.correct && r.detail?.pickedDef) res += ` <span class="muted small">matched it to the definition of ${esc(TERM[r.detail.pickedDef]?.t || "")}</span>`;
        if (r.mode === "fill" && r.detail?.revealed) res += ` <span class="muted small">showed answers</span>`;
        if (r.mode === "fill" && r.detail?.wrong?.length) res += ` <span class="muted small">${r.detail.wrong.map(w => `wrote “${esc(w.typed || "blank")}” for ${esc(w.want)}`).join("; ")}</span>`;
        if (r.mode === "fill" && r.detail?.usedBank) res += ` <span class="muted small">(used word bank)</span>`;
        const step = r.review ? (r.mode === "fill" ? "Review · Recall" : "Review · Recognition") : (stepName[r.mode] || r.mode);
        return `<tr><td>${fmtDate(r.ts?.toDate?.())}</td><td>${step}</td><td>${item}</td><td>${res}</td></tr>`;
      }).join("")}</tbody></table></div>` : `<p class="muted">No answers yet.</p>`;
  } catch (e) { console.error(e); box.innerHTML = `<p class="muted">Couldn't load recent answers.</p>`; }
}

/* ---------- CSV ---------- */
function downloadCSV() {
  const list = filtered(), U = scopeUnits();
  const head = ["Name", "Email", "Period", "Last active", "Got it", "Recognized", "Recognition answers", "Recognition %", "Recalled", "Recall answers", "Recall %", "Review due now", "Review late (3+ days)", "Long-term terms (box 4+)", "Items practiced last 7 days", "Weakest topic",
    ...U.flatMap(u => [u.name + " recognition %", u.name + " recall %"]), "Recognition: struggling terms", "Recall: sentences not recalled"];
  const lines = [head];
  list.forEach(s => {
    const m = metrics(s), w = weakestUnit(s);
    const strug = scopeTerms().filter(t => { const x = s.stats[t.id]; return x && (x.a || 0) >= MIN_ITEM && pct(x.c || 0, x.a) < LOW; }).map(t => t.t).join("; ");
    const missed = scopeNotes().filter(n => { const x = s.recall[n.id]; return x && (x.a || 0) >= 1 && (x.s || 0) < RECALL_GOAL; }).length;
    lines.push([s.name, s.email, s.period, s.lastActive ? s.lastActive.toISOString() : "", `${m.got}/${m.nTerms}`, `${m.recognized}/${m.nTerms}`, m.rec.a, m.recP ?? "", `${m.recalled}/${m.nNotes}`, m.rcl.a, m.rclP ?? "", m.due, m.late, m.longTerm, m.reviewedWeek, w ? unitName(w.id) : "",
      ...U.flatMap(u => [pct(s.recogUnits[u.id]?.c || 0, s.recogUnits[u.id]?.a || 0) ?? "", pct(s.recallUnits[u.id]?.c || 0, s.recallUnits[u.id]?.a || 0) ?? ""]), strug, missed]);
  });
  const csv = lines.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
  a.download = `biology-vocab-${scope === "all" ? "all-terms" : scope}-${period === "all" ? "all-periods" : "period-" + period}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- demo data (preview only) ---------- */
function makeDemo() {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const first = ["Ava", "Liam", "Noah", "Emma", "Mia", "Eli", "Zoe", "Owen", "Lily", "Jack", "Ruby", "Leo", "Nora", "Cole", "Ivy", "Max", "Ella", "Sam", "Gia", "Ben", "Kai", "Luna", "Finn", "Rose"];
  const last = ["Demo", "Sample", "Example", "Test"];
  const hard = Object.fromEntries(TERMS.map(t => [t.id, rnd() * 0.5 + (["macro", "enz", "gen"].includes(t.u) ? 0.25 : 0)]));
  const hardN = Object.fromEntries(NOTES.map(n => [n.id, rnd() * 0.5 + 0.15]));
  return first.map((f, i) => {
    const skill = 0.35 + rnd() * 0.6, stats = {}, recall = {}, recogUnits = {}, recallUnits = {}, known = [];
    const today = dayNum(), diligent = rnd();
    const demoBox = x => { x.b = Math.min(5, Math.max(1, x.s + (rnd() < skill ? 1 : 0))); x.d = today + Math.floor(rnd() * (INTERVALS[x.b] + 2)) - Math.floor((1 - diligent) * 6 * rnd()); x.l = x.d - INTERVALS[x.b]; };
    const add = (map, u, ok) => { map[u] = map[u] || { a: 0, c: 0 }; map[u].a++; if (ok) map[u].c++; };
    TERMS.forEach(t => {
      if (rnd() < skill * 0.9) known.push(t.id);
      if (rnd() < 0.35) return;
      const x = { a: 0, c: 0, s: 0 }, n = 1 + Math.floor(rnd() * 5);
      for (let k = 0; k < n; k++) { const ok = rnd() < Math.min(0.97, skill + 0.4 - hard[t.id]); x.a++; if (ok) { x.c++; x.s++; } else x.s = 0; add(recogUnits, t.u, ok); }
      demoBox(x); stats[t.id] = x;
    });
    NOTES.forEach(nt => {
      if (rnd() < 0.5) return;
      const x = { a: 0, c: 0, s: 0 }, n = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) { const ok = rnd() < Math.min(0.95, skill + 0.25 - hardN[nt.id]); x.a++; if (ok) { x.c++; x.s++; } else x.s = 0; add(recallUnits, nt.u, ok); }
      demoBox(x); recall[nt.id] = x;
    });
    return norm({ uid: "demo" + i, name: `${f} ${last[i % 4]}`, email: `${f.toLowerCase()}.demo@example.com`, period: 1 + (i % 7),
      lastActive: new Date(Date.now() - rnd() * 12 * 864e5), stats, recall, recogUnits, recallUnits, known });
  });
}

boot();
