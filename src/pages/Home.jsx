import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatBRL, formatPercent } from "@/lib/formatCurrency";
import { calculateCashPosition } from "@/lib/financialLedger";
import { Settings, TrendingUp, Banknote, FileText, ArrowDownUp } from "lucide-react";
import WelcomeSetup from "@/components/WelcomeSetup";
import AporteModal from "@/components/AporteModal";
import UpcomingPayments from "@/components/UpcomingPayments";
import ConfigEditor from "@/components/ConfigEditor";
import MonthlyGains from "@/components/MonthlyGains";

export default function Home() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [showAporte, setShowAporte] = useState(false);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [renovacoes, setRenovacoes] = useState([]);

  const loadData = async () => {
    setLoading(true);
    const [configs, allCheques, allMov, allRenov] = await Promise.all([
      base44.entities.ConfigCaixa.list(),
      base44.entities.Cheque.list("-data_captacao", 500),
      base44.entities.Movimentacao.list("-data", 500),
      base44.entities.RenovacaoCheque.list("-data_realizacao", 500),
    ]);
    setConfig(configs.length > 0 ? configs[0] : null);
    setCheques(allCheques);
    setMovimentacoes(allMov);
    setRenovacoes(allRenov);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateConfig = async (data) => {
    const created = await base44.entities.ConfigCaixa.create(data);
    setConfig(created);
  };

  const handleUpdateConfig = async (data) => {
    const updated = await base44.entities.ConfigCaixa.update(config.id, data);
    setConfig(updated);
  };

  const reloadMovimentacoes = async () => {
    const allMov = await base44.entities.Movimentacao.list("-data", 500);
    setMovimentacoes(allMov);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!config) {
    return <WelcomeSetup onSave={handleCreateConfig} />;
  }

  const capitalInicial = config.capital_inicial || 0;
  const cash = calculateCashPosition({ capital: capitalInicial, cheques, movimentacoes, renovacoes });
  const disponivel = cash.disponivel;
  const particularNoCaixa = cash.particular;
  const emCheques = cash.emCheques;
  const saldoTotal = cash.saldoTotal;
  const crescimento = capitalInicial > 0 ? ((saldoTotal - capitalInicial) / capitalInicial) * 100 : 0;
  const somaLucro = cheques.reduce((s, c) => s + (c.valor_lucro || 0), 0)
    + renovacoes.reduce((s, r) => s + (r.valor_lucro_realizado || 0), 0);
  const somaValorCheque = cheques.reduce((s, c) => s + (c.valor_cheque || 0), 0);
  const taxaMedia = somaValorCheque > 0 ? (somaLucro / somaValorCheque) * 100 : null;
  const taxaMediaStr = taxaMedia !== null
    ? taxaMedia.toFixed(2).replace(".", ",") + "%"
    : "—";

  const formatDate = (d) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return day + "/" + m + "/" + y;
  };

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">GiroCheque</h1>
          <p className="text-xs text-gray-400">
            Capital: {formatBRL(capitalInicial)} · Desde {formatDate(config.data_inicio)}
          </p>
        </div>
        <button
          onClick={() => navigate("/configuracoes")}
          aria-label="Configurações"
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Saldo Total */}
      <div className={`${saldoTotal < 0 ? "bg-red-600" : "bg-emerald-700"} rounded-2xl p-5 shadow-lg mb-4`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-emerald-200 text-sm font-medium">Saldo Total</span>
          <span className="bg-emerald-600 text-emerald-100 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <TrendingUp size={12} />
            {crescimento >= 0 ? "+" : ""}{formatPercent(crescimento)}
          </span>
        </div>
        <p className="text-white text-3xl font-bold tracking-tight">{formatBRL(saldoTotal)}</p>
      </div>

      {/* Cards lado a lado */}
      <div className="grid grid-cols-2 gap-3 mb-1">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Banknote size={16} className="text-emerald-700" />
            </div>
          </div>
          <p className="text-sm text-gray-400 font-medium">Disponível</p>
          <p className={`text-base font-bold mt-0.5 whitespace-nowrap ${disponivel < 0 ? "text-red-600" : "text-gray-900"}`}>{formatBRL(disponivel)}</p>
          {particularNoCaixa > 0 && (
            <p className="text-xs text-blue-600 font-medium mt-0.5">Particular: {formatBRL(particularNoCaixa)}</p>
          )}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileText size={16} className="text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-400 font-medium">Em cheques</p>
          <p className="text-base font-bold text-gray-900 mt-0.5 whitespace-nowrap">{formatBRL(emCheques)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setShowAporte(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ArrowDownUp size={14} />
          Aporte particular
        </button>
        <span className="text-xs text-gray-400">Taxa média {taxaMediaStr}</span>
      </div>

      {/* Próximos vencimentos */}
      <UpcomingPayments cheques={cheques} />

      {/* Ganhos por mês */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Ganhos por mês</h2>
        <MonthlyGains cheques={cheques} renovacoes={renovacoes} capitalInicial={capitalInicial} />
      </div>

      <ConfigEditor
        config={config}
        open={showConfig}
        onClose={() => setShowConfig(false)}
        onSave={handleUpdateConfig}
      />

      <AporteModal
        open={showAporte}
        onClose={() => setShowAporte(false)}
        onChanged={reloadMovimentacoes}
      />
    </div>
  );
}