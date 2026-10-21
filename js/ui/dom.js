// 화면 공통 도우미.

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let toastTimer;
export function toast(msg, ms = 2600) {
  let el = $(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.append(el);
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 같은 사이트의 다른 페이지 주소. 에뮬레이터(?emu=1)로 보고 있으면 그대로 이어 간다.
export function pageHref(page) {
  const url = new URL(page, location.href);
  if (new URLSearchParams(location.search).get("emu") === "1") url.searchParams.set("emu", "1");
  return url.toString();
}

// 🗽 로고를 두 번 톡톡 누르면 준비 페이지(admin.html)로 간다. 교사용 숨은 입구.
// 안드로이드 크롬은 dblclick이 잘 안 오므로 두 번 탭을 직접 잰다.
export function bindStatueShortcut(root = document) {
  $$(".statue", root).forEach((el) => {
    let last = 0;
    el.addEventListener("pointerup", () => {
      const now = Date.now();
      if (now - last < 400) {
        location.href = pageHref("admin.html");
      }
      last = now;
    });
  });
}
