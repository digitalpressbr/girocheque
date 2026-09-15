import React, { Suspense, lazy } from "react";
import { formatBRL } from "@/lib/formatCurrency";

const DialogShell = lazy(() =>
  import("@/components/ui/dialog").then((m) => ({
    default: function DialogShell({ open, onOpenChange, title, bodyClass, children }) {
      return (
        <m.Dialog open={open} onOpenChange={onOpenChange}>
          <m.DialogContent className="flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
            <m.DialogHeader className="shrink-0 border-b border-gray-100 px-5 pt-5 pb-3">
              <m.DialogTitle className="text-lg font-bold text-gray-900">
                {title}
              </m.DialogTitle>
            </m.DialogHeader>
            <div className={bodyClass}>{children}</div>
          </m.DialogContent>
        </m.Dialog>
      );
    },
  }))
);

function formatDateLocal(key) {
  if (typeof key !== "string") return "—";
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "—";
  return m[3] + "/" + m[2] + "/" + m[1];
}

function InfoCell({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-gray-400">{label}</span>
      <span className="whitespace-nowrap tabular-nums text-sm font-semibold text-gray-900">
        {children}
      </span>
    </div>
  );
}

export function ChequeActionsContent({
  cheque,
  novoVencimento,
  renovacoes = [],
  step = "menu",
  saving = false,
  onCompensar,
  onStartRenewal,
  onConfirmRenewal,
  onCancel,
}) {
  const valorCheque = formatBRL(cheque?.valor_cheque);
  const lucro = formatBRL(cheque?.valor_lucro);
  const vencAtual = formatDateLocal(cheque?.data_vencimento);
  const vencNovo = formatDateLocal(novoVencimento);
  const renovList = Array.isArray(renovacoes) ? renovacoes : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-base font-bold text-gray-900">
            {cheque?.emitente || "Sem emitente"}
          </span>
          {cheque?.banco ? (
            <span className="text-xs text-gray-500">{cheque.banco}</span>
          ) : null}
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
          Em aberto
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
        <InfoCell label="Valor do cheque">{valorCheque}</InfoCell>
        <InfoCell label="Lucro a receber">{lucro}</InfoCell>
        <InfoCell label="Vencimento atual">{vencAtual}</InfoCell>
        <InfoCell label="Novo vencimento">{vencNovo}</InfoCell>
      </div>

      {step === "menu" ? (
        <>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onCompensar}
              className="min-h-11 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Compensar cheque
            </button>
            <button
              type="button"
              onClick={onStartRenewal}
              className="min-h-11 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Realizar lucro + 30 dias
            </button>
          </div>

          <details className="rounded-xl border border-gray-100 bg-white px-3 py-2">
            <summary className="min-h-11 flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-700">
              <span>Histórico de renovações ({renovList.length})</span>
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {renovList.length === 0 ? (
                <span className="text-xs text-gray-400">Sem renovações registradas.</span>
              ) : (
                renovList.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600"
                  >
                    <span className="whitespace-nowrap tabular-nums font-semibold text-gray-900">
                      {formatDateLocal(r.data_realizacao)}
                    </span>
                    <span className="whitespace-nowrap tabular-nums">
                      {formatDateLocal(r.data_vencimento_anterior)} →{" "}
                      {formatDateLocal(r.data_vencimento_novo)}
                    </span>
                    <span className="whitespace-nowrap tabular-nums font-semibold text-emerald-700">
                      {formatBRL(r.valor_lucro_realizado)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </details>
        </>
      ) : null}

      {step === "confirm" ? (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">
              Receber {lucro}
            </p>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
              <span className="whitespace-nowrap tabular-nums text-sm text-gray-500">
                {vencAtual}
              </span>
              <span className="text-gray-300">→</span>
              <span className="whitespace-nowrap tabular-nums text-sm font-semibold text-emerald-700">
                {vencNovo}
              </span>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmRenewal}
              disabled={saving}
              className="min-h-11 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 sm:w-auto"
            >
              {saving ? "Salvando..." : "Confirmar e renovar"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function ChequeActionsDialog({
  open,
  onOpenChange,
  cheque,
  novoVencimento,
  renovacoes,
  step,
  saving,
  onCompensar,
  onStartRenewal,
  onConfirmRenewal,
  onCancel,
}) {
  const handleOpenChange = (o) => {
    if (!o && typeof onCancel === "function") onCancel();
    if (typeof onOpenChange === "function") onOpenChange(o);
  };

  return (
    <Suspense fallback={null}>
      <DialogShell
        open={open}
        onOpenChange={handleOpenChange}
        title="Ações do cheque"
        bodyClass="flex-1 overflow-y-auto px-5 py-4"
      >
        <ChequeActionsContent
          cheque={cheque}
          novoVencimento={novoVencimento}
          renovacoes={renovacoes}
          step={step}
          saving={saving}
          onCompensar={onCompensar}
          onStartRenewal={onStartRenewal}
          onConfirmRenewal={onConfirmRenewal}
          onCancel={onCancel}
        />
      </DialogShell>
    </Suspense>
  );
}