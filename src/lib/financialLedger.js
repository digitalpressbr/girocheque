// Pure financial ledger helpers for GiroCheque.
// No external deps, no mutation of inputs, defensive parsing.

import { normalizeResponsavelName } from "./responsaveis";

const DAY_MS = 86400000;
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function roundMoney(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

// Local calendar day as YYYY-MM-DD (never toISOString, to avoid UTC shift).
export function localDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return (
    String(date.getFullYear()) +
    "-" +
    pad2(date.getMonth() + 1) +
    "-" +
    pad2(date.getDate())
  );
}

function isKey(v) {
  return typeof v === "string" && KEY_RE.test(v);
}

// Calendar-day diff built from UTC components of the keys, timezone-independent.
export function daysUntil(target, today) {
  if (!isKey(target) || !isKey(today)) return NaN;
  const [ty, tm, td] = target.split("-").map(Number);
  const [ny, nm, nd] = today.split("-").map(Number);
  const t = Date.UTC(ty, tm - 1, td);
  const n = Date.UTC(ny, nm - 1, nd);
  return Math.round((t - n) / DAY_MS);
}

export function calculateCashPosition({ capital = 0, cheques = [], movimentacoes = [], renovacoes = [] } = {}) {
  const cap = num(capital);

  let transferidoTotal = 0;
  let compensadosTotal = 0;
  let emCheques = 0;

  for (const c of cheques) {
    if (!c) continue;
    const face = num(c.valor_cheque);
    const transf = num(c.valor_transferido);
    transferidoTotal += transf;
    if (c.status === "compensado") compensadosTotal += face;
    else if (c.status === "em_aberto") emCheques += face;
  }

  let aportes = 0;
  let devolucoes = 0;
  let retiradas = 0;

  for (const m of movimentacoes) {
    if (!m) continue;
    const v = num(m.valor);
    if (m.tipo === "aporte") aportes += v;
    else if (m.tipo === "devolucao") devolucoes += v;
    else if (m.tipo === "retirada") retiradas += v;
  }

  let realizedProfit = 0;
  for (const r of renovacoes) {
    if (!r) continue;
    realizedProfit += num(r.valor_lucro_realizado);
  }

  const particular = roundMoney(aportes - devolucoes);
  const disponivel = roundMoney(
    cap - transferidoTotal + compensadosTotal + aportes - devolucoes - retiradas + realizedProfit
  );
  const saldoTotal = roundMoney(disponivel + emCheques - particular);

  return {
    disponivel,
    particular,
    emCheques: roundMoney(emCheques),
    saldoTotal,
  };
}

function inPeriod(dateKey, period, mode) {
  if (!isKey(dateKey)) return false;
  if (mode === "year") return dateKey.slice(0, 4) === period;
  return dateKey.slice(0, 7) === period;
}

function bucketKey(dateKey, mode) {
  return mode === "year" ? dateKey.slice(0, 7) : dateKey;
}

export function buildLedger({ cheques = [], movimentacoes = [], renovacoes = [], period = "", mode = "month" } = {}) {
  const buckets = new Map();
  const items = [];
  const undatedCompensated = [];

  let entradas = 0;
  let saidas = 0;

  const touch = (key) => {
    let b = buckets.get(key);
    if (!b) {
      b = { key, entradas: 0, saidas: 0, saldo: 0 };
      buckets.set(key, b);
    }
    return b;
  };

  const addEntrada = (key, valor, origem) => {
    const v = num(valor);
    if (!Number.isFinite(v)) return;
    entradas += v;
    const b = touch(bucketKey(key, mode));
    b.entradas += v;
    items.push({ key, tipo: "entrada", valor: roundMoney(v), origem });
  };

  const addSaida = (key, valor, origem) => {
    const v = num(valor);
    if (!Number.isFinite(v)) return;
    saidas += v;
    const b = touch(bucketKey(key, mode));
    b.saidas += v;
    items.push({ key, tipo: "saida", valor: roundMoney(v), origem });
  };

  for (const c of cheques) {
    if (!c) continue;
    const captacao = c.data_captacao;
    if (isKey(captacao) && inPeriod(captacao, period, mode)) {
      addSaida(captacao, c.valor_transferido, "cheque");
    }
    if (c.status === "compensado") {
      const comp = c.data_compensacao;
      if (isKey(comp) && inPeriod(comp, period, mode)) {
        addEntrada(comp, c.valor_cheque, "cheque");
      } else {
        undatedCompensated.push(c);
      }
    }
  }

  for (const m of movimentacoes) {
    if (!m) continue;
    const data = m.data;
    if (!isKey(data) || !inPeriod(data, period, mode)) continue;
    if (m.tipo === "aporte") addEntrada(data, m.valor, "aporte");
    else if (m.tipo === "retirada") addSaida(data, m.valor, "retirada");
    else if (m.tipo === "devolucao") addSaida(data, m.valor, "devolucao");
  }

  for (const r of renovacoes) {
    if (!r) continue;
    const data = r.data_realizacao;
    if (!isKey(data) || !inPeriod(data, period, mode)) continue;
    const raw = num(r.valor_lucro_realizado);
    if (!Number.isFinite(raw)) continue;
    entradas += raw;
    const b = touch(bucketKey(data, mode));
    b.entradas += raw;
    const emitente = r.emitente_snapshot ? String(r.emitente_snapshot) : "";
    items.push({
      key: data,
      tipo: "entrada",
      origem: "realizacao_lucro",
      kind: "realizacao_lucro",
      data,
      valor: roundMoney(raw),
      descricao: emitente ? "Lucro realizado — " + emitente : "Lucro realizado",
    });
  }

  const series = Array.from(buckets.values())
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((b) => ({
      key: b.key,
      entradas: roundMoney(b.entradas),
      saidas: roundMoney(b.saidas),
      saldo: roundMoney(b.entradas - b.saidas),
    }));

  return {
    entradas: roundMoney(entradas),
    saidas: roundMoney(saidas),
    saldo: roundMoney(entradas - saidas),
    series,
    items,
    undatedCompensated,
  };
}

export function buildFinancialReport({ capital = 0, cheques = [], movimentacoes = [], renovacoes = [], period = "", mode = "month", dataInicio = "" } = {}) {
  const cap = num(capital);

  const cash = calculateCashPosition({ capital: cap, cheques, movimentacoes, renovacoes });
  const ledger = buildLedger({ cheques, movimentacoes, renovacoes, period, mode });

  let ganhoAcumulado = 0;
  let compensado = 0;
  for (const c of cheques) {
    if (!c) continue;
    ganhoAcumulado += num(c.valor_lucro);
    if (c.status === "compensado") compensado += num(c.valor_cheque);
  }
  let realizedProfitTotal = 0;
  for (const r of renovacoes) {
    if (!r) continue;
    realizedProfitTotal += num(r.valor_lucro_realizado);
  }
  ganhoAcumulado += realizedProfitTotal;

  const position = {
    saldoTotal: cash.saldoTotal,
    disponivel: cash.disponivel,
    emCheques: cash.emCheques,
    particular: cash.particular,
    ganhoAcumulado: roundMoney(ganhoAcumulado),
    compensado: roundMoney(compensado),
  };

  const captured = [];
  for (const c of cheques) {
    if (!c) continue;
    if (isKey(c.data_captacao) && inPeriod(c.data_captacao, period, mode)) captured.push(c);
  }

  let liberado = 0;
  let valorCheques = 0;
  let ganho = 0;
  const buckets = new Map();
  const touchBucket = (key) => {
    let b = buckets.get(key);
    if (!b) { b = { key, valorCheques: 0, liberado: 0 }; buckets.set(key, b); }
    return b;
  };
  for (const c of captured) {
    liberado += num(c.valor_transferido);
    valorCheques += num(c.valor_cheque);
    ganho += num(c.valor_lucro);
    const b = touchBucket(bucketKey(c.data_captacao, mode));
    b.valorCheques += num(c.valor_cheque);
    b.liberado += num(c.valor_transferido);
  }

  let aReceber = 0;
  for (const c of cheques) {
    if (!c) continue;
    if (c.status === "em_aberto" && isKey(c.data_vencimento) && inPeriod(c.data_vencimento, period, mode)) {
      aReceber += num(c.valor_cheque);
    }
  }

  let lucroRenovacoes = 0;
  for (const r of renovacoes) {
    if (!r) continue;
    if (!isKey(r.data_realizacao) || !inPeriod(r.data_realizacao, period, mode)) continue;
    lucroRenovacoes += num(r.valor_lucro_realizado);
  }

  const operations = {
    liberado: roundMoney(liberado),
    valorCheques: roundMoney(valorCheques),
    ganho: roundMoney(ganho),
    aReceber: roundMoney(aReceber),
    lucroRenovacoes: roundMoney(lucroRenovacoes),
    ganhoTotal: roundMoney(ganho + lucroRenovacoes),
  };

  let aportes = 0;
  let devolucoes = 0;
  let retiradas = 0;
  const withdrawalsByResponsible = {};
  for (const m of movimentacoes) {
    if (!m) continue;
    if (!isKey(m.data) || !inPeriod(m.data, period, mode)) continue;
    const v = num(m.valor);
    if (m.tipo === "aporte") aportes += v;
    else if (m.tipo === "devolucao") devolucoes += v;
    else if (m.tipo === "retirada") {
      retiradas += v;
      const nome = normalizeResponsavelName(m.responsavel) || "Não informado";
      withdrawalsByResponsible[nome] = roundMoney((withdrawalsByResponsible[nome] || 0) + v);
    }
  }
  const capitalMovements = {
    aportes: roundMoney(aportes),
    devolucoes: roundMoney(devolucoes),
    retiradas: roundMoney(retiradas),
    withdrawalsByResponsible,
  };

  const series = Array.from(buckets.values())
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((b) => {
      const label = mode === "year"
        ? (() => { const [y, m] = b.key.split("-"); return m + "/" + y; })()
        : b.key;
      return {
        key: b.key,
        label,
        valorCheques: roundMoney(b.valorCheques),
        liberado: roundMoney(b.liberado),
      };
    });

  const items = ledger.items.map((it) => ({
    ...it,
    kind: it.kind || it.tipo + "_" + it.origem,
  }));

  // cashFlow: parte do ledger (cópia) e, se dataInicio estiver dentro do
  // período e houver capital, soma o capital uma única vez em entradas/saldo,
  // adiciona um item sintético capital_inicial e um bucket de série.
  const cfBuckets = new Map();
  for (const b of ledger.series) {
    cfBuckets.set(b.key, { key: b.key, entradas: b.entradas, saidas: b.saidas, saldo: b.saldo });
  }
  const cfItems = ledger.items.map((it) => ({ ...it }));
  let cfEntradas = ledger.entradas;
  let cfSaidas = ledger.saidas;

  const capitalInicialDentro = isKey(dataInicio) && inPeriod(dataInicio, period, mode) && cap > 0;
  if (capitalInicialDentro) {
    const capVal = roundMoney(cap);
    cfEntradas = roundMoney(cfEntradas + capVal);
    const bk = bucketKey(dataInicio, mode);
    let b = cfBuckets.get(bk);
    if (!b) { b = { key: bk, entradas: 0, saidas: 0, saldo: 0 }; cfBuckets.set(bk, b); }
    b.entradas = roundMoney(b.entradas + capVal);
    cfItems.push({
      kind: "capital_inicial",
      origem: "capital_inicial",
      data: dataInicio,
      valor: capVal,
      descricao: "Capital inicial",
    });
  }
  cfItems.sort((a, b) => {
    const ka = a.data || a.key || "";
    const kb = b.data || b.key || "";
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  const cashFlowSeries = Array.from(cfBuckets.values())
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((b) => ({
      key: b.key,
      entradas: roundMoney(b.entradas),
      saidas: roundMoney(b.saidas),
      saldo: roundMoney(b.entradas - b.saidas),
    }));
  const cashFlow = {
    entradas: roundMoney(cfEntradas),
    saidas: roundMoney(cfSaidas),
    saldo: roundMoney(cfEntradas - cfSaidas),
    series: cashFlowSeries,
    items: cfItems,
  };

  const errors = [];
  for (const c of cheques) {
    if (!c) continue;
    const diff = num(c.valor_cheque) - num(c.valor_transferido) - num(c.valor_lucro);
    if (Math.abs(diff) > 0.01) {
      errors.push({ code: "CHEQUE_MISMATCH", id: c.id, difference: roundMoney(diff) });
    }
  }
  const periodDiff = operations.valorCheques - operations.liberado - operations.ganho;
  if (Math.abs(periodDiff) > 0.01) {
    errors.push({ code: "PERIOD_MISMATCH", difference: roundMoney(periodDiff) });
  }
  let retiradasGlobal = 0;
  for (const m of movimentacoes) {
    if (m && m.tipo === "retirada") retiradasGlobal += num(m.valor);
  }
  const positionDiff = position.saldoTotal - (cap + position.ganhoAcumulado - roundMoney(retiradasGlobal));
  if (Math.abs(positionDiff) > 0.01) {
    errors.push({ code: "POSITION_MISMATCH", difference: roundMoney(positionDiff) });
  }

  // CASH_POSITION_MISMATCH: somente quando TODAS as datas relevantes
  // (dataInicio, data_captacao dos cheques, data_compensacao dos compensados,
  // datas das movimentacoes) existem e estão dentro do período selecionado.
  let allDatasDentro = isKey(dataInicio) && inPeriod(dataInicio, period, mode);
  if (allDatasDentro) {
    for (const c of cheques) {
      if (!c) continue;
      if (!isKey(c.data_captacao) || !inPeriod(c.data_captacao, period, mode)) { allDatasDentro = false; break; }
      if (c.status === "compensado" && (!isKey(c.data_compensacao) || !inPeriod(c.data_compensacao, period, mode))) { allDatasDentro = false; break; }
    }
  }
  if (allDatasDentro) {
    for (const m of movimentacoes) {
      if (!m) continue;
      if (!isKey(m.data) || !inPeriod(m.data, period, mode)) { allDatasDentro = false; break; }
    }
  }
  if (allDatasDentro) {
    for (const r of renovacoes) {
      if (!r) continue;
      if (!isKey(r.data_realizacao) || !inPeriod(r.data_realizacao, period, mode)) { allDatasDentro = false; break; }
    }
  }
  if (allDatasDentro) {
    const cashDiff = cashFlow.saldo - position.disponivel;
    if (Math.abs(cashDiff) > 0.01) {
      errors.push({ code: "CASH_POSITION_MISMATCH", difference: roundMoney(cashDiff) });
    }
  }

  return {
    position,
    operations,
    capitalMovements,
    series,
    items,
    cashFlow,
    undatedCompensated: ledger.undatedCompensated,
    audit: { ok: errors.length === 0, errors },
  };
}