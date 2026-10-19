// 게임 중 학생 화면. Task 9~11에서 문제·결과·종료 화면을 채운다.
export function playView(S) {
  return {
    key: `idle:${S.meta.status}`,
    mood: "wait",
    html: `<section class="screen"><h1>다음 문제를 기다려요</h1><p class="hint">선생님이 문제를 열면 여기에 나와요.</p></section>`,
  };
}
