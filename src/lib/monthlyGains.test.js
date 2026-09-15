import { describe, it, expect } from "vitest";
import { buildMonthlyGainsMap } from "./monthlyGains";

describe("buildMonthlyGainsMap", () => {
  it("soma o ganho da captação e cada lucro realizado no mês correto", () => {
    const cheques = [
      { data_captacao: "2026-08-01", valor_lucro: 100 },
      { data_captacao: "2026-09-02", valor_lucro: 50 },
    ];
    const renovacoes = [
      { data_realizacao: "2026-08-10", valor_lucro_realizado: 30 },
      { data_realizacao: "2026-09-10", valor_lucro_realizado: 40 },
    ];
    const result = buildMonthlyGainsMap({ cheques, renovacoes });
    expect(result).toEqual({ "2026-08": 130, "2026-09": 90 });
  });

  it("ignora entradas de data vazia sem alterar o esperado", () => {
    const cheques = [
      { data_captacao: "2026-08-01", valor_lucro: 100 },
      { data_captacao: "", valor_lucro: 999 },
      { data_captacao: null, valor_lucro: 999 },
    ];
    const renovacoes = [
      { data_realizacao: "2026-08-10", valor_lucro_realizado: 30 },
      { data_realizacao: "", valor_lucro_realizado: 999 },
      { data_realizacao: null, valor_lucro_realizado: 999 },
    ];
    const result = buildMonthlyGainsMap({ cheques, renovacoes });
    expect(result).toEqual({ "2026-08": 130 });
  });
});