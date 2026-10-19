// SVG 아바타: 인물(성별·직업)은 고정, 재산 단계(1 부자 ~ 5 파산)에 따라 모습이 바뀐다.
// 다른 그림으로 바꾸고 싶으면 이 파일만 고치면 된다.

export const JOBS = [
  { id: "banker", label: "월스트리트 금융인" },
  { id: "taxi", label: "옐로캡 택시기사" },
  { id: "police", label: "NYPD 경찰관" },
  { id: "firefighter", label: "FDNY 소방관" },
  { id: "broadway", label: "브로드웨이 배우" },
  { id: "hotdog", label: "핫도그 노점상" },
  { id: "builder", label: "고층빌딩 건설노동자" },
  { id: "designer", label: "패션 디자이너" },
];

export function avatarKey(gender, job) {
  return `${gender}_${job}`;
}

export const ALL_AVATARS = ["f", "m"].flatMap((gender) => JOBS.map(({ id }) => ({ gender, job: id })));

export const TIER_LABELS = { 1: "부자", 2: "여유", 3: "빠듯함", 4: "불쌍함", 5: "파산" };

const SKIN = "#f6cfa8";
const SKIN_SHADE = "#e8b48a";
const HAIR = { f: "#4a2c1a", m: "#2b2b2b" };
const BG = { 1: "#ffe27a", 2: "#bfe8c4", 3: "#f3e2c0", 4: "#c9d2dc", 5: "#7a2e2e" };

// 직업별 옷 색: [옷, 옷 그림자]
const OUTFIT = {
  banker: ["#22304f", "#151e33"],
  taxi: ["#f7c600", "#c99f00"],
  police: ["#1d3a6e", "#132850"],
  firefighter: ["#c9302c", "#a32420"],
  broadway: ["#7b3fbf", "#5a2b91"],
  hotdog: ["#ffffff", "#d9e2ea"],
  builder: ["#f08a24", "#d0711a"],
  designer: ["#1b1b1b", "#000000"],
};

function hairBack(gender) {
  if (gender !== "f") return "";
  // 긴 머리: 머리 뒤로 늘어지는 부분 (모자를 써도 보인다)
  return `<path d="M58 84 Q56 140 74 150 L126 150 Q144 140 142 84 Z" fill="${HAIR.f}"/>`;
}

function hairFront(gender, hasHat) {
  if (hasHat) {
    return gender === "f" ? `<path d="M64 70 Q70 92 66 104 L62 104 Q58 86 64 70 Z M136 70 Q130 92 134 104 L138 104 Q142 86 136 70 Z" fill="${HAIR.f}"/>` : "";
  }
  if (gender === "f") {
    return `<path d="M60 82 Q60 40 100 40 Q140 40 140 82 Q128 62 104 60 Q92 70 72 72 Q66 76 60 82 Z" fill="${HAIR.f}"/>`;
  }
  return `<path d="M62 78 Q60 42 100 42 Q140 42 138 78 Q130 60 100 58 Q78 58 62 78 Z" fill="${HAIR.m}"/>`;
}

function head() {
  return (
    `<ellipse cx="62" cy="88" rx="7" ry="10" fill="${SKIN_SHADE}"/><ellipse cx="138" cy="88" rx="7" ry="10" fill="${SKIN_SHADE}"/>` +
    `<circle cx="100" cy="84" r="38" fill="${SKIN}"/>`
  );
}

function face(tier, gender) {
  const blush = gender === "f" ? `<circle cx="80" cy="96" r="5" fill="#f59c9c" opacity=".6"/><circle cx="120" cy="96" r="5" fill="#f59c9c" opacity=".6"/>` : "";
  const eyes = `<circle cx="86" cy="84" r="4" fill="#222"/><circle cx="114" cy="84" r="4" fill="#222"/>`;
  switch (tier) {
    case 1:
      return (
        blush +
        // 선글라스
        `<rect x="74" y="76" width="22" height="14" rx="4" fill="#111"/><rect x="104" y="76" width="22" height="14" rx="4" fill="#111"/>` +
        `<path d="M96 82 L104 82" stroke="#111" stroke-width="3"/><path d="M78 79 L86 79" stroke="#fff" stroke-width="2" opacity=".7"/>` +
        `<path d="M84 100 Q100 118 116 100 Z" fill="#7a1f1f"/><path d="M88 101 L112 101" stroke="#fff" stroke-width="3"/>`
      );
    case 2:
      return blush + eyes + `<path d="M86 102 Q100 114 114 102" stroke="#7a1f1f" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 3:
      return (
        blush + eyes +
        `<path d="M78 74 L92 78 M122 74 L108 78" stroke="#4a2c1a" stroke-width="3" stroke-linecap="round"/>` +
        `<path d="M86 106 Q93 102 100 106 Q107 110 114 106" stroke="#7a1f1f" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      );
    case 4:
      return (
        `<path d="M78 78 L92 74 M122 78 L108 74" stroke="#4a2c1a" stroke-width="3" stroke-linecap="round"/>` +
        `<path d="M81 86 Q86 81 91 86 M109 86 Q114 81 119 86" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
        `<path d="M84 90 Q80 102 84 106 Q88 102 84 90 Z" fill="#6cc4ff"/>` +
        `<path d="M86 110 Q100 98 114 110" stroke="#7a1f1f" stroke-width="4" fill="none" stroke-linecap="round"/>`
      );
    default:
      return (
        `<path d="M76 80 L94 76 M124 80 L106 76" stroke="#4a2c1a" stroke-width="3.5" stroke-linecap="round"/>` +
        `<path d="M80 84 L92 90 M92 84 L80 90 M108 84 L120 90 M120 84 L108 90" stroke="#222" stroke-width="3.5" stroke-linecap="round"/>` +
        `<path d="M84 92 Q78 110 84 116 Q90 110 84 92 Z M116 92 Q110 110 116 116 Q122 110 116 92 Z" fill="#6cc4ff"/>` +
        `<ellipse cx="100" cy="108" rx="10" ry="7" fill="#5a1414"/>` +
        `<path d="M136 56 Q132 66 136 70 Q140 66 136 56 Z" fill="#9fdcff"/>`
      );
  }
}

function torso(job, tier) {
  const [cloth, shade] = OUTFIT[job];
  let s =
    `<path d="M100 122 L100 122 Q58 124 50 160 L46 200 L154 200 L150 160 Q142 124 100 122 Z" fill="${cloth}" stroke="${shade}" stroke-width="2"/>` +
    `<rect x="90" y="114" width="20" height="12" fill="${SKIN_SHADE}"/>`;
  if (tier === 1) {
    // 정장 라펠 느낌
    s += `<path d="M100 126 L84 128 L94 170 Z M100 126 L116 128 L106 170 Z" fill="#1d1d2b" opacity=".85"/>`;
  }
  if (tier === 3) {
    s += `<path d="M66 160 L74 152 L80 162 L88 150 M120 158 L128 150 L134 160" stroke="${shade}" stroke-width="2.5" fill="none"/>`;
  }
  if (tier === 4) {
    s +=
      `<rect x="64" y="160" width="18" height="16" fill="#b58a5a" stroke="#6b4a2a" stroke-width="2" stroke-dasharray="3 2" transform="rotate(-8 73 168)"/>` +
      `<rect x="120" y="150" width="16" height="14" fill="#8aa0b8" stroke="#4a5a6a" stroke-width="2" stroke-dasharray="3 2" transform="rotate(10 128 157)"/>` +
      `<path d="M104 180 L112 192 L100 196" stroke="${shade}" stroke-width="2" fill="none"/>`;
  }
  return s;
}

// 직업 소품: { body: 몸 위에 그리는 것, hat: 머리 위 모자(머리카락 대신), held: 손에 든 것 }
function jobParts(job) {
  switch (job) {
    case "banker":
      return {
        body:
          `<path d="M100 126 L86 128 L95 176 Z M100 126 L114 128 L105 176 Z" fill="#ffffff"/>` +
          `<path d="M100 128 L95 136 L100 172 L105 136 Z" fill="#c9302c"/>`,
        held: `<rect x="128" y="166" width="40" height="28" rx="3" fill="#6b4226" stroke="#3d2614" stroke-width="2"/><rect x="142" y="160" width="12" height="8" rx="2" fill="none" stroke="#3d2614" stroke-width="3"/><rect x="146" y="176" width="4" height="6" fill="#f1c40f"/>`,
      };
    case "taxi":
      return {
        body:
          `<g>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<rect x="${52 + i * 10}" y="166" width="5" height="5" fill="#111"/><rect x="${57 + i * 10}" y="171" width="5" height="5" fill="#111"/>`).join("")}</g>` +
          `<rect x="84" y="140" width="32" height="14" rx="3" fill="#111"/><text x="100" y="151" font-size="10" text-anchor="middle" fill="#f7c600" font-weight="bold" font-family="sans-serif">TAXI</text>`,
        hat: `<path d="M60 64 Q62 38 100 38 Q138 38 140 64 Z" fill="#3a3a3a"/><path d="M60 62 L150 62 Q152 70 140 70 L60 70 Z" fill="#2a2a2a"/><g>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${66 + i * 10}" y="54" width="5" height="5" fill="#f7c600"/>`).join("")}</g>`,
      };
    case "police":
      return {
        body:
          `<path d="M100 126 L90 130 L100 146 L110 130 Z" fill="#9db3d6"/><path d="M100 132 L100 200" stroke="#0f2140" stroke-width="2"/>` +
          `<path d="M118 146 L126 142 L134 146 L134 156 Q126 164 118 156 Z" fill="#f1c40f" stroke="#b8860b" stroke-width="2"/>` +
          `<rect x="60" y="150" width="20" height="8" fill="#0f2140"/>`,
        hat: `<path d="M62 62 Q64 32 100 30 Q136 32 138 62 Z" fill="#1d3a6e"/><rect x="58" y="58" width="84" height="10" rx="3" fill="#0f2140"/><path d="M62 68 Q100 80 138 68 L138 72 Q100 86 62 72 Z" fill="#111"/><circle cx="100" cy="46" r="7" fill="#f1c40f" stroke="#b8860b" stroke-width="2"/>`,
      };
    case "firefighter":
      return {
        body: `<rect x="50" y="170" width="100" height="8" fill="#f5d33d"/><rect x="50" y="184" width="100" height="8" fill="#c0c0c0"/>`,
        hat:
          `<path d="M58 66 Q60 30 100 30 Q140 30 142 66 Z" fill="#c9302c" stroke="#8a1c19" stroke-width="2"/><path d="M50 66 L150 66 L146 74 L54 74 Z" fill="#a32420"/>` +
          `<rect x="86" y="36" width="28" height="20" rx="3" fill="#f5d33d"/><text x="100" y="50" font-size="9" text-anchor="middle" fill="#8a1c19" font-weight="bold" font-family="sans-serif">FDNY</text>`,
      };
    case "broadway":
      return {
        body:
          `<g fill="#f1c40f">${[[66, 150], [88, 170], [120, 156], [136, 182], [74, 188], [108, 190]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join("")}</g>` +
          `<path d="M84 126 Q100 140 116 126" stroke="#f1c40f" stroke-width="4" fill="none"/>`,
        face: `<path d="M136 86 Q132 104 116 106" stroke="#333" stroke-width="3" fill="none"/><circle cx="116" cy="106" r="3" fill="#333"/>`,
        held: `<path d="M24 40 L28 52 L40 52 L30 60 L34 72 L24 64 L14 72 L18 60 L8 52 L20 52 Z" fill="#f1c40f"/>`,
      };
    case "hotdog":
      return {
        body: `<g>${[0, 1, 2, 3, 4].map((i) => `<rect x="${56 + i * 20}" y="136" width="10" height="64" fill="#e74c3c"/>`).join("")}</g>`,
        hat: `<path d="M64 62 Q66 40 100 40 Q134 40 136 62 Z" fill="#e74c3c"/><path d="M100 60 L156 62 Q158 70 136 68 L100 66 Z" fill="#c0392b"/>`,
        held: `<g transform="rotate(-15 42 172)"><rect x="18" y="164" width="48" height="16" rx="8" fill="#e0a85a"/><rect x="14" y="167" width="56" height="10" rx="5" fill="#b5462a"/><path d="M20 171 Q28 165 36 171 Q44 177 52 171 Q60 165 66 171" stroke="#f1c40f" stroke-width="3" fill="none"/></g>`,
      };
    case "builder":
      return {
        body: `<path d="M74 128 L74 200 M126 128 L126 200" stroke="#d6ff3d" stroke-width="10"/><path d="M50 172 L150 172" stroke="#e0e0e0" stroke-width="6"/>`,
        hat: `<path d="M60 64 Q62 28 100 28 Q138 28 140 64 Z" fill="#f5d33d" stroke="#c9a51c" stroke-width="2"/><rect x="52" y="62" width="96" height="9" rx="4" fill="#e0b81e"/><rect x="95" y="28" width="10" height="34" fill="#e0b81e"/>`,
      };
    default: // designer
      return {
        body:
          `<rect x="86" y="118" width="28" height="14" rx="4" fill="#1b1b1b"/>` +
          `<path d="M78 128 Q76 170 84 196 M122 128 Q124 170 116 196" stroke="#f1c40f" stroke-width="5" fill="none"/>` +
          `<g stroke="#333" stroke-width="1.5">${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${77 - i * 0.3} ${136 + i * 10} l5 0"/><path d="M${121 + i * 0.3} ${136 + i * 10} l-5 0"/>`).join("")}</g>`,
        hat: `<ellipse cx="96" cy="50" rx="44" ry="16" fill="#b0283a"/><circle cx="96" cy="36" r="5" fill="#b0283a"/>`,
      };
  }
}

function richExtras() {
  return (
    `<path d="M74 128 Q100 156 126 128" stroke="#f1c40f" stroke-width="6" fill="none"/><circle cx="100" cy="150" r="8" fill="#f1c40f" stroke="#b8860b" stroke-width="2"/><text x="100" y="155" font-size="11" text-anchor="middle" fill="#7a5a00" font-weight="bold">$</text>` +
    `<g transform="rotate(-12 40 176)"><rect x="18" y="164" width="44" height="24" rx="3" fill="#3faa5a" stroke="#1f6b35" stroke-width="2"/><rect x="34" y="164" width="10" height="24" fill="#f1c40f"/><text x="27" y="181" font-size="12" fill="#fff" font-weight="bold">₩</text></g>` +
    `<path d="M164 30 L168 42 L180 46 L168 50 L164 62 L160 50 L148 46 L160 42 Z" fill="#fff"/><path d="M30 40 L33 48 L41 51 L33 54 L30 62 L27 54 L19 51 L27 48 Z" fill="#fff"/>`
  );
}

function poorExtras() {
  return (
    `<g transform="rotate(14 160 176)"><rect x="140" y="164" width="40" height="26" rx="4" fill="#8b5a2b" stroke="#5a3a1b" stroke-width="2"/><path d="M140 172 L180 172" stroke="#5a3a1b" stroke-width="2"/></g>` +
    `<path d="M186 158 L190 150 M182 154 L176 148" stroke="#666" stroke-width="2"/>`
  );
}

function barrel() {
  return (
    `<path d="M52 140 Q46 172 52 204 L148 204 Q154 172 148 140 Z" fill="#a0672e" stroke="#5a3a1b" stroke-width="3"/>` +
    `<path d="M50 152 L150 152 M48 190 L152 190" stroke="#3b3b3b" stroke-width="6"/>` +
    `<path d="M76 140 L74 204 M100 140 L100 204 M124 140 L126 204" stroke="#7a4a1e" stroke-width="2"/>` +
    `<path d="M52 140 L40 120 M148 140 L160 120" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>`
  );
}

function bankruptBanner() {
  return (
    `<g transform="rotate(-14 100 172)"><rect x="40" y="158" width="120" height="30" rx="4" fill="#e3342f" stroke="#fff" stroke-width="3"/>` +
    `<text x="100" y="181" font-size="22" text-anchor="middle" fill="#fff" font-weight="900" font-family="sans-serif">파산</text></g>`
  );
}

export function renderAvatar({ gender, job, tier, size = 160 }) {
  const g = gender === "f" ? "f" : "m";
  const j = OUTFIT[job] ? job : "banker";
  const t = [1, 2, 3, 4, 5].includes(tier) ? tier : 2;
  const parts = jobParts(j);
  const hasHat = Boolean(parts.hat);

  const body =
    t === 5
      ? barrel()
      : torso(j, t) + (parts.body ?? "") + (t === 1 ? richExtras() : "") + (t === 4 ? poorExtras() : "") + (parts.held ?? "");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}" data-gender="${g}" data-job="${j}" data-tier="${t}" role="img" aria-label="${JOBS.find((x) => x.id === j).label} ${TIER_LABELS[t]}">` +
    `<circle cx="100" cy="100" r="98" fill="${BG[t]}"/>` +
    `<clipPath id="c${g}${j}${t}"><circle cx="100" cy="100" r="98"/></clipPath>` +
    `<g clip-path="url(#c${g}${j}${t})">` +
    hairBack(g) +
    body +
    head() +
    face(t, g) +
    (t !== 1 && parts.face ? parts.face : "") +
    hairFront(g, hasHat) +
    (parts.hat ?? "") +
    (t === 5 ? bankruptBanner() : "") +
    `</g></svg>`
  );
}
