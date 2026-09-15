import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChequeCardHeader, ChequeFinancialSummary } from "./ChequeCardSections";

const NBSP = String.fromCharCode(160);

const cheque = {
  banco: "Caixa Econômica Federal",
  tipo_taxa: "mensal",
  taxa_percentual: 5,
  emitente: "MM Neto Transportes",
  data_vencimento: "2026-11-22",
  contato: "Deila",
  telefone_contato: "(64) 98126-5842",
  status: "em_aberto",
  valor_cheque: 15315.38,
  valor_lucro: 3315.38,
  valor_transferido: 12000,
};

const money = (raw) => new RegExp("R\\$[ " + NBSP + "]" + raw.replace(/\./g, "\\."));

describe("ChequeCardHeader — contrato que impede sobreposição", () => {
  it("renderiza com grid de 2 colunas minmax(0,1fr)+auto, contato e status sem encolher, link tel normalizado e SEM o antigo flex justify-between", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChequeCardHeader, { cheque })
    );

    expect(html).toContain("grid-cols-[minmax(0,1fr)_auto]");
    expect(html).toContain("data-cheque-status");
    expect(html).toContain("shrink-0");
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("data-cheque-contact-row");
    expect(html).toContain('href="tel:64981265842"');
    expect(html).not.toContain("flex items-start justify-between mb-3");
  });
});

describe("ChequeFinancialSummary — contrato anti-quebra 360/390px", () => {
  it("renderiza grade 3 colunas, min-w-0 em cada célula, valores tabular-nums e whitespace-nowrap, com valores monetários formatados", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChequeFinancialSummary, { cheque })
    );

    expect(html).toContain("grid-cols-3");

    const minW0Count = (html.match(/min-w-0/g) || []).length;
    expect(minW0Count).toBeGreaterThanOrEqual(4);

    const tabularCount = (html.match(/tabular-nums/g) || []).length;
    expect(tabularCount).toBe(3);

    const nowrapCount = (html.match(/whitespace-nowrap/g) || []).length;
    expect(nowrapCount).toBeGreaterThanOrEqual(3);

    expect(html).toMatch(money("15.315,38"));
    expect(html).toMatch(money("12.000,00"));
  });
});