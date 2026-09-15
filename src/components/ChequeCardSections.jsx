import React from "react";
import { formatBRL, formatPercent } from "@/lib/formatCurrency";

const STATUS_LABELS = {
  em_aberto: "Em aberto",
  compensado: "Compensado",
};

function formatDate(d) {
  if (!d) return "—";
  const parts = String(d).split("-");
  if (parts.length !== 3) return d;
  const [y, m, day] = parts;
  return day + "/" + m + "/" + y;
}

function phoneHref(tel) {
  if (!tel) return "";
  return "tel:" + String(tel).replace(/\D/g, "");
}

export function ChequeCardHeader({ cheque: c }) {
  const isCompensado = c.status === "compensado";
  return (
    <div className="mb-3 min-w-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 min-w-0">
        <p className="min-w-0 font-semibold leading-snug text-gray-900 break-words">
          {c.banco}
        </p>
        <span
          data-cheque-status
          className={
            "self-start shrink-0 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-full " +
            (isCompensado
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700")
          }
        >
          {STATUS_LABELS[c.status] || c.status}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2 min-w-0 text-xs">
        {c.tipo_taxa === "mensal" && (
          <span className="shrink-0 whitespace-nowrap font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
            {formatPercent(c.taxa_percentual)} a.m.
          </span>
        )}
        {c.emitente && (
          <span className="min-w-0 truncate font-medium text-emerald-700">
            {c.emitente}
          </span>
        )}
        <span className="ml-auto shrink-0 whitespace-nowrap text-gray-400">
          Venc. {formatDate(c.data_vencimento)}
        </span>
      </div>

      {(c.contato || c.telefone_contato) && (
        <div
          data-cheque-contact-row
          className="mt-2 flex w-full min-w-0 items-center gap-2 text-xs"
        >
          {c.contato && (
            <span className="min-w-0 truncate font-medium text-gray-500">
              {c.contato}
            </span>
          )}
          {c.telefone_contato && (
            <a
              href={phoneHref(c.telefone_contato)}
              className="ml-auto shrink-0 whitespace-nowrap font-medium text-emerald-600"
            >
              {c.telefone_contato}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function ChequeFinancialSummary({ cheque: c }) {
  const valueClass =
    "whitespace-nowrap tabular-nums text-[clamp(0.78rem,3.4vw,0.95rem)] leading-none font-bold";
  const labelClass =
    "whitespace-nowrap text-[10px] uppercase tracking-wide text-gray-400";

  return (
    <div className="mb-3 grid min-w-0 grid-cols-3 gap-2">
      <div className="min-w-0 overflow-hidden">
        <p className={labelClass}>Cheque</p>
        <p className={valueClass + " text-gray-900"}>{formatBRL(c.valor_cheque)}</p>
      </div>
      <div className="min-w-0 overflow-hidden">
        <p className={labelClass}>Lucro</p>
        <p className={valueClass + " text-emerald-700"}>{formatBRL(c.valor_lucro)}</p>
      </div>
      <div className="min-w-0 overflow-hidden">
        <p className={labelClass}>Transferido</p>
        <p className={valueClass + " text-gray-700"}>{formatBRL(c.valor_transferido)}</p>
      </div>
    </div>
  );
}