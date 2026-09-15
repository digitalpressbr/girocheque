import { formatBRL, formatPercent } from "@/lib/formatCurrency";
import { buildMonthlyGainsMap } from "@/lib/monthlyGains";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function MonthlyGains({ cheques, renovacoes = [], capitalInicial }) {
  // Group cheques (captação) and renovacoes (lucro realizado) by month
  const monthMap = buildMonthlyGainsMap({ cheques, renovacoes });

  const months = Object.keys(monthMap).sort().reverse();
  if (months.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-6">
        Nenhum ganho registrado ainda
      </div>
    );
  }

  const maxLucro = Math.max(...Object.values(monthMap), 1);

  return (
    <div className="space-y-3">
      {months.map((key) => {
        const [year, month] = key.split("-");
        const lucro = monthMap[key];
        const pct = capitalInicial > 0 ? (lucro / capitalInicial) * 100 : 0;
        const barWidth = Math.max((lucro / maxLucro) * 100, 4);

        return (
          <div key={key} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {MONTH_NAMES[parseInt(month, 10) - 1]} {year}
              </span>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-700">
                  {formatBRL(lucro)}
                </span>
                <span className="text-xs text-gray-400 ml-1.5">
                  {formatPercent(pct)}
                </span>
              </div>
            </div>
            <div className="w-full bg-emerald-50 rounded-full h-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all"
                style={{ width: barWidth + "%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}