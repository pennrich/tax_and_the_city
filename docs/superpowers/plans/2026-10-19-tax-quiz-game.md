# 세금 퀴즈 게임 (Tax and the City) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사가 준비한 문항으로 7개 팀이 태블릿에서 실시간으로 겨루고, 정답 팀은 상금을 받고 오답 팀은 세금을 내는 웹 퀴즈 게임을 만든다.

**Architecture:**
- 빌드 단계가 없는 정적 웹페이지 3개로 구성한다. `admin.html`(준비), `teacher.html`(TV 진행), `index.html`(학생). 이 페이지들을 GitHub Pages에 올린다.
- Firebase Realtime Database로 실시간 동기화를 하고, Firebase Auth를 쓴다. 교사는 구글 로그인, 학생은 익명 로그인이다.
- 정답은 교사 전용 경로에만 둔다. 채점과 상금/세금 계산은 교사 기기가 순수 함수로 만들어 한 번의 multi-path update로 기록한다.

**Tech Stack:**
- 바닐라 JavaScript (ES modules)
- Firebase JS SDK 13.0.0 (gstatic CDN)
- qrcode-generator 1.4.4 (jsDelivr CDN)
- Vitest 5 (순수 로직 테스트)
- @firebase/rules-unit-testing 6 + firebase-tools 15 (보안 규칙 테스트, JDK 필요)

**Spec:** `docs/superpowers/specs/2026-10-19-tax-quiz-game-design.md`

## Global Constraints

- **UI 언어:** 모든 화면 문구는 한국어로 쓴다.
- **화면 기기:** 학생은 안드로이드 크롬 태블릿, 교사는 태블릿을 TV에 연결해 쓴다. 교사 화면은 **학생 전원이 보는 화면**이다.
- **인원:** 7개 팀, 팀당 팀원 2~5명. 팀 ID는 `t1`~`t7`, 팀원 ID는 `m1`~`m5`로 고정한다.
- **협력형 문항**
  - 문장은 공백 기준 5단어 이상이어야 한다.
  - 조각 수는 문항을 여는 순간 그 팀의 접속 중(`isPresent`) 팀원 수 N이다. N=1이면 2조각을 그 1명에게 모두 준다. N=0이면 배정하지 않는다.
  - 자르는 법: 순서를 유지한 연속 덩어리로 자른다. 덩어리별 단어 수 차이는 최대 1이고, 앞 덩어리가 더 많다.
  - 조각은 무작위로 배정한다.
  - 답은 받은 조각마다 1부터 세는 위치 번호 배열이다.
  - 문항이 열린 뒤 들어온 학생은 그 문항에서 조각이 없고, 판정에서도 빠진다.
- **TV에 보이면 안 되는 것:** 아직 내지 않은 문항 내용, 정답 공개 전의 정답, 학생 답.
- **학생이 볼 수 없는 것:** 다른 팀의 잔액·답·결과. 공개 전 정답은 DB 규칙으로도 읽을 수 없어야 한다.
- **잔액 표기:** 음수는 "부채 3,000원"으로 쓴다. 0과 양수는 "12,000원"처럼 쓴다. 천 단위마다 쉼표를 넣는다.
- **주관식 채점:** 모든 공백(일반 공백, 전각 공백 `　`, NBSP 포함)과 영문 대소문자는 무시한다. 그 밖에 한 글자라도 다르면 오답이다. 정답은 쉼표로 구분해 여러 개 둘 수 있다.
- **팀 판정:** 판정 대상 = 그 문항에 답을 제출한 팀원 + 마감 시점에 접속 중인 팀원. 결과는 다음과 같다.
  - 대상 0명이면 `none`(상금 0, 세금 0)
  - 대상 전원이 정답이면 `correct`(+상금)
  - 그 밖에는 `wrong`(−세금)
- **연결 끊김 유예:** 연결이 끊긴 지 5000ms 미만이면 아직 접속 중으로 본다.
- **재산 단계** (S = 시작 금액):

  | 단계 | 조건 |
  |---|---|
  | 1 | 잔액 ≥ 1.5S |
  | 2 | 잔액 ≥ 1.0S |
  | 3 | 잔액 ≥ 0.5S |
  | 4 | 잔액 ≥ 0 |
  | 5 | 잔액 < 0 |

  S ≤ 0이면 잔액 ≥ 0일 때 2단계, 잔액 < 0일 때 5단계로 한다.
- **아바타:**
  - 성별: `f`, `m`
  - 직업 8종 (ID와 이름, 그대로 사용):

    | ID | 이름 |
    |---|---|
    | `office` | 회사원 |
    | `doctor` | 의사 |
    | `chef` | 요리사 |
    | `firefighter` | 소방관 |
    | `teacher` | 교사 |
    | `programmer` | 프로그래머 |
    | `farmer` | 농부 |
    | `builder` | 건설노동자 |

- **문항 입력값 범위:**
  - 제한 시간: 5~300초, 정수
  - 상금/세금: 0 이상 정수
  - 객관식 보기: 2~5개
- **문항 기본값:** 상금 1000, 세금 500, 시간 30초, 객관식 보기 4칸
- **외부 스크립트:** `https://www.gstatic.com/firebasejs/13.0.0/` 와 `https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js` 만 사용한다.
- **Firebase 설정값:** `js/config.js` 파일 하나에만 둔다.
- **화면 크기:** TV 화면은 1920×1080 기준이다. 문제는 64px 이상, 남은 시간과 정답은 120px 이상으로 한다. 태블릿 버튼은 높이 64px 이상으로 한다.

## Review Focus

1. **한 문항을 두 번 채점하는 문제:** 교사가 정답 공개를 두 번 누르거나, 공개 도중 새로고침하면 상금/세금이 두 번 들어갈 수 있다. `results/{q}`가 이미 있으면 다시 적용하지 않아야 한다. → Task 2 `buildRevealUpdate` 멱등성 테스트
2. **주관식 입력의 보이지 않는 문자:** 학생 키보드가 붙이는 전각 공백, NBSP, 줄바꿈이 오답의 원인이 되면 안 된다. → Task 1 `normalizeAnswer` 테스트
3. **태블릿 시계가 틀린 경우:** 카운트다운과 마감을 기기 시계로 판정하면 안 된다. 서버 시간 offset을 쓰고, 마감 뒤 제출은 DB 규칙(`now`)으로 막는다. → Task 5 규칙 테스트 "마감 1.5초 뒤 제출 거부"
4. **두 태블릿이 같은 이름을 동시에 누르는 경우:** 한 명만 자리를 얻고, 다른 한 명은 "이미 선택된 이름이에요"를 본다. → Task 5 규칙 테스트 + Task 8 transaction
5. **제출 버튼 연타:** 두 번째 쓰기는 거부되어야 하고, UI는 첫 탭에서 바로 잠겨야 한다. → Task 5 규칙 테스트 "이미 제출한 답 덮어쓰기 거부"

---

## 파일 구조

```
index.html                 학생 페이지 (?g=CODE)
teacher.html               교사 진행 페이지 (TV)
admin.html                 교사 준비 페이지
avatars-preview.html       아바타 전체 확인용 (개발용)
css/common.css             색 토큰, 폰트, 공통 컴포넌트
css/tv.css  css/student.css  css/admin.css
js/config.js               Firebase 설정값 (교사가 붙여넣음)
js/firebase.js             SDK 초기화, db/auth export, serverNow()
js/logic/grading.js        채점
js/logic/judge.js          판정 대상·팀 판정
js/logic/money.js          금액 계산·표기·순위
js/logic/tier.js           재산 단계
js/logic/quizModel.js      문항/게임 초안 모델·검증
js/logic/gameCode.js       입장 코드
js/logic/updates.js        DB 쓰기 내용을 만드는 순수 함수 (문항 열기/공개/종료)
js/avatars/avatars.js      SVG 아바타
js/sound.js                Web Audio 효과음
js/admin/main.js           준비 페이지
js/teacher/main.js         교사 화면 상태 전환 (login→list→lobby→play→end)
js/teacher/lobby.js  js/teacher/play.js  js/teacher/end.js
js/student/main.js         학생 화면 상태 전환 (team→name→avatar→wait→question→result→end)
js/ui/qr.js                QR 렌더링
database.rules.json        보안 규칙
firebase.json  .firebaserc 에뮬레이터/규칙 배포 설정
tests/*.test.js            Vitest
tests/rules/*.test.js      규칙 테스트 (에뮬레이터)
docs/설정안내.md           교사용 Firebase·GitHub Pages 설정 안내 (한국어)
```

## DB 구조 (모든 Task가 공유)

```
teachers/{uid}/quizSets/{setId}: { name, questions: Question[], updatedAt }
teachers/{uid}/drafts/{draftId}: { name, startMoney, teams: {t1:{name, members:{m1:"김민수",...}}...}, questions: Question[], updatedAt }
teachers/{uid}/activeGame: code | null
teachers/{uid}/keys/{code}: { questions: Question[] }             // 정답 포함, 교사만
games/{code}/meta: { teacherUid, status: "lobby"|"playing"|"ended", startMoney, questionCount, createdAt }
games/{code}/teams/{t}: { name, members: {m: name} }
games/{code}/seats/{t}/{m}: { uid, gender, job }
games/{code}/uidSeat/{uid}: { t, m }
games/{code}/presence/{t}/{m}: { online: bool, lastChanged: number }
games/{code}/balances/{t}: number
games/{code}/played/{q}: true
games/{code}/current: { q, text, type, choices|null, endsAt, phase: "open"|"revealed" } | null
games/{code}/pieces/{q}/{t}/{m}: string[]                          // 협력형: 그 학생이 받은 조각(1~2개)
games/{code}/pieceCount/{q}/{t}: number                            // 협력형: 그 팀 전체 조각 수 (읽기: 교사·그 팀)
teachers/{uid}/keys/{code}/coop/{q}/{t}/{m}: number[]              // 협력형 정답 위치(1부터), pieces와 같은 순서
games/{code}/answers/{q}/{t}/{m}: { value: number|string|number[], at: number }
games/{code}/reveal/{q}: { answerText }
games/{code}/results/{q}/{t}: { outcome: "correct"|"wrong"|"none", delta, balance, tier }
games/{code}/final/{t}: { rank, balance }
```

`Question = { type: "choice"|"text"|"coop", text, choices: string[], answer: number|null, acceptedRaw: string, reward, tax, seconds }`
- 협력형에서는 `text`가 곧 문장이고, `choices`, `answer`, `acceptedRaw`는 쓰지 않는다.
- 객관식에서 `answer`는 0부터 세는 보기 번호다.
- 주관식은 `acceptedRaw`("부가가치세, 부가세")를 사용한다.

---

### Task 1: 프로젝트 뼈대 + 채점·판정·금액·단계 로직

**Files:**
- Create: `package.json`, `.gitignore`, `vitest.config.js`
- Create: `js/logic/grading.js`, `js/logic/judge.js`, `js/logic/coop.js`, `js/logic/money.js`, `js/logic/tier.js`, `js/logic/gameCode.js`
- Test: `tests/grading.test.js`, `tests/judge.test.js`, `tests/coop.test.js`, `tests/money.test.js`, `tests/tier.test.js`, `tests/gameCode.test.js` (`seededRand`는 테스트 안의 간단한 LCG 함수)

**Interfaces:**
- Produces:
  - `normalizeAnswer(s: string): string`
  - `parseAccepted(raw: string): string[]`
  - `isCorrect(q: Question, value: number|string|undefined): boolean`
  - `isPresent(p: {online:boolean,lastChanged:number}|undefined, now: number, graceMs = 5000): boolean`
  - `judgeTeam({ memberIds: string[], answers: {[m]:{value}}, presence: {[m]:Presence}, now: number, isMemberCorrect: (m: string, value) => boolean, excluded?: string[] }): "correct"|"wrong"|"none"`
    - `excluded`는 판정에서 무조건 빠지는 팀원이다(협력형에서 조각을 받지 못한 늦은 입장자).
  - `wordsOf(text: string): string[]` (공백류 기준 분할, 빈 토큰 제거)
  - `splitSentence(text: string, n: number): string[]` (Global Constraints의 자르는 법)
  - `assignPieces(text: string, presentIds: string[], rand = Math.random): { pieces: {[m]: string[]}, key: {[m]: number[]} }`
    - presentIds가 0명이면 `{pieces:{}, key:{}}`
    - 1명이면 2조각을 무작위 순서로 그 1명에게 준다.
  - `isCoopCorrect(key: number[], value: number[]|undefined): boolean`
  - `applyOutcome(balance: number, outcome, {reward, tax}): { balance: number, delta: number }`
  - `formatMoney(n: number): string`
  - `rankTeams(balances: {[t]: number}): Array<{ t: string, balance: number, rank: number }>`
  - `wealthTier(balance: number, startMoney: number): 1|2|3|4|5`
  - `makeGameCode(rand = Math.random): string` (6자리, 문자 집합 `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`)

- [ ] **Step 1: 저장소 준비**

`git init`을 실행한다. `.gitignore`에 `node_modules/`, `.superpowers/`, `*.log`를 넣는다. `package.json`은 `"type": "module"`, scripts `"test": "vitest run"`, devDependency `vitest@^5.0.5`로 만든다. 그다음 `npm install`.

- [ ] **Step 2: 실패하는 테스트 작성**

```js
// tests/grading.test.js
expect(normalizeAnswer(" 부가 가치세　 \n")).toBe("부가가치세");
expect(normalizeAnswer("VAT Tax")).toBe("vattax");
expect(parseAccepted("부가가치세, 부가세 ,, ")).toEqual(["부가가치세", "부가세"]);
const tq = { type: "text", acceptedRaw: "부가가치세, 부가세" };
expect(isCorrect(tq, "부가 세")).toBe(true);
expect(isCorrect(tq, "부가가치새")).toBe(false);   // 철자 오류 → 오답
expect(isCorrect(tq, undefined)).toBe(false);
const cq = { type: "choice", answer: 1 };
expect(isCorrect(cq, 1)).toBe(true);
expect(isCorrect(cq, 0)).toBe(false);

// tests/judge.test.js  (now = 100000)
const on = { online: true, lastChanged: 0 };
const offOld = { online: false, lastChanged: 90000 };   // 10초 전 끊김
const offNew = { online: false, lastChanged: 97000 };   // 3초 전 끊김 → 유예
expect(isPresent(offNew, 100000)).toBe(true);
expect(isPresent(offOld, 100000)).toBe(false);
expect(isPresent(undefined, 100000)).toBe(false);
// 아래 호출은 모두 isMemberCorrect: (m, v) => isCorrect(cq, v) 를 넘긴다
// 전원 정답 → correct
judgeTeam({ memberIds:["m1","m2"], answers:{m1:{value:1},m2:{value:1}}, presence:{m1:on,m2:on}, now:100000, isMemberCorrect }) === "correct"
// excluded 팀원은 접속 중이고 미제출이어도 제외 → correct
judgeTeam({ memberIds:["m1","m2"], answers:{m1:{value:1}}, presence:{m1:on,m2:on}, excluded:["m2"], ... }) === "correct"

// tests/coop.test.js
const s = "세금은 국가가 필요한 돈을 국민에게서 거두는 것이다";   // 7단어
expect(splitSentence(s, 3)).toEqual(["세금은 국가가 필요한", "돈을 국민에게서", "거두는 것이다"]);
expect(splitSentence(s, 5)).toEqual(["세금은 국가가", "필요한 돈을", "국민에게서", "거두는", "것이다"]);
expect(wordsOf(" a　b  c ")).toEqual(["a","b","c"]);
const a = assignPieces(s, ["m1","m2","m3"], seededRand);
// 모든 조각이 정확히 한 번씩 배정되고, key[m][i]번째 조각 = pieces[m][i]
// key 값의 합집합이 {1,2,3}
const solo = assignPieces(s, ["m2"], seededRand);
expect(solo.pieces.m2).toHaveLength(2); expect([...solo.key.m2].sort()).toEqual([1,2]);
expect(assignPieces(s, [], seededRand)).toEqual({ pieces:{}, key:{} });
expect(isCoopCorrect([2],[2])).toBe(true); expect(isCoopCorrect([1,2],[2,1])).toBe(false); expect(isCoopCorrect([1],undefined)).toBe(false);
// 접속 중인데 미제출 → wrong
judgeTeam({ memberIds:["m1","m2"], answers:{m1:{value:1}}, presence:{m1:on,m2:on}, ... }) === "wrong"
// 끊겼고 미제출 → 제외 → correct
judgeTeam({ memberIds:["m1","m2"], answers:{m1:{value:1}}, presence:{m1:on,m2:offOld}, ... }) === "correct"
// 끊겼지만 제출함(오답) → 대상 포함 → wrong
judgeTeam({ memberIds:["m1","m2"], answers:{m1:{value:1},m2:{value:0}}, presence:{m1:on,m2:offOld}, ... }) === "wrong"
// 한 번도 안 들어옴(presence 없음) + 미제출 → 대상 0명 → none
judgeTeam({ memberIds:["m1","m2"], answers:{}, presence:{}, ... }) === "none"

// tests/money.test.js
expect(applyOutcome(10000, "correct", {reward:1000, tax:500})).toEqual({ balance: 11000, delta: 1000 });
expect(applyOutcome(200, "wrong", {reward:1000, tax:500})).toEqual({ balance: -300, delta: -500 });
expect(applyOutcome(200, "none", {reward:1000, tax:500})).toEqual({ balance: 200, delta: 0 });
expect(formatMoney(12000)).toBe("12,000원");
expect(formatMoney(0)).toBe("0원");
expect(formatMoney(-3000)).toBe("부채 3,000원");
expect(rankTeams({t1:500,t2:900,t3:500,t4:-100}).map(r=>[r.t,r.rank]))
  .toEqual([["t2",1],["t1",2],["t3",2],["t4",4]]);   // 동점 같은 순위, 같은 금액은 팀 ID 순

// tests/tier.test.js (S = 10000)
[[15000,1],[14999,2],[10000,2],[9999,3],[5000,3],[4999,4],[0,4],[-1,5]]
  .forEach(([b,t]) => expect(wealthTier(b,10000)).toBe(t));
expect(wealthTier(0,0)).toBe(2); expect(wealthTier(-1,0)).toBe(5);

// tests/gameCode.test.js
expect(makeGameCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npx vitest run` → Expected: FAIL (모듈 없음)

- [ ] **Step 4: 위 Interfaces의 함수를 각 파일에 구현**

`normalizeAnswer`는 `s.replace(/[\s　 ]/g, "").toLowerCase()`로 처리한다. `formatMoney`는 `Math.abs(n).toLocaleString("ko-KR")`를 쓴다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run` → Expected: 모두 PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: 채점·판정·금액·재산 단계 로직"
```

---

### Task 2: 게임 초안 모델과 DB 쓰기 내용 만들기

**Files:**
- Create: `js/logic/quizModel.js`, `js/logic/updates.js`
- Test: `tests/quizModel.test.js`, `tests/updates.test.js`

**Interfaces:**
- Consumes: Task 1의 모든 함수
- Produces:
  - `blankQuestion(): Question` (기본값은 Global Constraints를 따른다)
  - `resizeQuestions(qs: Question[], n: number): Question[]` (앞의 문항은 유지하고, 늘어나면 `blankQuestion()`으로 채운다)
  - `blankDraft(): Draft` (팀 t1~t7. 팀 이름은 `"1팀"`~`"7팀"`이고 팀원은 비어 있다. 문항은 1개다.)
  - `validateDraft(d: Draft): string[]` (오류 메시지 목록. 비어 있으면 통과)
  - `buildStartGame({ code, uid, draft, now }): object` → 다음 경로를 담은 multi-path update 객체
    - `games/{code}/meta`
    - `games/{code}/teams`
    - `games/{code}/balances`
    - `teachers/{uid}/keys/{code}`
    - `teachers/{uid}/activeGame`
  - `buildOpenQuestion({ code, uid, q, question, serverNow, present: {[t]: string[]}, rand = Math.random }): { updates: object, coopKey: {[t]:{[m]:number[]}} | null }`
    - `current`에는 `answer`와 `acceptedRaw`가 **절대 들어가지 않는다**. 협력형이면 문장(`text`)도 들어가지 않는다.
    - `updates`에 들어가는 경로:
      - `games/{code}/current = {q, text, type, choices, endsAt: serverNow + seconds*1000, phase:"open"}`
        - 협력형이면 `text: "협력 문항: 팀원과 문장 순서를 맞추세요!"`, `choices: null`
      - `games/{code}/played/{q} = true`
      - 협력형이면 팀마다 `assignPieces(question.text, present[t], rand)` 결과로 두 경로를 추가한다.
        - `games/{code}/pieces/{q}/{t}/{m}`
        - `games/{code}/pieceCount/{q}/{t}` (그 팀 조각 수. 1명이면 2)
        - `teachers/{uid}/keys/{code}/coop/{q}/{t}/{m}`
  - `buildReveal({ code, q, question, teams, answers, presence, balances, startMoney, now, alreadyRevealed, coopKey }): { updates: object, results: {[t]:{outcome,delta,balance,tier}} } | null`
    - 협력형이면 `isMemberCorrect = (m, v) => isCoopCorrect(coopKey[t][m], v)`를 쓴다.
    - `excluded`는 `coopKey[t]`에 없는 팀원 전부다.
    - `results/{q}/{t}`에 `key: coopKey[t]`도 넣는다. 오답 팀 표의 "정답 번호" 칸에 쓴다.
    - `alreadyRevealed`가 true면 `null`을 돌려준다.
    - `updates`에 들어가는 경로:
      - `reveal/{q}`
      - `results/{q}/{t}`
      - `balances/{t}`
      - `current/phase = "revealed"`
  - `answerText(question: Question): string`
    - 객관식이면 `"② 누진세"`처럼 원문자와 보기를 쓴다.
    - 주관식이면 accepted 목록을 `" / "`로 이어 붙인다.
    - 협력형이면 문장 전체를 쓴다.
  - `buildEnd({ code, uid, balances }): object` → 다음 경로를 담은 update 객체
    - `final/{t} = {rank, balance}`
    - `meta/status = "ended"`
    - `current = null`
    - `teachers/{uid}/activeGame = null`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// quizModel
expect(resizeQuestions([q1], 3)).toHaveLength(3); expect(resizeQuestions([q1,q2,q3],1)).toEqual([q1]);
const d = blankDraft(); expect(validateDraft(d)).toContain("게임 이름을 입력하세요");
// 팀원 1명인 팀 → "3팀: 팀원은 2~5명이어야 해요"
// 협력형 문장 4단어 → "2번 문항: 협력형 문장은 5단어 이상이어야 해요"
// 같은 팀에 같은 이름 → "3팀: 같은 이름의 팀원이 있어요"
// 객관식 정답 미선택 → "2번 문항: 정답을 고르세요"
// 주관식 정답 비어 있음 → "2번 문항: 정답을 입력하세요"
// seconds 4 → "2번 문항: 제한 시간은 5~300초예요"
// 완전한 초안 → []

// updates
const u = buildOpenQuestion({ code:"ABC234", q:2, question:{type:"choice",text:"Q",choices:["a","b"],answer:1,acceptedRaw:"",reward:1000,tax:500,seconds:30}, serverNow:1000 });
expect(u.updates["games/ABC234/current"]).toEqual({ q:2, text:"Q", type:"choice", choices:["a","b"], endsAt:31000, phase:"open" });
expect(JSON.stringify(u.updates)).not.toContain("answer"); expect(JSON.stringify(u.updates)).not.toContain("accepted");
// 협력형: present {t1:["m1","m2","m3"], t2:["m2"], t3:[]}
// → games/ABC234/current.text에 원문 문장이 없음
// → pieces/2/t1에 3명, pieces/2/t2/m2는 2조각, pieces/2/t3 없음
// → teachers/U/keys/ABC234/coop/2/t1/m1 존재. games/... 경로에는 key가 없음
// buildReveal 협력형: t1 전원 정답 → correct; m3가 늦게 와서 coopKey에 없고 접속 중·미제출이어도 → correct
// buildReveal: t1 정답(+1000), t2 오답(−500, 잔액 200 → −300, tier 5), t3 대상 0명(none, 0)
// → results/2/t2 = {outcome:"wrong", delta:-500, balance:-300, tier:5}
// → balances/t2 = -300
expect(buildReveal({ ..., alreadyRevealed:true })).toBeNull();
expect(answerText({type:"choice",choices:["비례세","누진세"],answer:1})).toBe("② 누진세");
// buildEnd → final/t* 순위가 rankTeams와 같고, meta/status === "ended"
```

- [ ] **Step 2: Run** `npx vitest run` → FAIL

- [ ] **Step 3: 구현**

update 객체의 키는 루트 기준 절대 경로(`games/{code}/...`)로 쓴다. 그래야 `update(ref(db), obj)` 한 번으로 기록할 수 있다.

- [ ] **Step 4: Run** `npx vitest run` → PASS

- [ ] **Step 5: Commit** `git commit -am "feat: 게임 초안 모델과 DB 쓰기 빌더"` (새 파일은 먼저 `git add`)

---

### Task 3: 아바타 SVG

**Files:**
- Create: `js/avatars/avatars.js`, `avatars-preview.html`
- Test: `tests/avatars.test.js`

**Interfaces:**
- Produces:
  - `JOBS: Array<{id, label}>` (Global Constraints의 8종을 그 순서대로)
  - `renderAvatar({ gender, job, tier, size = 160 }): string` → `<svg ... data-gender data-job data-tier>` 문자열

- [ ] **Step 1: 실패하는 테스트**

모든 성별 2 × 직업 8 × 단계 5 조합을 확인한다.
- 각 조합의 결과가 `<svg`로 시작해야 한다.
- 결과에 `data-tier="${tier}"`가 들어 있어야 한다.
- 단계 5에는 `파산` 텍스트가 들어 있어야 한다.
- 알 수 없는 job이면 `office`로 대신 그린다.

- [ ] **Step 2: Run** → FAIL

- [ ] **Step 3: 구현**

레이어를 아래 순서로 쌓는다.
1. 몸/얼굴(성별): 여성은 긴 머리
2. 직업 복장과 소품. 예: 의사 흰 가운+청진기, 요리사 모자, 소방관 헬멧, 프로그래머 노트북, 농부 밀짚모자, 건설노동자 안전모, 교사 책, 회사원 넥타이
3. 단계 레이어

| 단계 | 그림 |
|---|---|
| 1 | 금목걸이, 선글라스, 돈다발, 반짝이 |
| 2 | 웃는 입 |
| 3 | 걱정 눈썹, 구겨진 선 |
| 4 | 울상, 눈물, 옷 패치, 빈 지갑 |
| 5 | 나무통이 몸을 가림, 땀·눈물, 빨간 "파산" 띠 |

색은 고정 hex를 쓴다. TV와 태블릿이 같은 그림을 보여야 하기 때문이다. `avatars-preview.html`은 80개 조합을 격자로 보여 준다.

- [ ] **Step 4: Run** → PASS. `avatars-preview.html`을 브라우저로 열어 80개가 모두 그려지는지, 그리고 단계 차이가 한눈에 보이는지 눈으로 확인한다.

- [ ] **Step 5: Commit** `feat: 직업·재산 단계별 SVG 아바타`

---

### Task 4: 효과음

**Files:**
- Create: `js/sound.js`

**Interfaces:**
- Produces:
  - `sound.coins()`, `sound.tax()`, `sound.bankrupt()`, `sound.tick()`, `sound.fanfare()`
  - `sound.setMuted(b: boolean)`, `sound.isMuted(): boolean`
  - 음소거 상태는 localStorage `tq_muted`에 저장한다. try/catch로 감싼다.
  - `sound.unlock()`은 첫 사용자 탭에서 AudioContext를 resume한다.

- [ ] **Step 1: 구현**

Web Audio 합성으로만 만든다. 외부 파일은 쓰지 않는다. 모두 요란하게 만든다.
- **coins:** 짧은 사인 핑 12회를 40ms 간격으로 무작위 고음(1200~2400Hz)에 낸 뒤, 3화음 상승 팡파르를 붙인다.
- **tax:** 사각파 경고음 2회(400→300Hz), 그다음 낮은 톱니파 "쿵"을 낸다.
- **bankrupt:** 1.2초 동안 하강 글리산도(600→80Hz)를 내고, 노이즈 버스트를 붙인다.
- **tick:** 짧은 클릭(1000Hz, 30ms)을 낸다.
- **fanfare:** 4음 상승 아르페지오 2회 + 화음 유지(1.5초)로 만든다.

- [ ] **Step 2: 확인**

`avatars-preview.html`에 효과음 버튼 5개를 임시로 붙인다. 각각 소리가 나는지, 음소거가 되는지 확인한 뒤 버튼은 그대로 둔다. 이 페이지는 개발용이다.

- [ ] **Step 3: Commit** `feat: Web Audio 효과음`

---

### Task 5: Firebase 연결·보안 규칙·설정 안내서

**Files:**
- Create: `js/config.js`, `js/firebase.js`, `database.rules.json`, `firebase.json`, `.firebaserc`, `docs/설정안내.md`
- Test: `tests/rules/rules.test.js` (별도 스크립트 `"test:rules": "firebase emulators:exec --only database,auth \"vitest run tests/rules\""`)

**Interfaces:**
- Produces (`js/firebase.js`):
  - `db`, `auth`
  - `signInTeacher(): Promise<User>` (Google 팝업)
  - `signInStudent(): Promise<User>` (익명)
  - `serverNow(): number` (`.info/serverTimeOffset`을 구독해 offset을 더한 값)
  - `onTeacher(cb)` (auth 상태 구독)
- `js/config.js`의 형식: `export const firebaseConfig = { apiKey: "", authDomain: "", databaseURL: "", projectId: "", appId: "" };`
  - 값이 비어 있으면 모든 페이지가 "설정이 필요해요 — docs/설정안내.md를 보세요"라고 안내한다.

**규칙 요약:**
- 아래 헬퍼를 정의해 쓴다.
  - `T = root.child('games/'+$code+'/meta/teacherUid').val() === auth.uid`
  - `memberOf($t) = root.child('games/'+$code+'/uidSeat/'+auth.uid+'/t').val() === $t`
  - `seatOwner($t,$m) = root.child('games/'+$code+'/seats/'+$t+'/'+$m+'/uid').val() === auth.uid`
- **교사 데이터**
  - `teachers/$uid`: 읽기·쓰기는 `auth.uid === $uid`만 가능하다.
- **게임 생성과 공용 정보**
  - `games/$code/meta`: 로그인한 사람은 누구나 읽는다. 쓰기는 `T`이거나, 처음 만들 때 `newData.child('teacherUid').val() === auth.uid`여야 한다.
  - `teams`, `seats`, `played`, `current`, `reveal`: 로그인한 사람은 누구나 읽는다. 쓰기는 `T`만 하되, `seats`는 예외다.
- **자리 잡기 (`seats/$t/$m`, `uidSeat/$uid`)**
  - 학생은 빈 자리(`!data.exists()`)에만 자기 uid로 쓸 수 있다. 자기 자리라면 아바타 값을 바꿀 수 있다.
  - `uidSeat/$uid`는 본인만 쓰고, 그 값은 `seats/{t}/{m}/uid === $uid`와 일치해야 한다.
  - 교사는 `seats/$t/$m`와 `uidSeat/$uid`를 둘 다 삭제할 수 있다(자리 풀어 주기). 규칙 테스트 표에 "교사가 자리 풀기 → 허용"을 추가한다.
- **접속 상태 (`presence/$t/$m`)**
  - 쓰기는 `seatOwner`, 읽기는 `T`만 가능하다.
- **팀별 정보 (`balances/$t`, `results/$q/$t`, `final/$t`, `pieceCount/$q/$t`)**
  - 읽기는 `T || memberOf($t)`, 쓰기는 `T`만 가능하다.
- **답 (`answers/$q/$t/$m`)**
  - 쓰기 조건: `!data.exists() && seatOwner($t,$m) && current/q == $q && current/phase == 'open' && now <= current/endsAt + 1500`
  - 읽기 조건: `T || (memberOf($t) && root.child('games/'+$code+'/reveal/'+$q).exists())`
- **협력형 조각 (`pieces/$q/$t/$m`)**
  - 쓰기는 `T`만 가능하다.
  - 읽기 조건: `T || seatOwner($t,$m) || (memberOf($t) && reveal/$q 존재)`
  - 공개 전에는 자기 조각만 읽을 수 있다.

- [ ] **Step 1: 설정 안내서 작성 (`docs/설정안내.md`, 한국어)**

교사가 순서대로 따라 하도록 번호를 매기고, 단계마다 "어디를 누르는지"를 쓴다.
1. Firebase 콘솔에서 프로젝트 만들기. 애널리틱스는 끈다.
2. 웹 앱 등록 후 설정값을 `js/config.js`에 붙여넣기.
3. Authentication에서 **Google**과 **익명** 사용 설정. 승인된 도메인에 `<github아이디>.github.io`를 추가한다.
4. Realtime Database 만들기. 위치는 `asia-southeast1`, 잠금 모드로 시작한다.
5. 규칙 탭에 `database.rules.json` 내용을 붙여넣고 게시하기.
6. GitHub 저장소를 만들고 올리기. Settings → Pages → Branch `main` / root.
7. 접속 주소 확인: `https://<아이디>.github.io/<저장소>/admin.html`

- [ ] **Step 2: 체크포인트 — 교사가 1~5단계를 수행**

교사가 안내서 1~5단계를 하고 `js/config.js`를 채운다. 이 작업은 사람만 할 수 있다. 끝날 때까지 다음 단계로 가지 않는다.

- [ ] **Step 3: 규칙 테스트 작성**

다음 경우를 각각 허용 또는 거부하는지 확인한다.

| 경우 | 기대 결과 |
|---|---|
| 학생이 `teachers/{교사uid}/keys` 읽기 | 거부 |
| 학생이 다른 팀 `balances` 읽기 | 거부 |
| 학생이 자기 팀 `balances` 읽기 | 허용 |
| 이미 찬 자리를 다른 학생이 차지 | 거부 |
| 빈 자리 차지 | 허용 |
| 자기 자리로 답 제출 | 허용 |
| 이미 제출한 답 덮어쓰기 | 거부 |
| 남의 자리로 제출 | 거부 |
| `phase:"revealed"` 뒤 제출 | 거부 |
| `endsAt`이 2초 지난 뒤 제출 | 거부 |
| 공개 전 같은 팀 답 읽기 | 거부 |
| 공개 후 같은 팀 답 읽기 | 허용 |
| 공개 후 다른 팀 답 읽기 | 거부 |
| 학생이 `balances` 쓰기 | 거부 |
| 학생이 자기 `pieces` 읽기 | 허용 |
| 공개 전 같은 팀 다른 팀원 `pieces` 읽기 | 거부 |
| 학생이 `teachers/{교사uid}/keys/{code}/coop` 읽기 | 거부 |

- [ ] **Step 4: 규칙 테스트 실행**

먼저 JDK가 필요하다. 이 컴퓨터에는 아직 없다. **설치 전에 사용자에게 허락을 받는다.**

```
winget install EclipseAdoptium.Temurin.21.JDK
```

Run: `npm run test:rules` → Expected: 모두 PASS
- devDependencies: `firebase-tools@^15`, `@firebase/rules-unit-testing@^6`
- JDK 설치가 거절되면, 위 표를 실제 프로젝트의 콘솔 Rules Playground에서 수동으로 확인하고 결과를 기록한다.

- [ ] **Step 5: Commit** `feat: Firebase 연결, 보안 규칙, 설정 안내서`

---

### Task 6: 준비 페이지 (admin.html)

**Files:**
- Create: `admin.html`, `css/common.css`, `css/admin.css`, `js/admin/main.js`

**Interfaces:**
- Consumes:
  - `signInTeacher`, `db` (Task 5)
  - `blankDraft`, `blankQuestion`, `resizeQuestions`, `validateDraft` (Task 2)
- Produces: DB `teachers/{uid}/drafts/*`, `teachers/{uid}/quizSets/*` (구조는 위 DB 구조)

- [ ] **Step 1: 구현**

화면은 위에서 아래로 다음과 같이 구성한다.
- **로그인 버튼**
- **[게임 목록] 영역:** 저장된 초안 목록이 있다. 각 초안에 열기와 삭제가 있다(삭제는 확인 창을 띄운다). "새 게임" 버튼도 있다.
- **편집 영역**
  1. 게임 이름, 팀별 시작 금액 (모든 팀 동일)
  2. 7팀 카드: 팀명과 팀원 이름 칸 5개. 3~5번째 칸은 "(선택)"으로 표시한다.
  3. 문항 제작
     - "문항 수" 숫자 입력을 바꾸면 `resizeQuestions`를 적용한다. 수가 줄어 내용이 있는 문항이 지워질 때는 확인 창을 띄운다.
     - 문항 카드: 문제, 유형 토글(객관식/주관식/협력형)
       - 객관식: 보기 2~5칸(추가/삭제 가능), 정답 라디오
       - 주관식: "정답 (여러 개면 쉼표로)" 칸
       - 협력형
         - "문제" 칸의 이름을 "문장 (5단어 이상)"으로 바꾼다.
         - 아래에 현재 단어 수를 실시간으로 표시한다(5 미만이면 빨간색).
         - 미리보기로 "4명 팀이면: 조각1 / 조각2 / …"를 보여 준다(`splitSentence`).
     - 상금, 세금, 제한 시간(초)
     - "문항 세트로 저장"(이름 입력), "문항 세트 불러오기"(목록에서 선택하면 현재 문항을 교체한다. 확인 창을 띄운다)
  4. **저장** 버튼
     - `validateDraft` 오류가 있으면 목록을 빨간 상자로 보여 주고 해당 칸으로 스크롤한다.
     - 통과하면 `drafts/{id}`에 저장하고 "저장했어요. 수업 시간에 교사 화면에서 이 게임을 시작하세요"를 띄운다.

- [ ] **Step 2: 확인**

브라우저(로컬 정적 서버 `npx http-server -p 5173` 또는 VS Code Live Server)에서 다음을 차례로 한다.
- 로그인
- 7팀 입력, 문항 4개(객관식 2, 주관식 1, 협력형 1)로 저장. 협력형을 4단어로 쓰면 저장이 막히는지 확인
- 새로고침 뒤 다시 열어 값이 그대로인지 확인
- 문항 세트를 저장한 뒤 "새 게임"에서 불러오기
- 팀원이 1명인 팀이 있을 때 저장하면 오류 메시지가 보이는지 확인

- [ ] **Step 3: Commit** `feat: 게임 준비 페이지`

---

### Task 7: 교사 화면 — 로그인·게임 고르기·대기방·복귀

**Files:**
- Create: `teacher.html`, `css/tv.css`, `js/teacher/main.js`, `js/teacher/lobby.js`, `js/ui/qr.js`

**Interfaces:**
- Consumes:
  - `buildStartGame` (Task 2)
  - `makeGameCode`, `formatMoney`, `rankTeams`, `wealthTier` (Task 1)
  - `renderAvatar` (Task 3)
- Produces:
  - `renderQR(el: HTMLElement, url: string, sizePx: number)`
  - `joinUrl(code): string` = 현재 위치 기준 `index.html?g=CODE`
  - 교사 화면 상태 머신 `show(state: "login"|"list"|"lobby"|"play"|"end")`

- [ ] **Step 1: 구현**
  - **로그인 후 복귀:** `teachers/{uid}/activeGame`이 있으면 그 게임의 `meta/status`에 따라 lobby/play/end로 바로 복귀한다. 이때 `keys/{code}`를 메모리에 읽어 둔다.
  - **게임 고르기 화면:** 초안 **이름만** 큰 카드로 보여 준다(TV 노출 대비). 카드를 누르면 "이 게임을 시작할까요?" 확인 창을 띄운다.
    - 확인하면 `makeGameCode`로 코드를 만들고, `games/{code}/meta`가 이미 있으면 다시 만든다.
    - 그다음 `update(ref(db), buildStartGame(...))`을 실행한다.
  - **대기방**
    - 왼쪽에 큰 QR(500px 이상)과 입장 코드, 그리고 짧은 주소를 둔다.
    - 오른쪽에 7팀 카드를 둔다.
      - 팀원마다 입장하면 아바타(`tier = 2`로 표시)와 ✅, 미입장이면 회색 ⬜과 이름을 보여 준다.
      - 자리 옆 작은 "풀기" 버튼은 확인 창을 띄운 뒤 `seats/{t}/{m}`와 `uidSeat/{uid}`를 삭제한다.
    - 상단에 "입장 12 / 21명"을 표시한다.
    - **게임 시작** 버튼은 `meta/status = "playing"`으로 바꾼다. 미입장이 있으면 "아직 3명이 들어오지 않았어요. 시작할까요?" 확인 창을 띄운다.
  - **효과음 버튼:** 화면 구석에 음소거 토글을 둔다.

- [ ] **Step 2: 확인**

다음을 차례로 확인한다.
- Task 6에서 만든 초안으로 시작한다.
- QR이 보이는지 확인한다.
- 다른 브라우저 창에서 `index.html?g=CODE`가 열리는지 확인한다(학생 화면은 Task 8에서 만든다).
- 교사 탭을 새로고침하면 대기방으로 복귀하는지 확인한다.

- [ ] **Step 3: Commit** `feat: 교사 화면 대기방과 복귀`

---

### Task 8: 학생 화면 — 입장·자리·아바타·접속 상태

**Files:**
- Create: `index.html`, `css/student.css`, `js/student/main.js`

**Interfaces:**
- Consumes: `signInStudent`, `db`, `serverNow`, `renderAvatar`, `JOBS`, `formatMoney`, `wealthTier`
- Produces: DB에 다음 값을 쓴다.
  - `seats/{t}/{m}`, `uidSeat/{uid}`
  - `presence/{t}/{m}`: `onDisconnect`로 `{online:false, lastChanged: serverTimestamp}`, 접속하면 `{online:true, lastChanged: serverTimestamp}`
  - localStorage `tq_seat_{code}` = `{t, m}`

- [ ] **Step 1: 구현**
  - **익명 로그인과 자동 복귀:** URL `?g=`가 없거나 게임이 없으면 "입장 코드를 확인하세요"와 코드 입력칸을 보여 준다.
    - `uidSeat/{uid}`가 있으면 바로 해당 상태로 복귀한다. 익명 uid는 같은 기기·브라우저에서 유지된다.
  - **팀 선택:** 팀명 큰 버튼 7개.
  - **이름 선택:** 차 있는 이름은 회색으로 비활성화한다.
    - 이름을 누르면 `runTransaction(seats/{t}/{m})`으로 빈 자리일 때만 차지하고, 그다음 `uidSeat`을 쓴다.
    - 실패하면 "이미 선택된 이름이에요"를 띄운다.
  - **아바타 선택:** 성별 2개 × 직업 8개를 고르고, 미리보기는 `tier 2`로 보여 준다. "입장하기"를 누르면 `seats`에 `gender`, `job`을 저장한다.
  - **대기 화면:** "선생님이 시작할 때까지 기다리세요"와 내 아바타를 보여 준다.
  - **상단 고정 바:** 게임이 시작된 뒤에는 항상 보인다. 내 아바타(현재 단계), 팀명, **우리 팀 잔액**(`formatMoney`; 부채면 빨간 배경)을 보여 준다.
  - `.info/connected`가 true가 될 때마다 presence를 다시 쓴다.
  - 화면 전체를 상태 색으로 칠한다(대기 회색 / 풀이 파랑 / 제출 완료 초록 / 결과).

- [ ] **Step 2: 확인**

브라우저 창 3개로 학생 3명을 흉내 낸다.
- TV 대기방에 아바타가 바로 뜨는지 확인한다.
- 같은 이름을 동시에 누르면 한 명만 성공하는지 확인한다.
- 학생 탭을 새로고침하면 자리로 복귀하는지 확인한다.
- 교사가 "풀기"를 누르면 학생이 팀 선택으로 돌아가는지 확인한다.

- [ ] **Step 3: Commit** `feat: 학생 입장·자리·아바타`

---

### Task 9: 문제 진행 — 열기·카운트다운·제출·QR 보기

**Files:**
- Create: `js/teacher/play.js`
- Modify: `js/student/main.js`, `css/tv.css`, `css/student.css`

**Interfaces:**
- Consumes: `buildOpenQuestion`, `serverNow`, `renderQR`, `joinUrl`, `rankTeams`, `formatMoney`, `renderAvatar`, `wealthTier`, `sound.tick`

- [ ] **Step 1: 교사(TV) 진행 화면 구현**
  - **화면 배치**
    - 상단 문항 번호 버튼(번호만 표시). `played`에 있는 번호는 ✔ 표시를 하고 비활성화한다.
    - 오른쪽 세로 패널에 7팀 순위·잔액·대표 아바타를 늘 보여 준다. 각 팀원 아바타는 작게 표시한다.
  - **번호를 누르면** 다음을 차례로 한다.
    1. `seats`와 `presence`를 읽어 팀별 접속 팀원 목록(`present`)을 만든다. 기준은 `isPresent(presence, serverNow())`이다.
    2. `update(ref(db), buildOpenQuestion(...).updates)`를 실행한다.
    3. `coopKey`를 메모리에 둔다. DB의 `keys/{code}/coop`에도 이미 들어가 있으므로 새로고침해도 복구된다.
  - **문제 진행 중 TV에 보이는 것**
    - 문제(64px 이상)와 객관식 보기(번호와 보기 글자만)
    - 남은 시간 120px 이상. 마지막 5초는 빨간색 + 맥박 애니메이션 + 매초 `sound.tick()`
    - 팀별 "2/3명 제출" 현황: `answers/{q}/{t}`의 키 개수를 센다. 내용은 화면에 쓰지 않는다.
    - 연결이 끊긴 팀원은 "⚠ 연결 끊김 — 이름"을 노란 배경으로 표시한다(`isPresent` 기준).
  - **0초가 되면** "마감!"을 표시하고, **정답 공개** 버튼을 강조한다. 정답 공개는 마감 전에도 누를 수 있다.
  - **화면 하단 작은 "QR 보기" 버튼:** 누르면 QR, 입장 코드, 닫기 버튼이 있는 오버레이를 띄운다. 카운트다운은 계속된다.

- [ ] **Step 2: 학생 문항 화면 구현**
  - `current`를 구독한다. `phase:"open"`이고 내 답이 없으면 문항 화면을 보여 준다.
    - 객관식: 큰 보기 버튼을 누르면 선택되고, 그다음 "제출"을 누른다.
    - 주관식: 입력칸과 "제출" 버튼을 보여 준다.
    - 협력형
      - `pieces/{q}/{t}/{m}`을 읽어 조각마다 큰 글씨 카드와 숫자 버튼 1~P를 보여 준다. P는 그 팀 전체 조각 수다.
        - P는 `current`에 넣지 않는다. 학생이 자기 조각 수만으로는 P를 알 수 없기 때문이다. 그래서 `buildOpenQuestion`은 `games/{code}/pieceCount/{q}/{t} = P`도 기록한다(읽기 규칙은 `T || memberOf($t)`, Task 2·5에 반영).
      - 조각이 2개면 각각 번호를 고른다. 같은 번호를 두 번 고를 수는 없다.
      - 제출하는 값은 `number[]`이다.
      - 조각이 없으면(문항이 열린 뒤 입장) "이번 문항은 쉬어요. 다음 문항부터 참여해요"를 보여 준다.
    - 남은 시간은 `serverNow()` 기준으로 표시한다.
  - **제출하면**
    - 버튼은 즉시 비활성화한다.
    - `set(answers/{q}/{t}/{m}, {value, at: serverTimestamp})`를 실행한다.
    - 성공하면 "제출 완료! 다른 팀원을 기다려요"를 띄운다.
    - 거부되면 "시간이 끝났어요"를 띄운다.
  - **0초가 되면** 입력을 잠그고 "마감"을 표시한다.
  - 제출 후에는 수정할 수 없다.

- [ ] **Step 3: 확인**

학생 창 3개(같은 팀 2명, 다른 팀 1명)로 다음을 확인한다.
- 문항을 열면 동시에 보이는지 확인한다.
- 제출 현황이 갱신되는지 확인한다.
- TV에 답 내용이 안 보이는지 확인한다.
- 시간이 끝나면 제출이 막히는지 확인한다.
- 학생 탭을 닫으면 약 5초 뒤 TV에 "⚠ 연결 끊김"이 뜨는지 확인한다.
- QR 오버레이를 연 상태에서 늦게 온 학생이 들어와 다음 문항부터 참여하는지 확인한다.
- 이미 진행한 번호가 비활성화되는지 확인한다.
- 협력형: 3명 팀은 3조각, 1명만 접속한 팀은 2조각을 받는지 확인한다.
- 협력형: TV에 문장이 안 보이는지 확인한다.
- 협력형: 문항이 열린 뒤 들어온 학생에게 "쉬어요"가 뜨는지 확인한다.

- [ ] **Step 4: Commit** `feat: 문항 진행·카운트다운·제출·QR 보기`

---

### Task 10: 정답 공개·상금/세금 연출

**Files:**
- Modify: `js/teacher/play.js`, `js/student/main.js`, `css/tv.css`, `css/student.css`

**Interfaces:**
- Consumes: `buildReveal`, `answerText`, `sound.coins/tax/bankrupt`, `renderAvatar`, `wealthTier`, `formatMoney`

- [ ] **Step 1: 교사 공개 처리 구현**

정답 공개를 누르면 다음을 차례로 한다.
1. 버튼을 바로 비활성화한다.
2. `answers/{q}`, `presence`, `balances`, `results/{q}`의 존재 여부를 `get`으로 읽는다.
3. `buildReveal({..., now: serverNow(), alreadyRevealed: results 존재, coopKey})`를 호출한다. 협력형이면 `coopKey`는 메모리에서, 없으면 `teachers/{uid}/keys/{code}/coop/{q}`에서 가져온다.
   - 결과가 null이 아니면 `update`로 기록한다.
   - null이면(이미 공개됨) 기존 `results`를 읽어 그대로 연출한다.

- [ ] **Step 2: TV 연출 구현**
  1. 정답을 화면 중앙에 120px 이상으로 확대 등장시킨다(0.6초).
  2. 팀 카드를 순서대로(0.3초 간격) 뒤집으며 결과를 보여 준다.
     - **correct:** 초록 배경, "+1,000원 💰", 동전이 떨어지는 CSS 애니메이션. 첫 팀에서 `sound.coins()`를 재생한다.
     - **wrong:** 빨간 배경, "세금 −500원 징수!" 도장 애니메이션. 첫 팀에서 `sound.tax()`를 재생한다.
     - **none:** 회색 배경, "참여자 없음".
  3. 잔액 숫자는 이전 값에서 새 값으로 0.8초 동안 카운트업/다운한다. 부채로 바뀌면 "부채"로 표기한다.
  4. 재산 단계가 바뀐 팀은 아바타를 회전·플래시로 바꿔 보여 준다. 5단계에 새로 들어가면 `sound.bankrupt()`를 재생한다.
  5. 오른쪽 순위 패널이 재정렬되면 위아래 이동 애니메이션과 ▲/▼ 표시를 보여 준다.

- [ ] **Step 3: 학생 결과 화면 구현**

`reveal/{q}`가 생기면 정답을 보여 주고, `results/{q}/{내 팀}`을 읽는다.
- **correct:** "상금 1,000원 획득!"과 축하 애니메이션.
- **wrong:** "세금 500원 징수"를 보여 주고, `answers/{q}/{내 팀}`과 팀 명단으로 표를 만든다.
  - 표의 열: 팀원, 낸 답, ✅/❌
  - 미제출은 "(미제출)"로 쓴다.
  - 객관식 답은 `answerText` 형식의 보기 문구로 쓴다.
  - 협력형 표의 열: 팀원, 받은 조각, 누른 번호, 정답 번호(`results/{q}/{t}/key`), ✅/❌
    - 조각을 2개 받은 학생은 두 줄로 쓴다.
    - 공개 뒤에는 `pieces/{q}/{내 팀}` 전체를 읽을 수 있다.
- **none:** "이번 문항은 판정 대상이 없어요".
- 상단 바 잔액과 아바타 단계를 갱신한다.

- [ ] **Step 4: 확인**

학생 창 4개로 정답 팀, 오답 팀(1명 오답), 미제출 팀, 연결이 끊긴 팀원이 있는 팀을 만들어 공개한다.
- 판정이 스펙대로 나오는지 확인한다.
- 오답 팀 태블릿에만 팀원 답이 보이는지 확인한다.
- 다른 팀 태블릿에서는 다른 팀 결과가 보이지 않는지 확인한다.
- 정답 공개를 빠르게 두 번 누르거나 공개 직후 TV를 새로고침해도 잔액이 한 번만 바뀌는지 확인한다.
- 부채 표기와 파산 아바타가 맞게 나오는지 확인한다.

- [ ] **Step 5: Commit** `feat: 정답 공개·상금/세금·재산 단계 연출`

---

### Task 11: 게임 종료·시상식

**Files:**
- Create: `js/teacher/end.js`
- Modify: `js/teacher/play.js`, `js/student/main.js`

**Interfaces:**
- Consumes: `buildEnd`, `rankTeams`, `sound.fanfare`, `renderAvatar`

- [ ] **Step 1: 구현**
  - **자동 종료:** 모든 문항이 `played`이고 마지막 공개가 끝나면, 8초 뒤(또는 "최종 결과 보기"를 누르면) `buildEnd`를 기록한다.
  - **수동 종료:** 화면 하단 "게임 종료" 버튼은 "게임을 끝낼까요? 남은 문항은 진행되지 않아요" 확인 창을 띄운 뒤 `buildEnd`를 기록한다.
  - **TV 시상식**
    - 7위부터 1위까지 차례로 등장한다.
    - 1~3위는 단상 위에 아바타와 함께 서고, `sound.fanfare()`를 재생하며 꽃가루를 뿌린다.
    - 동점은 같은 단에 함께 선다.
    - 하단에 "새 게임으로" 버튼을 둔다(게임 고르기 화면으로 이동).
  - **학생 화면:** "게임 끝!" 아래에 우리 팀 최종 순위("7팀 중 2위"), 최종 잔액, 팀원 아바타를 보여 준다.

- [ ] **Step 2: 확인**

다음 두 경우를 모두 확인한다.
- 문항 2개짜리 게임을 끝까지 진행하면 자동으로 종료된다.
- 문항 5개짜리 게임은 중간에 종료할 수 있다.

종료 뒤 TV를 새로고침했을 때 activeGame이 null이어서 게임 고르기 화면이 뜨는지도 확인한다.

- [ ] **Step 3: Commit** `feat: 게임 종료와 시상식`

---

### Task 12: 배포와 교실 리허설

**Files:**
- Modify: `docs/설정안내.md` (6~7단계 확인, "수업 당일 순서" 절 추가)

- [ ] **Step 1: 배포**

다음 순서로 배포한다. **원격 저장소를 만들고 올리기 전에 사용자에게 저장소 이름과 공개 여부를 확인한다.**
1. GitHub 저장소를 만든다.
2. `git push`
3. Pages를 켠다.
4. Firebase Authentication의 승인된 도메인에 `*.github.io` 도메인을 추가한다.

- [ ] **Step 2: 리허설 체크리스트 실행 (배포된 주소, 실제 안드로이드 태블릿 2대 이상 + 교사 태블릿·TV)**

다음 항목을 모두 확인한다.
- QR을 찍으면 바로 열리는지
- TV 뒷자리에서 문제, 남은 시간, 잔액이 읽히는지
- 학생 와이파이와 교사 와이파이가 달라도 동작하는지(휴대폰 핫스팟으로 확인)
- 태블릿 화면을 30초 껐다 켜면 자동으로 복귀하는지
- 효과음이 TV에서 나오는지, 음소거가 되는지

- [ ] **Step 3: "수업 당일 순서" 절 작성**

다음 순서를 정리한다.
1. 수업 전: PC에서 admin.html로 준비한다.
2. TV를 연결한다.
3. 교사 태블릿에서 teacher.html을 열고 게임을 고른다.
4. 학생이 QR로 입장한다.
5. 게임을 시작한다.
6. 진행 중에 늦게 온 학생이 있으면 QR 보기를 누른다.
7. 게임을 종료한다.

- [ ] **Step 4: Commit** `docs: 배포와 수업 당일 안내`
