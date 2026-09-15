import { describe, it, expect } from "vitest";
import { openChequeDialog, closeChequeDialog } from "./chequeDialogState";

const cheque = { id: "abc", emitente: "João", valor_cheque: 1000 };

describe("openChequeDialog", () => {
  it("retorna {open:true, cheque: o mesmo objeto}", () => {
    const state = openChequeDialog(cheque);
    expect(state).toEqual({ open: true, cheque });
    expect(state.cheque).toBe(cheque);
  });
});

describe("closeChequeDialog", () => {
  it("retorna {open:false, cheque: o mesmo objeto}, preservando dados durante animação de saída", () => {
    const prev = { open: true, cheque };
    const state = closeChequeDialog(prev);
    expect(state).toEqual({ open: false, cheque });
    expect(state.cheque).toBe(cheque);
  });

  it("não muta o estado recebido", () => {
    const prev = { open: true, cheque };
    const snapshot = { ...prev, cheque: prev.cheque };
    closeChequeDialog(prev);
    expect(prev).toEqual(snapshot);
    expect(prev.open).toBe(true);
  });
});