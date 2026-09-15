import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChequeActionsContent } from "./ChequeActionsDialog";

const baseProps = {
  cheque: {
    emitente: "MM Neto",
    banco: "Santander",
    valor_cheque: 15300,
    valor_lucro: 918,
    data_vencimento: "2026-08-08",
    status: "em_aberto",
  },
  novoVencimento: "2026-09-07",
  renovacoes: [
    {
      id: "r1",
      data_realizacao: "2026-08-08",
      valor_lucro_realizado: 918,
      data_vencimento_anterior: "2026-07-09",
      data_vencimento_novo: "2026-08-08",
    },
  ],
  saving: false,
  onCompensar: () => {},
  onStartRenewal: () => {},
  onConfirmRenewal: () => {},
  onCancel: () => {},
};

describe("ChequeActionsContent (RED TDD)", () => {
  it("mostra valores, ações e histórico da renovação", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChequeActionsContent, { ...baseProps, step: "menu" })
    );
    expect(html).toContain("R$ 15.300,00");
    expect(html).toContain("R$ 918,00");
    expect(html).toContain("08/08/2026");
    expect(html).toContain("07/09/2026");
    expect(html).toContain("Compensar cheque");
    expect(html).toContain("Realizar lucro + 30 dias");
    expect(html).toContain("Histórico de renovações (1)");
  });

  it("destaca o recebimento e a troca de vencimento antes de confirmar", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChequeActionsContent, { ...baseProps, step: "confirm" })
    );
    expect(html).toContain("Receber R$ 918,00");
    expect(html).toContain("08/08/2026");
    expect(html).toContain("07/09/2026");
    expect(html).toContain("Confirmar e renovar");
    expect(html).toContain("Cancelar");
  });
});