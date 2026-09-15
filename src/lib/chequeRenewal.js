function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function isValidDateKey(key) {
  return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key);
}

export function addDaysToDateKey(dateKey, days = 30) {
  if (!isValidDateKey(dateKey)) {
    throw new Error("VENCIMENTO_INVALIDO");
  }
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new Error("VENCIMENTO_INVALIDO");
  }
  dt.setUTCDate(dt.getUTCDate() + days);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function persistProfitRenewal({ cheque, actionDate, createRenewal, updateCheque, deleteRenewal }) {
  const prepared = prepareProfitRenewal({ cheque, actionDate });
  const created = await createRenewal(prepared.renewal);
  try {
    await updateCheque(cheque.id, prepared.chequeUpdate);
  } catch (err) {
    try {
      await deleteRenewal(created.id);
    } catch (rollbackErr) {
      const wrapped = new Error("ROLLBACK_FAILED");
      wrapped.updateError = err;
      wrapped.rollbackError = rollbackErr;
      throw wrapped;
    }
    throw err;
  }
  return { ...prepared, renewal: created };
}

export function prepareProfitRenewal({ cheque, actionDate }) {
  if (!cheque || cheque.status !== "em_aberto") {
    throw new Error("CHEQUE_NAO_ABERTO");
  }
  const lucro = roundMoney(cheque.valor_lucro);
  if (!(lucro > 0)) {
    throw new Error("LUCRO_INVALIDO");
  }
  const novoVencimento = addDaysToDateKey(cheque.data_vencimento, 30);
  const anterior = cheque.data_vencimento;
  return {
    renewal: {
      cheque_id: cheque.id,
      ciclo_id: `${cheque.id}:${anterior}:${novoVencimento}`,
      data_realizacao: actionDate,
      valor_lucro_realizado: lucro,
      data_vencimento_anterior: anterior,
      data_vencimento_novo: novoVencimento,
      valor_cheque_snapshot: roundMoney(cheque.valor_cheque),
      emitente_snapshot: cheque.emitente || "",
      banco_snapshot: cheque.banco || "",
    },
    chequeUpdate: { data_vencimento: novoVencimento, aviso_enviado: false },
  };
}