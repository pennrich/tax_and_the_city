// SVG 아바타: 인물(성별·직업)은 고정, 재산 단계(1 부자 ~ 5 파산)에 따라 모습이 바뀐다.
// 다른 그림으로 바꾸고 싶으면 이 파일만 고치면 된다.

export const JOBS = [
  { id: "office", label: "회사원" },
  { id: "doctor", label: "의사" },
  { id: "chef", label: "요리사" },
  { id: "firefighter", label: "소방관" },
  { id: "teacher", label: "교사" },
  { id: "programmer", label: "프로그래머" },
  { id: "farmer", label: "농부" },
  { id: "builder", label: "건설노동자" },
];

export const TIER_LABELS = { 1: "부자", 2: "여유", 3: "빠듯함", 4: "불쌍함", 5: "파산" };

const SKIN = "#f6cfa8";
const SKIN_SHADE = "#e8b48a";
const HAIR = { f: "#4a2c1a", m: "#2b2b2b" };
const BG = { 1: "#ffe27a", 2: "#bfe8c4", 3: "#f3e2c0", 4: "#c9d2dc", 5: "#7a2e2e" };

// 직업별 옷 색: [옷, 옷 그림자]
const OUTFIT = {
  office: ["#3b5b92", "#2c4673"],
  doctor: ["#ffffff", "#d9e2ea"],
  chef: ["#ffffff", "#d9e2ea"],
  firefighter: ["#c9302c", "#a32420"],
  teacher: ["#7a9a4a", "#5f7a37"],
  programmer: ["#4b4f5c", "#373a44"],
  farmer: ["#4f7fb8", "#3c6695"],
  builder: ["#f08a24", "#d0711a"],
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
    case "office":
      return { body: `<path d="M100 126 L94 134 L100 170 L106 134 Z" fill="#c9302c"/><path d="M94 126 L100 134 L106 126 Z" fill="#a32420"/>` };
    case "doctor":
      return {
        body:
          `<path d="M100 126 L88 128 L96 176 Z M100 126 L112 128 L104 176 Z" fill="#cfe3f1"/>` +
          `<path d="M84 130 Q76 162 96 168 M116 130 Q124 162 104 168" stroke="#333" stroke-width="3" fill="none"/>` +
          `<circle cx="100" cy="170" r="6" fill="#888" stroke="#333" stroke-width="2"/>` +
          `<rect x="122" y="150" width="14" height="10" rx="2" fill="#5aa7d6"/>`,
      };
    case "chef":
      return {
        body: `<circle cx="96" cy="150" r="3" fill="#333"/><circle cx="96" cy="166" r="3" fill="#333"/><circle cx="104" cy="150" r="3" fill="#333"/><circle cx="104" cy="166" r="3" fill="#333"/>` +
          `<path d="M86 124 L100 134 L114 124" fill="#e74c3c"/>`,
        hat: `<rect x="72" y="36" width="56" height="18" fill="#fff" stroke="#ccc" stroke-width="2"/><circle cx="80" cy="30" r="14" fill="#fff" stroke="#ccc" stroke-width="2"/><circle cx="100" cy="22" r="16" fill="#fff" stroke="#ccc" stroke-width="2"/><circle cx="120" cy="30" r="14" fill="#fff" stroke="#ccc" stroke-width="2"/><rect x="72" y="34" width="56" height="10" fill="#fff"/>`,
      };
    case "firefighter":
      return {
        body: `<rect x="50" y="170" width="100" height="8" fill="#f5d33d"/><rect x="50" y="184" width="100" height="8" fill="#c0c0c0"/>`,
        hat: `<path d="M58 66 Q60 30 100 30 Q140 30 142 66 Z" fill="#c9302c" stroke="#8a1c19" stroke-width="2"/><path d="M50 66 L150 66 L146 74 L54 74 Z" fill="#a32420"/><rect x="92" y="38" width="16" height="18" rx="3" fill="#f5d33d"/>`,
      };
    case "teacher":
      return {
        body: `<path d="M100 126 L90 130 L100 150 L110 130 Z" fill="#fff"/>`,
        held: `<g transform="rotate(-10 60 170)"><rect x="40" y="152" width="40" height="30" rx="2" fill="#2e6fbe"/><rect x="44" y="156" width="32" height="22" fill="#e8f0fb"/><path d="M48 162 L72 162 M48 168 L68 168 M48 174 L70 174" stroke="#2e6fbe" stroke-width="2"/></g>`,
        face: `<circle cx="86" cy="84" r="9" fill="none" stroke="#333" stroke-width="2.5"/><circle cx="114" cy="84" r="9" fill="none" stroke="#333" stroke-width="2.5"/><path d="M95 84 L105 84" stroke="#333" stroke-width="2.5"/>`,
      };
    case "programmer":
      return {
        body: `<path d="M70 126 Q100 146 130 126" stroke="#2b2d35" stroke-width="6" fill="none"/>`,
        held: `<rect x="120" y="160" width="46" height="30" rx="3" fill="#9aa3ad" stroke="#555" stroke-width="2"/><circle cx="143" cy="175" r="5" fill="#fff"/><path d="M116 190 L170 190" stroke="#555" stroke-width="4"/>`,
      };
    case "farmer":
      return {
        body: `<rect x="74" y="140" width="52" height="60" fill="#3c6695"/><rect x="78" y="126" width="8" height="20" fill="#3c6695"/><rect x="114" y="126" width="8" height="20" fill="#3c6695"/><circle cx="82" cy="144" r="3" fill="#f5d33d"/><circle cx="118" cy="144" r="3" fill="#f5d33d"/>`,
        hat: `<ellipse cx="100" cy="56" rx="62" ry="12" fill="#e7c46a" stroke="#b8963d" stroke-width="2"/><path d="M68 56 Q70 26 100 26 Q130 26 132 56 Z" fill="#e7c46a" stroke="#b8963d" stroke-width="2"/><rect x="68" y="46" width="64" height="7" fill="#c0392b"/>`,
      };
    default: // builder
      return {
        body: `<path d="M74 128 L74 200 M126 128 L126 200" stroke="#f5f542" stroke-width="10"/><path d="M50 172 L150 172" stroke="#e0e0e0" stroke-width="6"/>`,
        hat: `<path d="M60 64 Q62 28 100 28 Q138 28 140 64 Z" fill="#f5d33d" stroke="#c9a51c" stroke-width="2"/><rect x="52" y="62" width="96" height="9" rx="4" fill="#e0b81e"/><rect x="95" y="28" width="10" height="34" fill="#e0b81e"/>`,
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
  const j = OUTFIT[job] ? job : "office";
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
