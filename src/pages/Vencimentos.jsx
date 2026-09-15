import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatBRL, formatPercent } from "@/lib/formatCurrency";

function parseDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return d + "/" + m + "/" + y;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getBadge(vencimento) {
  const today = startOfDay(new Date());
  const venc = startOfDay(parseDate(vencimento));
  if (!venc) return null;
  const diffMs = venc.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "VENCIDO", color: "bg-red-100 text-red-700" };
  if (diffDays === 0) return { label: "Vence hoje", color: "bg-orange-100 text-orange-700" };
  return { label: "em " + diffDays + " dias", color: "bg-gray-100 text-gray-600" };
}

export default function Vencimentos() {
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const all = await base44.entities.Cheque.list("-data_vencimento", 500);
      setCheques(all.filter((c) => c.status === "em_aberto"));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    );
  }

  const sorted = [...cheques].sort((a, b) => {
    const da = parseDate(a.data_vencimento)?.getTime() || 0;
    const db = parseDate(b.data_vencimento)?.getTime() || 0;
    return da - db;
  });

  const total = sorted.reduce((s, c) => s + (c.valor_cheque || 0), 0);

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Vencimentos</h1>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-sm text-gray-400">Nenhum vencimento pendente</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {sorted.map((c) => {
              const badge = getBadge(c.data_vencimento);
              return (
                <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDateBR(c.data_vencimento)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {c.emitente || "—"}
                        {c.banco ? " · " + c.banco : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatBRL(c.valor_cheque)}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 flex-wrap">
                        {c.tipo_taxa === "mensal" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 whitespace-nowrap">
                            {formatPercent(c.taxa_percentual)} a.m.
                          </span>
                        )}
                        {badge && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-emerald-700 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-emerald-100 text-sm font-medium">Total a receber</span>
              <span className="text-white text-lg font-bold">{formatBRL(total)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}