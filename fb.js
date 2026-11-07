// Loads Firebase only when needed, so the pages still render if the network is slow.
import { firebaseConfig, SCHOOL_DOMAIN, TEACHER_EMAILS } from "./firebase-config.js";
export { SCHOOL_DOMAIN, TEACHER_EMAILS };

const BASE = "https://www.gstatic.com/firebasejs/10.12.2/";

export async function loadFirebase() {
  const [App, A, F] = await Promise.all([
    import(BASE + "firebase-app.js"),
    import(BASE + "firebase-auth.js"),
    import(BASE + "firebase-firestore.js")
  ]);
  const app = App.initializeApp(firebaseConfig);
  return { auth: A.getAuth(app), db: F.getFirestore(app), A, F };
}

export const configured = () => !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PASTE");
export const isSchoolEmail = e => !!e && e.toLowerCase().endsWith("@" + SCHOOL_DOMAIN);
export const isTeacherEmail = e => !!e && TEACHER_EMAILS.includes(e.toLowerCase());

export const GOOGLE_ICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
