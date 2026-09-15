import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ResponsavelManagerRow from "./ResponsavelManagerRow";

const mk = (id, nome, ativo) => ({ id, nome, ativo });

describe("ResponsavelManagerRow", () => {
  it("responsável ativo mostra nome, texto Ativo e botão Excluir habilitado com aria-label 'Excluir <nome>' quando canDelete=true", () => {
    const r = mk("r1", "Rodrigo", true);
    const html = renderToStaticMarkup(
      React.createElement(ResponsavelManagerRow, {
        responsavel: r,
        canDelete: true,
        onDelete: () => {},
      })
    );
    expect(html).toContain("Rodrigo");
    expect(html).toContain("Ativo");
    expect(html).toContain('aria-label="Excluir Rodrigo"');
    expect(html).toContain("<button");
    expect(html).not.toMatch(/disabled/);

    const switchMatch = html.match(/<button[^>]*role="switch"[^>]*>/);
    expect(switchMatch, "deve haver um elemento role=switch").toBeTruthy();
    const switchTag = switchMatch[0];
    expect(
      /\b(?:min-h-11|h-11)\b/.test(switchTag),
      "o controle role=switch deve ter alvo interativo de no mínimo 44px (min-h-11 ou h-11)"
    ).toBe(true);
  });

  it("responsável inativo mostra Desativado", () => {
    const r = mk("r2", "Isabela", false);
    const html = renderToStaticMarkup(
      React.createElement(ResponsavelManagerRow, {
        responsavel: r,
        canDelete: true,
        onDelete: () => {},
      })
    );
    expect(html).toContain("Isabela");
    expect(html).toContain("Desativado");
  });

  it("canDelete=false deixa o botão Excluir desabilitado com explicação acessível 'Cadastre ou ative outro responsável antes de excluir este'", () => {
    const r = mk("r1", "Rodrigo", true);
    const html = renderToStaticMarkup(
      React.createElement(ResponsavelManagerRow, {
        responsavel: r,
        canDelete: false,
        onDelete: () => {},
      })
    );
    expect(html).toContain("disabled");
    expect(html).toContain("Cadastre ou ative outro responsável antes de excluir este");
  });
});