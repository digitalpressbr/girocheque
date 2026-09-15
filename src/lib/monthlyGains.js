const MONTH_RE = /^\d{4}-\d{2}$/;

function monthKey(dateStr) {
  if (typeof dateStr !== "string" || dateStr.length < 7) return "";
  const key = dateStr.substring(0, 7);
  return MONTH_RE.test(key) ? key : "";
}

function roundMoney(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export function buildMonthlyGainsMap({ cheques = [], renovacoes = [] } = {}) {
  const map = {};

  for (const c of cheques) {
    if (!c) continue;
    const key = monthKey(c.data_captacao);
    if (!key) continue;
    if (!Object.prototype.hasOwnProperty.call(map, key)) map[key] = 0;
    map[key] += Number(c.valor_lucro) || 0;
  }

  for (const r of renovacoes) {
    if (!r) continue;
    const key = monthKey(r.data_realizacao);
    if (!key) continue;
    if (!Object.prototype.hasOwnProperty.call(map, key)) map[key] = 0;
    map[key] += Number(r.valor_lucro_realizado) || 0;
  }

  for (const k of Object.keys(map)) {
    map[k] = roundMoney(map[k]);
  }

  return map;
}