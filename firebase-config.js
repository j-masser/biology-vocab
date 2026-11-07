// STEP 6 of SETUP.md: paste the config for your Firebase web app here (on GitHub, click the pencil icon to edit).
// Firebase console → Project settings (gear icon) → General → Your apps → SDK setup and configuration → Config.
// These values are not secret; the security rules in firestore.rules protect the data.
export const firebaseConfig = {
  apiKey: "AIzaSyBhfc9ev6epzebafW_Not4hERzSr44nL_o",
  authDomain: "lionsvocab.firebaseapp.com",
  projectId: "lionsvocab",
  storageBucket: "lionsvocab.firebasestorage.app",
  messagingSenderId: "313546129058",
  appId: "1:313546129058:web:212e94f28974b1d7f7a1fb"
};

// Only Google accounts from this domain can sign in.
export const SCHOOL_DOMAIN = "pequeavalley.net";

// Teachers who can open dashboard.html.
// If you change this list, change the same list in the Firestore Rules tab (Firebase console) and click Publish.
export const TEACHER_EMAILS = [
  "jennifer_masser@pequeavalley.net",
  "amanda_wolfgang@pequeavalley.net"
];
