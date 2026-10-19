// QR 코드 (qrcode-generator, teacher.html에서 전역 `qrcode`로 불러온다).

export function joinUrl(code) {
  const url = new URL("index.html", location.href);
  url.searchParams.set("g", code);
  if (new URLSearchParams(location.search).get("emu") === "1") url.searchParams.set("emu", "1");
  return url.toString();
}

export function renderQR(el, url, sizePx) {
  const qr = globalThis.qrcode(0, "M");
  qr.addData(url);
  qr.make();
  el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  const svg = el.querySelector("svg");
  svg.setAttribute("width", sizePx);
  svg.setAttribute("height", sizePx);
  svg.style.background = "#fff";
  svg.style.borderRadius = "16px";
}
