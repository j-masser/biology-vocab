// Biology Vocab student site: Google sign-in, period picker, and saving progress to Firestore.
import { createCore, loadData, dataErrorHTML, problemsHTML } from "./core.js";
import { loadFirebase, configured, isSchoolEmail, isTeacherEmail, SCHOOL_DOMAIN, GOOGLE_ICON } from "./fb.js";

const $ = s => document.querySelector(s);
const gate = $("#gate");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const firstName = n => (n || "").trim().split(/\s+/)[0] || "there";
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

let fb = null, uref = null, profile = null;

/* ---------- saving to Firestore ---------- */
let chain = Promise.resolve(), pending = 0;
function setSaveState(text, isErr) { const el = $("#savestate"); if (el) { el.textContent = text; el.classList.toggle("err", !!isErr); } }
function queue(fn) {
  pending++; setSaveState("Saving…");
  chain = chain.then(fn).then(() => { pending--; if (!pending) setSaveState("All progress saved"); })
    .catch(e => { pending--; console.error(e); setSaveState("Not saved. Check your connection.", true); });
}
function save(userUpdate, response) {
  if (!profile) return;
  const F = fb.F;
  userUpdate.lastActive = F.serverTimestamp();
  const resp = { uid: profile.uid, period: profile.period, ts: F.serverTimestamp(), termId: null, noteId: null, unit: null, correct: null, detail: null, ...response };
  queue(() => Promise.all([F.updateDoc(uref, userUpdate), F.addDoc(F.collection(fb.db, "responses"), resp)]));
}

const adapter = {
  get: store.get, set: store.set,
  // Step 1: flashcards (self-report)
  saveKnown(term, on) {
    const F = fb.F;
    save({ known: on ? F.arrayUnion(term.id) : F.arrayRemove(term.id), "counts.cards": F.increment(1) },
      { mode: "cards", stage: "metacognition", termId: term.id, unit: term.u, correct: on, detail: { selfReport: on ? "got_it" : "still_learning" } });
  },
  // Step 2: quiz + match
  // item = {a, c, s, b (review box), d (next review day), l (last review day)}
  recordRecognition({ mode, term, correct, item, detail }) {
    const F = fb.F, inc = F.increment(1), id = term.id, u = term.u, review = !!detail?.review;
    const upd = { [review ? "counts.review" : `counts.${mode}`]: inc, [`stats.${id}`]: item, [`recogUnits.${u}.a`]: inc };
    if (correct) upd[`recogUnits.${u}.c`] = inc;
    save(upd, { mode, stage: "recognition", review, termId: id, unit: u, correct, detail });
  },
  // Step 3: notes fill-in
  recordRecall({ note, correct, item, detail }) {
    const F = fb.F, inc = F.increment(1), id = note.id, u = note.u, review = !!detail?.review;
    const upd = { [review ? "counts.review" : "counts.fill"]: inc, [`recall.${id}`]: item, [`recallUnits.${u}.a`]: inc };
    if (correct) upd[`recallUnits.${u}.c`] = inc;
    save(upd, { mode: "fill", stage: "recall", review, noteId: id, unit: u, correct, detail });
  }
};
let core = null;

/* ---------- screens ---------- */
function showGate(html) { gate.innerHTML = html; gate.hidden = false; $("#app").hidden = true; $("#meters").innerHTML = ""; }
function showApp() { gate.hidden = true; $("#app").hidden = false; }

function showSignIn(message) {
  showGate(`
    <h2>Sign in to save your progress</h2>
    <p>Use your <b>@${esc(SCHOOL_DOMAIN)}</b> school Google account. Your flashcards, answers and progress are saved so you can pick up where you left off.</p>
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
  const btn = $("#savePeriod");
  if (btn) btn.onclick = async () => {
    btn.disabled = true; btn.textContent = "Saving…";
    const F = fb.F;
    const data = {
      uid: user.uid, name: user.displayName || user.email, email: user.email, period: picked,
      createdAt: F.serverTimestamp(), lastActive: F.serverTimestamp(),
      known: [], stats: {}, recall: {}, recogUnits: {}, recallUnits: {}, counts: {}
    };
    try { await F.setDoc(uref, data); start(user, data); }
    catch (e) { console.error(e); showPeriodPicker(user, picked, "Your period didn't save. Check your internet connection and try again."); }
  };
}

function renderWho(user) {
  const who = $("#who");
  if (!user || !profile) { who.innerHTML = ""; return; }
  // Row 1: name, teacher link, Sign out (far right). Row 2: save status, always taking the same space.
  who.innerHTML = `<span><b>${esc(profile.name)}</b> · Period ${profile.period}</span>
    ${isTeacherEmail(user.email) ? `<a class="linkbtn" href="dashboard.html">Teacher dashboard</a>` : ""}
    <button class="linkbtn" id="signout">Sign out</button>
    <span class="savestate" id="savestate" aria-live="polite"></span>`;
  $("#signout").onclick = () => fb.A.signOut(fb.auth);
}

/* ---------- auth ---------- */
let dataProblems = [];
async function boot() {
  const data = await loadData();
  if (!data.ok) { showGate(dataErrorHTML(data.error)); return; }
  dataProblems = data.problems;
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
  renderWho(user);
  showApp();
  const teacher = isTeacherEmail(user.email), box = $("#dataProblems");
  if (box) box.innerHTML = teacher ? problemsHTML(dataProblems) : "";
  if (!core) core = createCore(adapter, { preview: teacher });
  core.start({ known: data.known || [], stats: data.stats || {}, recall: data.recall || {} });
  fb.F.updateDoc(uref, { lastActive: fb.F.serverTimestamp() }).catch(() => {});
}

boot();
