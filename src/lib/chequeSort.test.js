import { describe, expect, it } from "vitest";
import { filterAndSortCheques } from "./chequeSort";

const ids = (items) => items.map((item) => item.id);

describe("filterAndSortCheques", () => {
  it('ordena o filtro "todos" por data_vencimento crescente, sem data ao final', () => {
    const input = [
      { id: "d", status: "em_aberto", data_vencimento: null },
      { id: "c", status: "compensado", data_vencimento: "2026-08-07" },
      { id: "b", status: "em_aberto", data_vencimento: "2026-09-10" },
      { id: "a", status: "compensado", data_vencimento: "2026-07-01" },
    ];
    expect(ids(filterAndSortCheques(input, "todos"))).toEqual(["a", "c", "b", "d"]);
    expect(ids(filterAndSortCheques(input, "em_aberto"))).toEqual(["b", "d"]);
    expect(ids(filterAndSortCheques(input, "compensados"))).toEqual(["a", "c"]);
  });

  it("desempata datas iguais por id crescente e não muta a entrada", () => {
    const input = [
      { id: "z", status: "em_aberto", data_vencimento: "2026-09-10" },
      { id: "a", status: "em_aberto", data_vencimento: "2026-09-10" },
      { id: "n", status: "em_aberto", data_vencimento: "" },
    ];
    expect(ids(filterAndSortCheques(input, "todos"))).toEqual(["a", "z", "n"]);
    expect(ids(input)).toEqual(["z", "a", "n"]);
  });
});