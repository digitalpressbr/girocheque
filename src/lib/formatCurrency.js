export function formatBRL(value) {
  if (value === null || value === undefined || isNaN(value)) return "R$ 0,00";
  const num = Number(value);
  const fixed = Math.abs(num).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  let formatted = "";
  const digits = intPart.split("").reverse();
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && i % 3 === 0) formatted = "." + formatted;
    formatted = digits[i] + formatted;
  }
  const sign = num < 0 ? "-" : "";
  return sign + "R$ " + formatted + "," + decPart;
}

export function parseBRLInput(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) return "0,00%";
  const fixed = Math.abs(Number(value)).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const sign = Number(value) < 0 ? "-" : "";
  return sign + intPart + "," + decPart + "%";
}