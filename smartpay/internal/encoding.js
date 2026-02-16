export function toHexString(amount, decimals = 18) {
  if (!Number.isFinite(Number(amount))) {
    return '0x0';
  }

  const str = String(amount);
  const dotIndex = str.indexOf('.');
  let intPart, fracPart;

  if (dotIndex === -1) {
    intPart = str;
    fracPart = '';
  } else {
    intPart = str.slice(0, dotIndex);
    fracPart = str.slice(dotIndex + 1);
  }

  // Pad or truncate fractional part to match decimals
  if (fracPart.length < decimals) {
    fracPart = fracPart.padEnd(decimals, '0');
  } else {
    fracPart = fracPart.slice(0, decimals);
  }

  const combined = intPart + fracPart;
  // Remove leading zeros but keep at least one digit
  const trimmed = combined.replace(/^0+/, '') || '0';
  const scaled = BigInt(trimmed);

  return `0x${scaled.toString(16)}`;
}
