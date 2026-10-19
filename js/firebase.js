// Firebase 초기화. SDK 버전과 CDN 주소는 이 파일에만 둔다.
// 주소 끝에 ?emu=1 을 붙이면 로컬 에뮬레이터(개발용)에 연결한다.
import { firebaseConfig } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential, signInAnonymously, onAuthStateChanged, signOut, connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getDatabase, ref, onValue, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

export {
  ref, child, get, set, update, remove, onValue, off, runTransaction, onDisconnect, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const useEmulator = new URLSearchParams(location.search).get("emu") === "1";
const config = useEmulator
  ? { apiKey: "demo", projectId: "demo-tax-quiz", databaseURL: "http://127.0.0.1:9000?ns=demo-tax-quiz", appId: "demo" }
  : firebaseConfig;

export const isConfigured = Boolean(config.apiKey && config.databaseURL);

export const app = isConfigured ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getDatabase(app) : null;

if (useEmulator && app) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectDatabaseEmulator(db, "127.0.0.1", 9000);
}

let offset = 0;
if (db) onValue(ref(db, ".info/serverTimeOffset"), (s) => (offset = s.val() ?? 0));

/** 서버 기준 현재 시각(ms). 태블릿 시계가 틀려도 맞다. */
export function serverNow() {
  return Date.now() + offset;
}

export function signInTeacher() {
  if (useEmulator) {
    // 에뮬레이터 전용 가짜 구글 계정 (실제 서비스에서는 쓰이지 않음)
    const fake = GoogleAuthProvider.credential('{"sub":"emu-teacher","email":"teacher@example.com","email_verified":true}');
    return signInWithCredential(auth, fake).then((r) => r.user);
  }
  return signInWithPopup(auth, new GoogleAuthProvider()).then((r) => r.user);
}

export function signInStudent() {
  return signInAnonymously(auth).then((r) => r.user);
}

export function onUser(cb) {
  return onAuthStateChanged(auth, cb);
}

export function signOutUser() {
  return signOut(auth);
}

/** 설정이 비어 있으면 화면에 안내를 띄우고 true를 돌려준다. */
export function showSetupNeededIfMissing() {
  if (isConfigured) return false;
  document.body.innerHTML =
    '<div style="font:24px/1.6 system-ui,sans-serif;padding:48px;max-width:720px;margin:auto">' +
    "<h1>설정이 필요해요</h1><p>Firebase 설정값이 아직 없어요. <b>docs/설정안내.md</b>를 보고 <b>js/config.js</b>를 채워 주세요.</p></div>";
  return true;
}
