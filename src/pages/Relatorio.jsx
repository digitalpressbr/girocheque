import { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { formatBRL } from "@/lib/formatCurrency";
import { localDateKey, buildFinancialReport } from "@/lib/financialLedger";
import RetiradaDialog from "@/components/RetiradaDialog";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, TrendingUp, TrendingDown, AlertTriangle, ShieldAlert,
} from "lucide-react";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const ORIGEM_LABEL = {
  cheque: "Cheque",
  aporte: "Aporte",
  retirada: "Retirada",
  devolucao: "Devolução",
  realizacao_lucro: "Lucro renovado",
};

const MONEY = "whitespace-nowrap tabular-nums text-[clamp(0.95rem,4.2vw,1.25rem)] leading-none";

function isKey(d) {
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
}
function inPeriod(d, period, mode) {
  if (!isKey(d)) return false;
  return mode === "year" ? d.slice(0, 4) === period : d.slice(0, 7) === period;
}
function periodLabel(period, mode) {
  if (mode === "year") return period;
  const [y, m] = period.split("-").map(Number);
  return MESES_FULL[m - 1] + " " + y;
}
function shiftPeriod(period, mode, dir) {
  if (mode === "year") return String(Number(period) + dir);
  let [y, m] = period.split("-").map(Number);
  m += dir;
  if (m < 1) { m = 12; y -= 1; }
  if (m > 12) { m = 1; y += 1; }
  return y + "-" + String(m).padStart(2, "0");
}
function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return day + "/" + m + "/" + y;
}

// Join report.items (source of truth for the period) with source records to
// recover display-only metadata (emitente / responsável / descrição).
function enrichItems(items, cheques, movimentacoes) {
  const pool = [];
  for (const c of cheques) {
    if (isKey(c.data_captacao)) pool.push({ date: c.data_captacao, tipo: "saida", valor: Number(c.valor_transferido) || 0, origem: "cheque", emitente: c.emitente || "", vencimento: c.data_vencimento || "" });
    if (c.status === "compensado" && isKey(c.data_compensacao)) pool.push({ date: c.data_compensacao, tipo: "entrada", valor: Number(c.valor_cheque) || 0, origem: "cheque", emitente: c.emitente || "", vencimento: c.data_vencimento || "" });
  }
  for (const m of movimentacoes) {
    if (!isKey(m.data)) continue;
    pool.push({ date: m.data, tipo: m.tipo === "aporte" ? "entrada" : "saida", valor: Number(m.valor) || 0, origem: m.tipo, responsavel: m.responsavel || "", descricao: m.descricao || "" });
  }
  const used = new Array(pool.length).fill(false);
  return items.map((it) => {
    let best = -1;
    for (let i = 0; i < pool.length; i++) {
      if (used[i]) continue;
      const p = pool[i];
      if (p.date === it.key && p.tipo === it.tipo && p.origem === it.origem && Math.abs(p.valor - it.valor) < 0.005) { best = i; break; }
    }
    let envolvido = "", descricao = "", vencimento = "";
    if (best >= 0) {
      used[best] = true;
      const p = pool[best];
      envolvido = p.emitente || p.responsavel || "";
      descricao = p.descricao || "";
      vencimento = p.vencimento || "";
    }
    return { ...it, envolvido: it.envolvido || envolvido, descricao: it.descricao || descricao, vencimento: it.vencimento || vencimento };
  });
}

function Card({ label, value, valueClass }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-0 overflow-hidden">
      <p className="text-[11px] font-medium text-gray-400 truncate">{label}</p>
      <p className={`font-bold mt-1 ${MONEY} ${valueClass}`}>{value}</p>
    </div>
  );
}

export default function Relatorio() {
  const { toast } = useToast();
  const { ativos } = useResponsaveis();
  const [cheques, setCheques] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [renovacoes, setRenovacoes] = useState([]);
  const [capital, setCapital] = useState(0);
  const [dataInicio, setDataInicio] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState("month");
  const [period, setPeriod] = useState(() => localDateKey(new Date()).slice(0, 7));
  const [retiradaOpen, setRetiradaOpen] = useState(false);
  const [editingRetirada, setEditingRetirada] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const [allCheques, allMov, allConfig, allRenov] = await Promise.all([
        base44.entities.Cheque.list("-data_captacao", 500),
        base44.entities.Movimentacao.list("-data", 500),
        base44.entities.ConfigCaixa.list("-created_date", 50),
        base44.entities.RenovacaoCheque.list("-data_realizacao", 500),
      ]);
      setCheques(allCheques);
      setMovimentacoes(allMov);
      setRenovacoes(allRenov);
      const cfg = allConfig[0] || {};
      setCapital(Number(cfg.capital_inicial) || 0);
      setDataInicio(cfg.data_inicio || "");
    } catch (e) {
      setError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const report = useMemo(
    () => buildFinancialReport({ capital, dataInicio, cheques, movimentacoes, renovacoes, period, mode }),
    [capital, dataInicio, cheques, movimentacoes, renovacoes, period, mode]
  );

  useEffect(() => {
    if (!report.audit.ok) {
      console.error("[GiroCheque][auditoria]", report.audit.errors);
    }
  }, [report.audit.ok, report.audit.errors]);

  const retiradasDoPeriodo = movimentacoes.filter((m) => m.tipo === "retirada" && inPeriod(m.data, period, mode));
  const withdrawalsByResponsible = report.capitalMovements.withdrawalsByResponsible || {};
  const retiradaResumo = useMemo(() => {
    const seen = new Map();
    for (const nome of Object.keys(withdrawalsByResponsible)) {
      seen.set(nome.toLowerCase(), { nome, valor: withdrawalsByResponsible[nome] });
    }
    for (const r of ativos) {
      const key = (r.nome || "").toLowerCase();
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, { nome: r.nome, valor: 0 });
    }
    return Array.from(seen.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [withdrawalsByResponsible, ativos]);
  const livro = enrichItems(report.cashFlow.items, cheques, movimentacoes)
    .sort((a, b) => {
      const ka = a.data || a.key || "";
      const kb = b.data || b.key || "";
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });

  const currentPeriod = mode === "year" ? localDateKey(new Date()).slice(0, 4) : localDateKey(new Date()).slice(0, 7);
  const canNext = period < currentPeriod;

  const handleMode = (m) => {
    setMode(m);
    setPeriod(m === "year" ? localDateKey(new Date()).slice(0, 4) : localDateKey(new Date()).slice(0, 7));
  };

  const openCreate = () => { setEditingRetirada(null); setRetiradaOpen(true); };
  const openEdit = (r) => { setEditingRetirada(r); setRetiradaOpen(true); };
  const closeRetirada = (o) => { if (!o) { setRetiradaOpen(false); setEditingRetirada(null); } };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await base44.entities.Movimentacao.delete(deleteTarget.id);
      await loadData(true);
      toast({ title: "Retirada excluída" });
      setDeleteTarget(null);
    } catch (e) {
      toast({ title: "Não foi possível excluir", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const chartData = report.cashFlow.series.map((p) => ({ key: p.key, "Entradas": p.entradas, "Saídas": p.saidas }));
  const seriesHasValues = report.cashFlow.series.some((p) => p.entradas > 0 || p.saidas > 0);
  const tickFmt = (k) => (mode === "year" ? MESES[Number(k.split("-")[1]) - 1] : k.slice(8, 10));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7FAF8]">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pt-6 pb-24 min-h-screen bg-[#F7FAF8] flex flex-col items-center justify-center text-center">
        <p className="text-sm text-gray-500 mb-4">Não foi possível carregar o relatório.</p>
        <Button onClick={() => loadData()} className="h-11 min-h-[44px] bg-[#0F6B4F] hover:bg-[#0F6B4F]/90 text-white rounded-xl">
          Tentar novamente
        </Button>
      </div>
    );
  }

  const saldoClass = report.position.saldoTotal >= 0 ? "text-[#16A36A]" : "text-[#475569]";
  const dispClass = report.position.disponivel >= 0 ? "text-[#16A36A]" : "text-[#475569]";

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen bg-[#F7FAF8]">
      <h1 className="text-xl font-bold text-[#1F2937] mb-4">Relatório</h1>

      {/* Navegação de período */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setPeriod(shiftPeriod(period, mode, -1))}
          aria-label="Período anterior"
          className="w-11 h-11 min-h-[44px] flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-600"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center min-w-0 px-2">
          <p className="text-sm font-semibold text-[#1F2937] break-words">{periodLabel(period, mode)}</p>
        </div>
        <button
          onClick={() => canNext && setPeriod(shiftPeriod(period, mode, 1))}
          disabled={!canNext}
          aria-label="Próximo período"
          className="w-11 h-11 min-h-[44px] flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-600 disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Modo Mês/Ano */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-gray-100 mb-4">
        {["month", "year"].map((m) => (
          <button
            key={m}
            onClick={() => handleMode(m)}
            className={`h-10 min-h-[40px] rounded-lg text-sm font-medium ${mode === m ? "bg-[#0F6B4F] text-white" : "text-gray-500"}`}
          >
            {m === "month" ? "Mês" : "Ano"}
          </button>
        ))}
      </div>

      {/* Auditoria */}
      {!report.audit.ok && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-800">Conferência financeira necessária</p>
            <p className="text-xs text-amber-700 mt-0.5 break-words">
              Há divergências nos registros do período. Verifique os valores dos cheques e movimentações.
            </p>
          </div>
        </div>
      )}

      {/* Posição atual */}
      <h2 className="text-sm font-semibold text-[#1F2937] mb-2">Posição atual</h2>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Card label="Saldo total" value={formatBRL(report.position.saldoTotal)} valueClass={saldoClass} />
        <Card label="Disponível" value={formatBRL(report.position.disponivel)} valueClass={dispClass} />
        <Card label="Em cheques" value={formatBRL(report.position.emCheques)} valueClass="text-[#B7791F]" />
        <Card label="Ganho acumulado" value={formatBRL(report.position.ganhoAcumulado)} valueClass="text-[#16A36A]" />
      </div>

      {/* Fluxo de caixa do período */}
      <h2 className="text-sm font-semibold text-[#1F2937] mb-2">Fluxo de caixa do período</h2>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Card label="Entradas" value={formatBRL(report.cashFlow.entradas)} valueClass="text-[#16A36A]" />
        <Card label="Saídas" value={formatBRL(report.cashFlow.saidas)} valueClass="text-[#C2414B]" />
        <Card label="Saldo do caixa" value={formatBRL(report.cashFlow.saldo)} valueClass={report.cashFlow.saldo >= 0 ? "text-[#16A36A]" : "text-[#C2414B]"} />
        <Card label="A receber" value={formatBRL(report.operations.aReceber)} valueClass="text-[#B7791F]" />
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-2xl p-3 border border-gray-100 mb-4 min-w-0">
        <p className="text-sm font-semibold text-[#1F2937] mb-2">
          {mode === "year" ? "Entradas × Saídas por mês" : "Entradas × Saídas por dia"}
        </p>
        {!seriesHasValues ? (
          <p className="text-xs text-gray-400 py-8 text-center">Sem operações no período.</p>
        ) : (
          <div className="w-full min-w-0 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="key"
                  tickFormatter={tickFmt}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  interval={mode === "month" ? "preserveEnd" : 0}
                  minTickGap={4}
                />
                <Tooltip
                  formatter={(value, name) => [formatBRL(value), name]}
                  labelFormatter={(k) => mode === "year" ? (() => { const [y, m] = k.split("-"); return m + "/" + y; })() : formatDate(k)}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
                  cursor={{ fill: "#00000008" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Entradas" fill="#16A36A" radius={[3, 3, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Saídas" fill="#C2414B" radius={[3, 3, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-2 break-words">
          O capital inicial entra na data de início. Compensações entram na data registrada.
        </p>
      </div>

      {/* Resultado das operações */}
      <div className="bg-white rounded-2xl p-3 border border-gray-100 mb-4 min-w-0">
        <p className="text-sm font-semibold text-[#1F2937] mb-2">Resultado das operações</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-gray-500">Valor dos cheques</span>
            <span className={`font-bold ${MONEY} text-[#1F2937]`}>{formatBRL(report.operations.valorCheques)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-gray-500">Valor liberado</span>
            <span className={`font-bold ${MONEY} text-[#1F2937]`}>{formatBRL(report.operations.liberado)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-gray-500">Ganho</span>
            <span className={`font-bold ${MONEY} text-[#16A36A]`}>{formatBRL(report.operations.ganho)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-gray-500">Lucro recebido em renovações</span>
            <span className={`font-bold ${MONEY} text-[#16A36A]`}>{formatBRL(report.operations.lucroRenovacoes)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-gray-500">Ganho total do período</span>
            <span className={`font-bold ${MONEY} text-[#16A36A]`}>{formatBRL(report.operations.ganhoTotal)}</span>
          </div>
        </div>
      </div>

      {/* Movimentações de capital */}
      <h2 className="text-sm font-semibold text-[#1F2937] mb-2">Movimentações de capital</h2>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Card label="Aportes" value={formatBRL(report.capitalMovements.aportes)} valueClass="text-[#16A36A]" />
        <Card label="Devoluções" value={formatBRL(report.capitalMovements.devolucoes)} valueClass="text-[#475569]" />
        <Card label="Retiradas" value={formatBRL(report.capitalMovements.retiradas)} valueClass="text-[#C2414B]" />
        <Card label="Particular atual" value={formatBRL(report.position.particular)} valueClass="text-[#475569]" />
      </div>

      {/* Retiradas do período */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#1F2937]">Retiradas do período</h2>
        <Button
          onClick={openCreate}
          className="h-11 min-h-[44px] bg-[#0F6B4F] hover:bg-[#0F6B4F]/90 text-white rounded-xl text-sm font-semibold px-3"
        >
          <Plus size={16} className="mr-1" />
          Registrar
        </Button>
      </div>

      {retiradaResumo.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Nenhuma retirada no período.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {retiradaResumo.map((r) => (
            <div key={r.nome} className="bg-white rounded-xl p-3 border border-gray-100 min-w-0 overflow-hidden">
              <p className="text-[11px] text-gray-400 font-medium truncate">{r.nome}</p>
              <p className={`font-bold text-[#1F2937] mt-1 ${MONEY}`}>{formatBRL(r.valor)}</p>
            </div>
          ))}
        </div>
      )}

      {retiradasDoPeriodo.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Nenhuma retirada no período.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {retiradasDoPeriodo.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#0F6B4F]">{r.responsavel}</span>
                  <span className="text-[11px] text-gray-400">{formatDate(r.data)}</span>
                </div>
                <p className="text-sm text-[#1F2937] mt-0.5 break-words">{r.descricao || r.observacao || "—"}</p>
                <p className={`font-bold text-[#C2414B] mt-1 ${MONEY}`}>{formatBRL(r.valor)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(r)} aria-label="Editar retirada" className="w-11 h-11 min-h-[44px] flex items-center justify-center text-gray-500 hover:text-[#0F6B4F]">
                  <Pencil size={16} />
                </button>
                <button onClick={() => setDeleteTarget(r)} aria-label="Excluir retirada" className="w-11 h-11 min-h-[44px] flex items-center justify-center text-gray-500 hover:text-[#C2414B]">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Livro-caixa */}
      <h2 className="text-sm font-semibold text-[#1F2937] mb-3 mt-4">Livro-caixa do período</h2>
      {livro.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">Sem movimentações neste período.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {livro.map((it, i) => {
            const isCapital = it.kind === "capital_inicial";
            const isEntrada = isCapital || it.tipo === "entrada";
            const data = it.data || it.key;
            const origemLabel = isCapital ? "Capital inicial" : (ORIGEM_LABEL[it.origem] || it.origem);
            const descricao = isCapital
              ? "Capital inicial"
              : [it.envolvido, it.descricao].filter(Boolean).join(" · ");
            return (
              <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 flex items-start gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isEntrada ? "bg-[#16A36A]/10 text-[#16A36A]" : "bg-[#C2414B]/10 text-[#C2414B]"}`}>
                  {isEntrada ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${isEntrada ? "text-[#16A36A]" : "text-[#C2414B]"}`}>
                      {isEntrada ? "Entrada" : "Saída"}
                    </span>
                    <span className="text-[11px] text-gray-400">{origemLabel}</span>
                    <span className="text-[11px] text-gray-400">{formatDate(data)}</span>
                  </div>
                  {descricao && (
                    <p className="text-xs text-[#1F2937] mt-0.5 break-words">{descricao}</p>
                  )}
                  <p className={`font-bold mt-1 ${MONEY} ${isEntrada ? "text-[#16A36A]" : "text-[#C2414B]"}`}>
                    {formatBRL(it.valor)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compensados sem data registrada */}
      {report.undatedCompensated.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-[#B7791F]" />
            <h2 className="text-sm font-semibold text-[#1F2937]">Compensados sem data registrada</h2>
          </div>
          <p className="text-xs text-gray-500 mb-2 break-words">
            Eles entram na posição atual, mas não são colocados em uma data fictícia no gráfico ou livro-caixa.
          </p>
          <div className="space-y-2">
            {report.undatedCompensated.map((c) => (
              <div key={c.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1F2937] break-words">{c.emitente || "Sem emitente"}</p>
                  <p className="text-[11px] text-gray-400">Venc. {formatDate(c.data_vencimento)}</p>
                </div>
                <p className={`font-bold text-[#1F2937] shrink-0 ${MONEY}`}>{formatBRL(c.valor_cheque)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !deleteLoading) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir retirada</AlertDialogTitle>
            <AlertDialogDescription>
              Esta retirada será removida do registro. A ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleteLoading}
              className="bg-[#C2414B] hover:bg-[#C2414B]/90"
            >
              {deleteLoading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Criar / editar retirada */}
      <RetiradaDialog
        open={retiradaOpen}
        onOpenChange={closeRetirada}
        retirada={editingRetirada}
        onSaved={async () => { await loadData(true); }}
      />
    </div>
  );
}