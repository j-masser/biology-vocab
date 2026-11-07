// STEP 6 of SETUP.md: paste the config for your Firebase web app here (on GitHub, click the pencil icon to edit).
// Firebase console → Project settings (gear icon) → General → Your apps → SDK setup and configuration → Config.
// These values are not secret; the security rules in firestore.rules protect the data.
export const firebaseConfig = {
  apiKey: "PASTE_API_KEY_HERE",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

// Only Google accounts from this domain can sign in.
export const SCHOOL_DOMAIN = "pequeavalley.net";

// Teachers who can open dashboard.html.
// If you change this list, change the same list in the Firestore Rules tab (Firebase console) and click Publish.
export const TEACHER_EMAILS = [
  "jennifer_masser@pequeavalley.net",
  "amanda_wolfgang@pequeavalley.net"
];
