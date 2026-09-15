import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, AlertTriangle, ChevronRight } from "lucide-react";
import { formatBRL } from "@/lib/formatCurrency";

function parseDate(d) {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
}

export default function UpcomingPayments({ cheques }) {
  const { total, temVencido, proximos, vazio } = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite10 = new Date(hoje);
    limite10.setDate(limite10.getDate() + 10);

    const abertos = cheques
      .filter((c) => c.status === "em_aberto" && c.data_vencimento)
      .map((c) => ({ ...c, _v: parseDate(c.data_vencimento) }))
      .filter((c) => c._v);

    if (abertos.length === 0) {
      return { total: 0, temVencido: false, proximos: [], vazio: true };
    }

    const vencidos = abertos.filter((c) => c._v < hoje);
    const ate10 = abertos.filter((c) => c._v >= hoje && c._v <= limite10);
    const soma = ate10.reduce((s, c) => s + (c.valor_cheque || 0), 0)
      + vencidos.reduce((s, c) => s + (c.valor_cheque || 0), 0);
    const temVencido = vencidos.length > 0;

    const ordenados = [...abertos].sort((a, b) => a._v - b._v);
    const proximos4 = ordenados.slice(0, 4).map((c) => {
      const dias = Math.round((c._v - hoje) / 86400000);
      let situacao;
      if (dias < 0) situacao = { label: "VENCIDO", className: "bg-red-100 text-red-700" };
      else if (dias === 0) situacao = { label: "Hoje", className: "bg-amber-100 text-amber-700" };
      else situacao = { label: `em ${dias} dia${dias === 1 ? "" : "s"}`, className: "bg-gray-100 text-gray-500" };
      const [, m, day] = c.data_vencimento.split("-");
      return {
        id: c.id,
        data: `${day}/${m}`,
        emitente: c.emitente,
        valor: c.valor_cheque || 0,
        situacao,
      };
    });

    return { total: soma, temVencido, proximos: proximos4, vazio: false };
  }, [cheques]);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={16} className="text-gray-700" />
        <h2 className="text-base font-semibold text-gray-800">Próximos vencimentos</h2>
      </div>

      {vazio ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <p className="text-sm text-gray-400">Nenhum vencimento pendente</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-xs text-gray-400 font-medium">Próximos 10 dias</span>
            <div className="flex items-center gap-1.5">
              {temVencido && <AlertTriangle size={14} className="text-red-500" />}
              <span className={`text-base font-bold ${temVencido ? "text-red-600" : "text-gray-900"}`}>
                {formatBRL(total)}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {proximos.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs text-gray-400 font-medium w-9 shrink-0">{c.data}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{c.emitente || "—"}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${c.situacao.className}`}>
                  {c.situacao.label}
                </span>
                <span className="text-sm font-bold text-gray-900 shrink-0 whitespace-nowrap text-right">
                  {formatBRL(c.valor)}
                </span>
              </div>
            ))}
          </div>

          <Link
            to="/vencimentos"
            className="flex items-center justify-center gap-1 px-4 py-2.5 text-xs text-gray-400 hover:text-emerald-700 transition-colors border-t border-gray-50"
          >
            Ver todos
            <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}