// 재산 단계: 1 부자, 2 여유, 3 빠듯함, 4 불쌍함, 5 파산.

export function wealthTier(balance, startMoney) {
  if (balance < 0) return 5;
  if (startMoney <= 0) return 2;
  if (balance >= startMoney * 1.5) return 1;
  if (balance >= startMoney) return 2;
  if (balance >= startMoney * 0.5) return 3;
  return 4;
}
