import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ActiveUsersSummary from "./ActiveUsersSummary";

describe("ActiveUsersSummary — contrato de apresentação", () => {
  it("com 2 aderentes ativos mostra KPI '2', rótulo 'Pessoas ativas', texto 'além de você', nomes e e-mails", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActiveUsersSummary, {
        activeAdherents: [
          { name: "Ana Paula", email: "ana@x.com", acesso_ativo: true },
          { name: "Beto Silva", email: "beto@x.com", acesso_ativo: true },
        ],
        activeAdherentsCount: 2,
      })
    );

    expect(html).toContain("2");
    expect(html).toContain("Pessoas ativas");
    expect(html).toContain("além de você");
    expect(html).toContain("Ana Paula");
    expect(html).toContain("ana@x.com");
    expect(html).toContain("Beto Silva");
    expect(html).toContain("beto@x.com");
  });

  it("com zero aderentes mostra estado vazio 'Nenhuma outra pessoa ativa ainda'", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActiveUsersSummary, {
        activeAdherents: [],
        activeAdherentsCount: 0,
      })
    );

    expect(html).toContain("Nenhuma outra pessoa ativa ainda");
  });

  it("com zero aderentes também exibe o KPI: rótulo 'Pessoas ativas', número '0' inequívoco e 'além de você'", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActiveUsersSummary, {
        activeAdherents: [],
        activeAdherentsCount: 0,
      })
    );

    expect(html).toContain("Pessoas ativas");
    expect(html).toContain("além de você");
    const kpiMatch = html.match(/>0</);
    expect(kpiMatch).not.toBeNull();
  });
});