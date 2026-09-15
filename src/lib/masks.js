export function currencyMask(value) {
  let digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  if (isNaN(num)) return "";
  const str = String(num);
  let intPart, decPart;
  if (str.length <= 2) {
    intPart = "0";
    decPart = str.padStart(2, "0");
  } else {
    intPart = str.slice(0, str.length - 2);
    decPart = str.slice(-2);
  }
  let formatted = "";
  const chars = intPart.split("").reverse();
  for (let i = 0; i < chars.length; i++) {
    if (i > 0 && i % 3 === 0) formatted = "." + formatted;
    formatted = chars[i] + formatted;
  }
  return formatted + "," + decPart;
}

export function percentMask(value) {
  let cleaned = String(value).replace(/[^0-9,]/g, "");
  const parts = cleaned.split(",");
  if (parts.length > 2) {
    cleaned = parts[0] + "," + parts.slice(1).join("");
  }
  return cleaned;
}

export function phoneMask(value) {
  let digits = String(value).replace(/\D/g, "").substring(0, 11);
  if (!digits) return "";
  let result = "";
  if (digits.length > 0) result = "(" + digits.substring(0, 2);
  if (digits.length >= 2) result += ") ";
  if (digits.length > 2) {
    if (digits.length <= 10) {
      result += digits.substring(2, 6);
      if (digits.length > 6) result += "-" + digits.substring(6, 10);
    } else {
      result += digits.substring(2, 7);
      if (digits.length > 7) result += "-" + digits.substring(7, 11);
    }
  }
  return result;
}

export function cpfMask(value) {
  let digits = String(value).replace(/\D/g, "").substring(0, 11);
  if (!digits) return "";
  let result = "";
  if (digits.length > 0) result += digits.substring(0, 3);
  if (digits.length > 3) result += "." + digits.substring(3, 6);
  if (digits.length > 6) result += "." + digits.substring(6, 9);
  if (digits.length > 9) result += "-" + digits.substring(9, 11);
  return result;
}