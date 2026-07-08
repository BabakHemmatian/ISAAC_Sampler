// Firebase Auth client for ISAAC. Replaces the old Supabase anon-key client.
// Config comes from build-time env vars (REACT_APP_FIREBASE_*, inlined by CRA)
// so no keys are committed to source. Set them in .env.local — see
// .env.local.example. These values are NOT secret (they ship in the browser
// bundle), but keeping them in env keeps source clean and swappable per env.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Fail loudly in dev if the project wasn't configured, but never crash render.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // eslint-disable-next-line no-console
  console.error(
    'Firebase config missing. Set REACT_APP_FIREBASE_* in .env.local ' +
    '(see .env.local.example) and rebuild.'
  );
}

// Guard against double-init during CRA fast-refresh / re-imports.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Persist the session in localStorage and auto-refresh tokens — mirrors the
// old Supabase { persistSession: true, autoRefreshToken: true } behavior.
// browserLocalPersistence is the web default, but we set it explicitly so a
// future SDK default change can't silently log everyone out on refresh.
setPersistence(auth, browserLocalPersistence).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to set Firebase auth persistence:', err);
});

export default app;
