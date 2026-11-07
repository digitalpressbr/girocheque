import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatBRL, formatPercent } from "@/lib/formatCurrency";
import { calculateCashPosition } from "@/lib/financialLedger";
import { Settings, TrendingUp, Banknote, FileText, ArrowDownUp, HandCoins } from "lucide-react";
import WelcomeSetup from "@/components/WelcomeSetup";
import AporteModal from "@/components/AporteModal";
import RetiradaDialog from "@/components/RetiradaDialog";
import InstallAppButton from "@/components/InstallAppButton";
import { PedidoDeAvisos } from "@/components/AvisosVencimento";
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
  const [showRetirada, setShowRetirada] = useState(false);
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
        <div className="flex items-center gap-2 shrink-0">
          <InstallAppButton />
          <button
            onClick={() => navigate("/configuracoes")}
            aria-label="Configurações"
            className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-emerald-700 transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Patrimônio do giro: total grande e, embaixo, de onde ele vem */}
      <section
        aria-labelledby="titulo-patrimonio"
        className={`${saldoTotal < 0 ? "bg-red-600" : "bg-emerald-700"} rounded-2xl p-5 shadow-lg mb-1 text-white`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id="titulo-patrimonio" className="text-emerald-100 text-sm font-semibold">Patrimônio do giro</h2>
            <p className="text-emerald-200/90 text-[11px] leading-tight">O que você tem se todos os cheques forem pagos</p>
          </div>
          <span className="shrink-0 bg-white/15 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <TrendingUp size={12} />
            {crescimento >= 0 ? "+" : ""}{formatPercent(crescimento)}
          </span>
        </div>
        <p className="text-3xl font-bold tracking-tight mt-2 tabular-nums">{formatBRL(saldoTotal)}</p>

        <dl className="mt-4 rounded-xl bg-black/15 px-3 py-2 text-sm divide-y divide-white/10">
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="flex items-center gap-2 text-emerald-50">
              <Banknote size={16} className="shrink-0" /> Dinheiro em conta
            </dt>
            <dd className={`font-semibold tabular-nums whitespace-nowrap ${disponivel < 0 ? "text-red-200" : ""}`}>{formatBRL(disponivel)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="flex items-center gap-2 text-emerald-50">
              <FileText size={16} className="shrink-0" /> Cheques a receber
            </dt>
            <dd className="font-semibold tabular-nums whitespace-nowrap">+ {formatBRL(emCheques)}</dd>
          </div>
          {particularNoCaixa > 0 && (
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="flex items-center gap-2 text-emerald-50">
                <ArrowDownUp size={16} className="shrink-0" /> Aporte particular
              </dt>
              <dd className="font-semibold tabular-nums whitespace-nowrap">− {formatBRL(particularNoCaixa)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-emerald-100">Capital inicial</dt>
            <dd className="tabular-nums whitespace-nowrap text-emerald-100">{formatBRL(capitalInicial)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-emerald-100">Ganho até hoje</dt>
            <dd className="font-semibold tabular-nums whitespace-nowrap">{saldoTotal - capitalInicial >= 0 ? "+ " : "− "}{formatBRL(Math.abs(saldoTotal - capitalInicial))}</dd>
          </div>
        </dl>
      </section>

      <div className="flex items-center justify-end mb-1">
        <span className="text-xs text-gray-400">Taxa média {taxaMediaStr}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setShowAporte(true)}
          className="min-h-11 rounded-xl bg-white shadow-sm flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <ArrowDownUp size={16} />
          Aporte particular
        </button>
        <button
          onClick={() => setShowRetirada(true)}
          className="min-h-11 rounded-xl bg-white shadow-sm flex items-center justify-center gap-1.5 text-sm font-semibold text-[#C2414B] hover:bg-red-50 transition-colors"
        >
          <HandCoins size={16} />
          Retirada
        </button>
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

      <PedidoDeAvisos />

      <RetiradaDialog
        open={showRetirada}
        onOpenChange={(o) => setShowRetirada(o)}
        retirada={null}
        onSaved={reloadMovimentacoes}
      />
    </div>
  );
}