import { describe, it, expect } from "vitest";
import { addDaysToDateKey, prepareProfitRenewal, persistProfitRenewal } from "./chequeRenewal";

const cheque = {
  id: "c1",
  status: "em_aberto",
  data_vencimento: "2026-08-08",
  valor_cheque: 15300,
  valor_transferido: 14382,
  valor_lucro: 918,
  taxa_percentual: 6,
  emitente: "MM Neto Transportes",
  banco: "Santander",
};

describe("chequeRenewal", () => {
  it("1. addDaysToDateKey e prepareProfitRenewal produzem a renovação esperada", () => {
    expect(addDaysToDateKey("2026-08-08", 30)).toBe("2026-09-07");

    const res = prepareProfitRenewal({ cheque, actionDate: "2026-08-10" });

    expect(res).toEqual({
      renewal: {
        cheque_id: "c1",
        ciclo_id: "c1:2026-08-08:2026-09-07",
        data_realizacao: "2026-08-10",
        valor_lucro_realizado: 918,
        data_vencimento_anterior: "2026-08-08",
        data_vencimento_novo: "2026-09-07",
        valor_cheque_snapshot: 15300,
        emitente_snapshot: "MM Neto Transportes",
        banco_snapshot: "Santander",
      },
      chequeUpdate: { data_vencimento: "2026-09-07", aviso_enviado: false },
    });
  });

  it("2. novo vencimento a partir de 2026-09-07 deve ser 2026-10-07", () => {
    const c = { ...cheque, data_vencimento: "2026-09-07" };
    const res = prepareProfitRenewal({ cheque: c, actionDate: "2026-08-10" });
    expect(res.renewal.data_vencimento_novo).toBe("2026-10-07");
    expect(res.chequeUpdate.data_vencimento).toBe("2026-10-07");
  });

  it.each([
    [{ ...cheque, status: "compensado" }, "CHEQUE_NAO_ABERTO"],
    [{ ...cheque, data_vencimento: "" }, "VENCIMENTO_INVALIDO"],
    [{ ...cheque, valor_lucro: 0 }, "LUCRO_INVALIDO"],
  ])("rejeita %j com %s", (c, msg) => {
    expect(() => prepareProfitRenewal({ cheque: c, actionDate: "2026-08-10" })).toThrow(msg);
  });

  it("remove o histórico criado se a atualização do cheque falhar", async () => {
    const stored = [];
    const createRenewal = async (payload) => {
      const rec = { id: "r1", ...payload };
      stored.push(rec);
      return rec;
    };
    const updateCheque = async () => {
      throw new Error("update failed");
    };
    const deleteRenewal = async (id) => {
      const i = stored.findIndex((r) => r.id === id);
      if (i !== -1) stored.splice(i, 1);
    };

    await expect(
      persistProfitRenewal({ cheque, actionDate: "2026-08-10", createRenewal, updateCheque, deleteRenewal })
    ).rejects.toThrow("update failed");

    expect(stored).toEqual([]);
  });

  it("sinaliza conferência necessária se o rollback também falhar", async () => {
    const createRenewal = async () => ({ id: "r1" });
    const updateCheque = async () => {
      throw new Error("update failed");
    };
    const deleteRenewal = async () => {
      throw new Error("delete failed");
    };

    await expect(
      persistProfitRenewal({ cheque, actionDate: "2026-08-10", createRenewal, updateCheque, deleteRenewal })
    ).rejects.toThrow("ROLLBACK_FAILED");
  });
});