// 잔액 계산, 표기("부채 3,000원"), 순위.

export function applyOutcome(balance, outcome, { reward, tax }) {
  const delta = outcome === "correct" ? reward : outcome === "wrong" ? -tax : 0;
  return { balance: balance + delta, delta };
}

export function formatMoney(n) {
  const abs = Math.abs(n).toLocaleString("ko-KR");
  return n < 0 ? `부채 ${abs}원` : `${abs}원`;
}

export function rankTeams(balances) {
  const rows = Object.entries(balances)
    .map(([t, balance]) => ({ t, balance }))
    .sort((a, b) => b.balance - a.balance || a.t.localeCompare(b.t));
  rows.forEach((r, i) => {
    r.rank = i > 0 && rows[i - 1].balance === r.balance ? rows[i - 1].rank : i + 1;
  });
  return rows;
}
