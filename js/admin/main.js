// 준비 페이지: 게임 초안(팀·시작 금액·문항) 만들기, 문항 세트 저장/불러오기.
import { db, ref, set, remove, onValue, signInTeacher, onUser, signOutUser, showSetupNeededIfMissing } from "../firebase.js";
import { blankDraft, blankQuestion, resizeQuestions, validateDraft, normalizeDraft, normalizeQuestion, TEAM_IDS, MEMBER_IDS } from "../logic/quizModel.js";
import { wordsOf, splitSentence } from "../logic/coop.js";
import { esc, $, $$, toast, newId, pageHref } from "../ui/dom.js";

const app = $("#app");
const who = $("#who");
const TYPE_LABEL = { choice: "객관식", text: "주관식", coop: "협력형" };
const CIRCLED = ["①", "②", "③", "④", "⑤"];

let uid = null;
let drafts = {};
let quizSets = {};
let draft = null; // 편집 중인 초안
let draftId = null;
let errors = [];

if (!showSetupNeededIfMissing()) {
  onUser((user) => {
    uid = user?.uid ?? null;
    who.innerHTML = user ? `<button class="ghost" id="logout">로그아웃</button>` : "";
    if (!uid) return renderLogin();
    onValue(ref(db, `teachers/${uid}/drafts`), (s) => {
      drafts = s.val() ?? {};
      if (!draft) renderHome();
    });
    onValue(ref(db, `teachers/${uid}/quizSets`), (s) => {
      quizSets = s.val() ?? {};
      const sel = $("#set-select");
      if (sel) sel.outerHTML = setSelect();
    });
    renderHome();
  });
}

// 교사 화면으로 가기. 게임을 고치던 중이면 저장 안 된 내용이 사라지니 먼저 묻는다.
$("#to-teacher").href = pageHref("teacher.html");
$("#to-teacher").onclick = (e) => {
  if (draft && !confirm("저장하지 않은 내용은 사라져요. 교사 화면으로 갈까요?")) e.preventDefault();
};

who.addEventListener("click", (e) => {
  if (e.target.id === "logout") signOutUser();
});

function renderLogin() {
  app.innerHTML = `<section class="card login"><h2>교사 로그인</h2><p>문항과 팀을 준비하려면 구글 계정으로 로그인하세요.</p><button id="login">구글로 로그인</button></section>`;
  $("#login").onclick = () => signInTeacher().catch((e) => toast(`로그인 실패: ${e.code ?? e.message}`));
}

// ---------- 게임 목록 ----------
function renderHome() {
  draft = null;
  const items = Object.entries(drafts)
    .sort((a, b) => (b[1].updatedAt ?? 0) - (a[1].updatedAt ?? 0))
    .map(
      ([id, d]) => `<div class="draft-item"><b>${esc(d.name || "(이름 없음)")}</b>
        <span>문항 ${(d.questions ?? []).length}개 · 시작 금액 ${Number(d.startMoney ?? 0).toLocaleString("ko-KR")}원</span>
        <div class="row"><button data-open="${id}">열기</button><button class="secondary" data-del="${id}">삭제</button></div></div>`,
    )
    .join("");
  app.innerHTML = `<section class="card"><h2>게임 목록</h2>
      <p>여기서 만든 게임은 수업 시간에 <b>교사 화면(teacher.html)</b>에서 시작해요.</p>
      <div class="drafts">${items || "<p>아직 저장된 게임이 없어요.</p>"}</div>
      <p><button id="new">＋ 새 게임 만들기</button></p></section>`;
  $("#new").onclick = () => openEditor(null, blankDraft());
  $$("[data-open]").forEach((b) => (b.onclick = () => openEditor(b.dataset.open, normalizeDraft(drafts[b.dataset.open]))));
  $$("[data-del]").forEach(
    (b) =>
      (b.onclick = () => {
        const d = drafts[b.dataset.del];
        if (confirm(`"${d.name || "이름 없음"}" 게임을 삭제할까요?`)) remove(ref(db, `teachers/${uid}/drafts/${b.dataset.del}`));
      }),
  );
}

// ---------- 편집기 ----------
function openEditor(id, d) {
  draftId = id;
  draft = d;
  errors = [];
  renderEditor();
  window.scrollTo(0, 0);
}

function renderEditor() {
  draft.questions.forEach((q, i) => (q._i = i));
  app.innerHTML = `
    <p><button class="secondary" id="back">← 게임 목록</button></p>
    <div id="errors"></div>
    <section class="card"><h2>1. 기본 설정</h2>
      <div class="field-row">
        <label class="field">게임 이름<input id="name" value="${esc(draft.name)}" placeholder="예: 세금 퀴즈 1차 (3반)"></label>
        <label class="field">팀별 시작 금액 (모든 팀 같음)<input id="money" type="number" min="0" step="100" value="${draft.startMoney}"></label>
      </div>
    </section>
    <section class="card"><h2>2. 팀과 팀원</h2>
      <p>팀원은 2~5명. <b>맨 먼저 입력한 팀원이 팀장</b>이고, 팀장이 팀 아바타를 골라요.</p>
      <div class="teams">${TEAM_IDS.map(teamCard).join("")}</div>
    </section>
    <section class="card"><h2>3. 문항 제작</h2>
      <div class="sets">
        <label class="field" style="flex-direction:row;align-items:center">문항 수 <input id="qcount" type="number" min="1" max="50" value="${draft.questions.length}" style="width:90px"></label>
        <span style="flex:1"></span>
        ${setSelect()}
        <button class="secondary" id="load-set">문항 세트 불러오기</button>
        <button class="secondary" id="save-set">문항 세트로 저장</button>
      </div>
      <div id="questions">${draft.questions.map(questionCard).join("")}</div>
    </section>
    <div class="savebar"><button id="save">💾 게임 저장</button></div>`;
  renderErrors();
  bindEditor();
}

function teamCard(t, i) {
  const team = draft.teams[t];
  return `<div class="team">
    <input class="team-name" data-team="${t}" value="${esc(team.name)}" placeholder="${i + 1}팀 이름">
    <div class="members">${MEMBER_IDS.map(
      (m, k) => `<input data-team="${t}" data-member="${m}" value="${esc(team.members[m])}" placeholder="${k === 0 ? "팀장 👑" : k < 2 ? `팀원 ${k + 1}` : `팀원 ${k + 1} (선택)`}">`,
    ).join("")}</div></div>`;
}

function setSelect() {
  const opts = Object.entries(quizSets)
    .map(([id, s]) => `<option value="${id}">${esc(s.name)} (${(s.questions ?? []).length}문항)</option>`)
    .join("");
  return `<select id="set-select">${opts || '<option value="">저장된 문항 세트 없음</option>'}</select>`;
}

function questionCard(q, i) {
  return `<div class="q" data-q="${i}">
    <div class="q-head"><b>${i + 1}번</b>
      <div class="types">${Object.entries(TYPE_LABEL).map(([k, v]) => `<button type="button" data-type="${k}" class="${q.type === k ? "on" : ""}">${v}</button>`).join("")}</div>
    </div>
    ${q.type === "coop" ? coopBody(q) : `<label class="field">문제<textarea data-f="text">${esc(q.text)}</textarea></label>`}
    ${q.type === "choice" ? choiceBody(q) : ""}
    ${q.type === "text" ? `<label class="field" style="margin-top:10px">정답 (여러 개면 쉼표로)<input data-f="acceptedRaw" value="${esc(q.acceptedRaw)}" placeholder="예: 부가가치세, 부가세"></label>` : ""}
    <div class="nums">
      <label>상금 <input type="number" min="0" step="100" data-f="reward" value="${q.reward}">원</label>
      <label>세금 <input type="number" min="0" step="100" data-f="tax" value="${q.tax}">원</label>
      <label>제한 시간 <input type="number" min="5" max="300" data-f="seconds" value="${q.seconds}">초</label>
    </div></div>`;
}

function choiceBody(q) {
  return `<div class="choices">${q.choices
    .map(
      (c, k) => `<div class="choice"><input type="radio" name="ans${q._i}" data-answer="${k}" ${q.answer === k ? "checked" : ""} title="정답">
        <span>${CIRCLED[k]}</span><input type="text" data-choice="${k}" value="${esc(c)}" placeholder="보기 ${k + 1}">
        ${q.choices.length > 2 ? `<button type="button" class="secondary" data-del-choice="${k}">−</button>` : ""}</div>`,
    )
    .join("")}
    ${q.choices.length < 5 ? `<div><button type="button" class="secondary" data-add-choice>＋ 보기 추가</button></div>` : ""}
    <small>정답인 보기의 동그라미를 누르세요.</small></div>`;
}

function coopBody(q) {
  return `<label class="field">문장 (5단어 이상)<textarea data-f="text" placeholder="예: 세금은 국가가 필요한 돈을 국민에게서 거두는 것이다">${esc(q.text)}</textarea></label>
    <div class="coop-info">${coopInfo(q)}</div>`;
}

function coopInfo(q) {
  const n = wordsOf(q.text).length;
  const preview = n >= 5 ? `<div class="preview">4명 팀이면: ${splitSentence(q.text, 4).map(esc).join(" / ")}</div>` : "";
  return `단어 수: <span class="count ${n < 5 ? "bad" : ""}">${n}</span> (5 이상) · 조각 수는 문항을 열 때 팀 접속 인원에 맞춰 정해져요.${preview}`;
}

function bindEditor() {
  $("#back").onclick = () => {
    if (confirm("저장하지 않은 내용은 사라져요. 목록으로 갈까요?")) renderHome();
  };
  $("#name").oninput = (e) => (draft.name = e.target.value);
  $("#money").oninput = (e) => (draft.startMoney = toInt(e.target.value));
  $$("[data-team]").forEach(
    (el) =>
      (el.oninput = () => {
        const team = draft.teams[el.dataset.team];
        if (el.dataset.member) team.members[el.dataset.member] = el.value;
        else team.name = el.value;
      }),
  );
  $("#qcount").onchange = (e) => {
    const n = Math.max(1, Math.min(50, toInt(e.target.value) || 1));
    const lost = draft.questions.slice(n).some((q) => q.text.trim() !== "");
    if (lost && !confirm(`${n + 1}번부터의 문항이 지워져요. 계속할까요?`)) {
      e.target.value = draft.questions.length;
      return;
    }
    draft.questions = resizeQuestions(draft.questions, n);
    renderQuestions();
  };
  $("#save-set").onclick = saveSet;
  $("#load-set").onclick = loadSet;
  $("#save").onclick = saveDraft;
  bindQuestions();
}

function renderQuestions() {
  draft.questions.forEach((q, i) => (q._i = i));
  $("#questions").innerHTML = draft.questions.map(questionCard).join("");
  bindQuestions();
}

function bindQuestions() {
  $$("#questions .q").forEach((card) => {
    const i = Number(card.dataset.q);
    const q = draft.questions[i];
    card.oninput = (e) => {
      const el = e.target;
      if (el.dataset.f) {
        const f = el.dataset.f;
        q[f] = ["reward", "tax", "seconds"].includes(f) ? toInt(el.value) : el.value;
        if (f === "text" && q.type === "coop") card.querySelector(".coop-info").innerHTML = coopInfo(q);
      }
      if (el.dataset.choice !== undefined) q.choices[Number(el.dataset.choice)] = el.value;
    };
    card.onchange = (e) => {
      if (e.target.dataset.answer !== undefined) q.answer = Number(e.target.dataset.answer);
    };
    card.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.type) {
        q.type = b.dataset.type;
        if (q.type === "choice" && q.choices.length < 2) q.choices = ["", "", "", ""];
      } else if (b.dataset.addChoice !== undefined) q.choices.push("");
      else if (b.dataset.delChoice !== undefined) {
        const k = Number(b.dataset.delChoice);
        q.choices.splice(k, 1);
        if (q.answer === k) q.answer = null;
        else if (q.answer > k) q.answer -= 1;
      } else return;
      renderQuestions();
    };
  });
}

function toInt(v) {
  return v === "" ? NaN : Number(v);
}

function clean(qs) {
  return qs.map(({ _i, ...q }) => q);
}

function renderErrors() {
  $("#errors").innerHTML = errors.length
    ? `<div class="errors"><b>저장하기 전에 고쳐 주세요 (${errors.length}개)</b><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>`
    : "";
}

async function saveDraft() {
  errors = validateDraft({ ...draft, questions: clean(draft.questions) });
  renderErrors();
  if (errors.length) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  draftId = draftId ?? newId();
  await set(ref(db, `teachers/${uid}/drafts/${draftId}`), { ...draft, questions: clean(draft.questions), updatedAt: Date.now() });
  toast("저장했어요. 수업 시간에 교사 화면에서 이 게임을 시작하세요");
}

async function saveSet() {
  const name = prompt("문항 세트 이름을 입력하세요", draft.name || "");
  if (!name?.trim()) return;
  await set(ref(db, `teachers/${uid}/quizSets/${newId()}`), { name: name.trim(), questions: clean(draft.questions), updatedAt: Date.now() });
  toast(`"${name.trim()}" 문항 세트를 저장했어요`);
}

function loadSet() {
  const id = $("#set-select").value;
  const s = quizSets[id];
  if (!s) return toast("불러올 문항 세트가 없어요");
  if (!confirm(`지금 문항을 "${s.name}"(으)로 바꿀까요?`)) return;
  const questions = Object.values(s.questions ?? {}).map(normalizeQuestion);
  draft.questions = questions.length ? questions : [blankQuestion()];
  $("#qcount").value = draft.questions.length;
  renderQuestions();
  toast("문항 세트를 불러왔어요");
}
