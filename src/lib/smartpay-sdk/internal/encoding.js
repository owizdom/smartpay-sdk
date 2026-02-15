export function toHexString(amount, decimals = 18) {
  if (!Number.isFinite(Number(amount))) {
    return '0x0';
  }

  const numeric = Number(amount);
  const scaled = BigInt(Math.round(numeric * 10 ** Math.max(0, decimals)));
  return `0x${scaled.toString(16)}`;
}
