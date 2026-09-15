import { describe, it, expect } from "vitest";
import {
  localDateKey,
  daysUntil,
  calculateCashPosition,
  buildLedger,
  buildFinancialReport,
} from "./financialLedger";

describe("localDateKey", () => {
  it("preserves the local calendar day instead of shifting it to UTC", () => {
    // 23:00 local on Aug 9 — toISOString() would roll to Aug 10 in UTC-3,
    // but the local calendar day is still Aug 9.
    const lateEvening = new Date(2026, 7, 9, 23, 0, 0);
    expect(localDateKey(lateEvening)).toBe("2026-08-09");
  });
});

describe("daysUntil", () => {
  it("returns 0 when the target date is today", () => {
    expect(daysUntil("2026-08-09", "2026-08-09")).toBe(0);
  });

  it("returns a positive count for a future due date", () => {
    expect(daysUntil("2026-08-10", "2026-08-09")).toBe(1);
  });

  it("returns a negative count for an overdue due date", () => {
    expect(daysUntil("2026-08-08", "2026-08-09")).toBe(-1);
  });
});

describe("calculateCashPosition", () => {
  it("derives disponivel, particular, emCheques and saldoTotal with retirada reducing only cash", () => {
    const result = calculateCashPosition({
      capital: 10000,
      cheques: [
        { status: "em_aberto", valor_cheque: 1500, valor_transferido: 1000 },
      ],
      movimentacoes: [
        { tipo: "aporte", valor: 500 },
        { tipo: "devolucao", valor: 100 },
        { tipo: "retirada", valor: 200 },
      ],
    });

    // 10000 - 1000 (transferido) + 0 (compensados) + 500 (aporte) - 100 (devolucao) - 200 (retirada)
    expect(result.disponivel).toBe(9200);
    // 500 (aporte) - 100 (devolucao); retirada does NOT eat into particular
    expect(result.particular).toBe(400);
    expect(result.emCheques).toBe(1500);
    // 9200 + 1500 - 400
    expect(result.saldoTotal).toBe(10300);
  });
});

describe("buildLedger", () => {
  const cheques = [
    {
      status: "compensado",
      valor_cheque: 1100,
      valor_transferido: 900,
      data_captacao: "2026-07-20",
      data_compensacao: "2026-08-05",
    },
    {
      status: "em_aberto",
      valor_cheque: 1000,
      valor_transferido: 800,
      data_captacao: "2026-08-02",
    },
  ];
  const movimentacoes = [
    { tipo: "aporte", valor: 500, data: "2026-08-03" },
    { tipo: "retirada", valor: 200, data: "2026-08-04" },
    { tipo: "devolucao", valor: 50, data: "2026-08-06" },
  ];

  it("totals entradas (compensated face + aporte), saidas (transferido + retirada + devolucao) and saldo for 2026-08", () => {
    const ledger = buildLedger({
      cheques,
      movimentacoes,
      period: "2026-08",
      mode: "month",
    });

    // entradas: 1100 (compensado face) + 500 (aporte) = 1600
    expect(ledger.entradas).toBe(1600);
    // saídas: 800 (transferido) + 200 (retirada) + 50 (devolucao) = 1050
    expect(ledger.saidas).toBe(1050);
    expect(ledger.saldo).toBe(550);
  });

  it("groups series by day in month mode", () => {
    const ledger = buildLedger({
      cheques,
      movimentacoes,
      period: "2026-08",
      mode: "month",
    });

    const byDay = {};
    ledger.series.forEach((point) => {
      byDay[point.key] = point;
    });

    expect(byDay["2026-08-02"].saidas).toBe(800);
    expect(byDay["2026-08-03"].entradas).toBe(500);
    expect(byDay["2026-08-04"].saidas).toBe(200);
    expect(byDay["2026-08-05"].entradas).toBe(1100);
    expect(byDay["2026-08-06"].saidas).toBe(50);
  });

  it("keeps a compensated cheque without data_compensacao out of totals and series, listing it in undatedCompensated", () => {
    const undatedCheque = {
      status: "compensado",
      valor_cheque: 2000,
      valor_transferido: 1800,
      data_captacao: "2026-07-10",
    };

    const ledger = buildLedger({
      cheques: [...cheques, undatedCheque],
      movimentacoes,
      period: "2026-08",
      mode: "month",
    });

    // totals unchanged by the undated compensated cheque
    expect(ledger.entradas).toBe(1600);
    expect(ledger.saidas).toBe(1050);
    expect(ledger.saldo).toBe(550);

    // it is reported separately, not counted anywhere
    expect(ledger.undatedCompensated.length).toBe(1);
    expect(ledger.undatedCompensated[0]).toMatchObject({ valor_cheque: 2000 });

    // nothing from it leaked into the series
    const leaked = ledger.series.some(
      (p) => p.entradas === 2000 || p.saidas === 1800
    );
    expect(leaked).toBe(false);
  });

  it("groups series by month in year mode", () => {
    const ledger = buildLedger({
      cheques,
      movimentacoes,
      period: "2026",
      mode: "year",
    });

    const byMonth = {};
    ledger.series.forEach((point) => {
      byMonth[point.key] = point;
    });

    expect(byMonth["2026-08"].entradas).toBe(1600);
    expect(byMonth["2026-08"].saidas).toBe(1050);
    expect(byMonth["2026-08"].saldo).toBe(550);
  });
});

describe("buildFinancialReport (aggregated fixture)", () => {
  const capital = 32591.38;
  const cheques = [
    {
      id: "compensado-antigo",
      status: "compensado",
      data_captacao: "2026-06-15",
      data_vencimento: "2026-07-15",
      data_compensacao: null,
      valor_cheque: 55194,
      valor_transferido: 50000,
      valor_lucro: 5194,
    },
    {
      id: "em-aberto",
      status: "em_aberto",
      data_captacao: "2026-07-15",
      data_vencimento: "2026-12-15",
      valor_cheque: 36723.38,
      valor_transferido: 33624,
      valor_lucro: 3099.38,
    },
  ];
  const movimentacoes = [
    { tipo: "aporte", valor: 971.23, data: "2026-07-08" },
    { tipo: "aporte", valor: 15000, data: "2026-07-14" },
    { tipo: "devolucao", valor: 15000, data: "2026-07-16" },
  ];

  it("year 2026 position: saldoTotal 40884.76, disponivel 5132.61, emCheques 36723.38, ganhoAcumulado 8293.38, particular 971.23, compensado 55194, audit.ok true", () => {
    const report = buildFinancialReport({ capital, cheques, movimentacoes, period: "2026", mode: "year" });
    expect(report.position.saldoTotal).toBe(40884.76);
    expect(report.position.disponivel).toBe(5132.61);
    expect(report.position.emCheques).toBe(36723.38);
    expect(report.position.ganhoAcumulado).toBe(8293.38);
    expect(report.position.particular).toBe(971.23);
    expect(report.position.compensado).toBe(55194);
    expect(report.audit.ok).toBe(true);
  });

  it("operations: liberado 83624, valorCheques 91917.38, aReceber 36723.38, ganho 8293.38; capitalMovements aportes 15971.23, devolucoes 15000, retiradas 0", () => {
    const report = buildFinancialReport({ capital, cheques, movimentacoes, period: "2026", mode: "year" });
    expect(report.operations.liberado).toBe(83624);
    expect(report.operations.valorCheques).toBe(91917.38);
    expect(report.operations.aReceber).toBe(36723.38);
    expect(report.operations.ganho).toBe(8293.38);
    expect(report.capitalMovements.aportes).toBe(15971.23);
    expect(report.capitalMovements.devolucoes).toBe(15000);
    expect(report.capitalMovements.retiradas).toBe(0);
  });

  it("compensado antigo sem data_compensacao aparece em undatedCompensated e nao gera item kind entrada_cheque no livro datado", () => {
    const report = buildFinancialReport({ capital, cheques, movimentacoes, period: "2026", mode: "year" });
    expect(report.undatedCompensated.length).toBe(1);
    expect(report.undatedCompensated[0].id).toBe("compensado-antigo");
    const temEntradaCheque = report.items.some(
      (it) => it.kind === "entrada_cheque" && it.id === "compensado-antigo"
    );
    expect(temEntradaCheque).toBe(false);
  });

  it("month 2026-12 operations.aReceber 36723.38", () => {
    const report = buildFinancialReport({ capital, cheques, movimentacoes, period: "2026-12", mode: "month" });
    expect(report.operations.aReceber).toBe(36723.38);
  });

  it("com valor_cheque 55194.02 no compensado: audit.ok false e erro code CHEQUE_MISMATCH", () => {
    const chequesAlt = [
      { ...cheques[0], valor_cheque: 55194.02 },
      cheques[1],
    ];
    const report = buildFinancialReport({ capital, cheques: chequesAlt, movimentacoes, period: "2026", mode: "year" });
    expect(report.audit.ok).toBe(false);
    expect(report.audit.errors.some((e) => e.code === "CHEQUE_MISMATCH")).toBe(true);
  });

  // cashFlow (fase RED TDD): buildFinancialReport ainda não aceita dataInicio
  // nem retorna cashFlow — estes testes devem FALHAR.
  const chequesComCompensacao = [
    { ...cheques[0], data_compensacao: "2026-07-15" },
    cheques[1],
  ];

  it("cashFlow year 2026 com dataInicio 2026-06-15: totais entradas 103756.61, saidas 98624, saldo 5132.61", () => {
    const report = buildFinancialReport({
      capital,
      cheques: chequesComCompensacao,
      movimentacoes,
      period: "2026",
      mode: "year",
      dataInicio: "2026-06-15",
    });
    expect(report.cashFlow.entradas).toBe(103756.61);
    expect(report.cashFlow.saidas).toBe(98624);
    expect(report.cashFlow.saldo).toBe(5132.61);
  });

  it("cashFlow.items tem exatamente um item capital_inicial em 2026-06-15 no valor de 32591.38 e series soma o capital uma unica vez no bucket Jun", () => {
    const report = buildFinancialReport({
      capital,
      cheques: chequesComCompensacao,
      movimentacoes,
      period: "2026",
      mode: "year",
      dataInicio: "2026-06-15",
    });
    const capitalItems = (report.cashFlow.items || []).filter(
      (it) => it.kind === "capital_inicial"
    );
    expect(capitalItems.length).toBe(1);
    expect(capitalItems[0]).toMatchObject({
      kind: "capital_inicial",
      data: "2026-06-15",
      valor: 32591.38,
    });

    const jun = (report.cashFlow.series || []).find((p) => (p.key || "").slice(0, 7) === "2026-06");
    expect(jun).toBeDefined();
    expect(jun.entradas).toBe(32591.38);
  });

  it("no periodo 2026-07/month o capital inicial nao entra: nenhum item capital_inicial e nenhum acrescimo de 32591.38 nas entradas", () => {
    const report = buildFinancialReport({
      capital,
      cheques: chequesComCompensacao,
      movimentacoes,
      period: "2026-07",
      mode: "month",
      dataInicio: "2026-06-15",
    });
    const capitalItems = (report.cashFlow.items || []).filter(
      (it) => it.kind === "capital_inicial"
    );
    expect(capitalItems.length).toBe(0);
    expect(report.cashFlow.entradas).not.toBe(32591.38);
    // entradas do mes: 55194 (compensado) + 15971.23 (aportes) = 71165.23, sem capital
    expect(report.cashFlow.entradas).toBe(71165.23);
  });
});

describe("renovações de lucro (RED TDD)", () => {
  const cheques = [
    {
      id: "c1",
      status: "em_aberto",
      valor_cheque: 1100,
      valor_transferido: 1000,
      valor_lucro: 100,
      data_captacao: "2026-06-01",
      data_vencimento: "2026-09-01",
    },
  ];
  const renovacoesR1 = [
    {
      id: "r1",
      cheque_id: "c1",
      data_realizacao: "2026-08-10",
      valor_lucro_realizado: 100,
      data_vencimento_anterior: "2026-08-02",
      data_vencimento_novo: "2026-09-01",
      emitente_snapshot: "Cliente",
    },
  ];

  it("recebe o lucro renovado no caixa sem reduzir em cheques ou inflar particular", () => {
    const position = calculateCashPosition({
      capital: 1000,
      cheques,
      movimentacoes: [],
      renovacoes: renovacoesR1,
    });
    expect(position).toEqual({
      disponivel: 100,
      particular: 0,
      emCheques: 1100,
      saldoTotal: 1200,
    });

    const report = buildFinancialReport({
      capital: 1000,
      cheques,
      movimentacoes: [],
      renovacoes: renovacoesR1,
      period: "2026-08",
      mode: "month",
      dataInicio: "2026-01-01",
    });
    expect(report.position.ganhoAcumulado).toBe(200);
    expect(report.cashFlow.entradas).toBe(100);
    expect(report.cashFlow.saidas).toBe(0);
    expect(report.cashFlow.saldo).toBe(100);
    expect(report.operations).toMatchObject({
      ganho: 0,
      lucroRenovacoes: 100,
      ganhoTotal: 100,
    });
    expect(report.cashFlow.items[0]).toMatchObject({
      kind: "realizacao_lucro",
      origem: "realizacao_lucro",
      valor: 100,
    });
  });

  it("acumula todas as renovações na posição e filtra o fluxo pela data de realização", () => {
    const renovacoes = [
      ...renovacoesR1,
      {
        id: "r2",
        cheque_id: "c1",
        data_realizacao: "2026-09-01",
        valor_lucro_realizado: 100,
        data_vencimento_anterior: "2026-09-01",
        data_vencimento_novo: "2026-10-01",
        emitente_snapshot: "Cliente",
      },
    ];

    const position = calculateCashPosition({
      capital: 1000,
      cheques,
      movimentacoes: [],
      renovacoes,
    });
    expect(position.disponivel).toBe(200);
    expect(position.emCheques).toBe(1100);
    expect(position.saldoTotal).toBe(1300);
    expect(position.particular).toBe(0);

    const report = buildFinancialReport({
      capital: 1000,
      cheques,
      movimentacoes: [],
      renovacoes,
      period: "2026-08",
      mode: "month",
      dataInicio: "2026-01-01",
    });
    expect(report.position.ganhoAcumulado).toBe(300);
    expect(report.cashFlow.entradas).toBe(100);
    expect(report.operations.lucroRenovacoes).toBe(100);
    const items = (report.cashFlow.items || []).filter(
      (it) => it.kind === "realizacao_lucro"
    );
    expect(items.length).toBe(1);
  });
});

describe("retiradas por responsável (RED TDD)", () => {
  const cheques = [];
  const movimentacoes = [
    { tipo: "retirada", valor: 300, data: "2026-08-03", responsavel: "Rodrigo" },
    { tipo: "retirada", valor: 250, data: "2026-08-05", responsavel: "Isabela" },
    { tipo: "retirada", valor: 180, data: "2026-08-07", responsavel: "Carlos" },
    { tipo: "retirada", valor: 120, data: "2026-08-09", responsavel: "Rodrigo" },
  ];

  it("agrupa retiradas por responsável dinâmico (Rodrigo, Isabela, Carlos) e totaliza o geral no período", () => {
    const report = buildFinancialReport({
      capital: 5000,
      cheques,
      movimentacoes,
      period: "2026-08",
      mode: "month",
      dataInicio: "2026-01-01",
    });

    const porResp = report.capitalMovements.withdrawalsByResponsible || {};
    expect(porResp.Rodrigo).toBe(420);
    expect(porResp.Isabela).toBe(250);
    expect(porResp.Carlos).toBe(180);
    expect(report.capitalMovements.retiradas).toBe(850);
  });
});