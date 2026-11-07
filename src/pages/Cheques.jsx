import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatBRL } from "@/lib/formatCurrency";
import { ChequeCardHeader, ChequeFinancialSummary } from "@/components/ChequeCardSections";
import { localDateKey, daysUntil } from "@/lib/financialLedger";
import { filterAndSortCheques } from "@/lib/chequeSort";
import { addDaysToDateKey, persistProfitRenewal } from "@/lib/chequeRenewal";
import { openChequeDialog, closeChequeDialog } from "@/lib/chequeDialogState";
import { Check, Image as ImageIcon, Pencil, Undo2, AlertTriangle } from "lucide-react";
import { getChequePrivateFileUris } from "@/lib/chequePrivateFiles";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PhotoViewer from "@/components/PhotoViewer";
import EditChequeDialog from "@/components/EditChequeDialog";
import ChequeActionsDialog from "@/components/ChequeActionsDialog";

export default function Cheques() {
  const { toast } = useToast();
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [pending, setPending] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [photoView, setPhotoView] = useState(null);
  const [editCheque, setEditCheque] = useState(null);
  const [renovacoes, setRenovacoes] = useState([]);
  const [actionDialog, setActionDialog] = useState({ open: false, cheque: null });
  const [actionStep, setActionStep] = useState("menu");
  const [actionSaving, setActionSaving] = useState(false);

  const loadCheques = async (silent) => {
    if (!silent) setLoading(true);
    const [data, renovacoesData] = await Promise.all([
      base44.entities.Cheque.list("-data_captacao", 500),
      base44.entities.RenovacaoCheque.list("-data_realizacao", 500),
    ]);
    setCheques(data);
    setRenovacoes(renovacoesData);
    if (!silent) setLoading(false);
  };

  useEffect(() => { loadCheques(); }, []);

  const onCompensarClick = (c) => {
    const hoje = localDateKey(new Date());
    const dias = daysUntil(c.data_vencimento, hoje);
    setPending({ cheque: c, action: "compensar", adiantado: dias > 0, dias });
  };

  const onDesfazerClick = (c) => {
    setPending({ cheque: c, action: "desfazer" });
  };

  const onCardClick = (c) => {
    if (!c || c.status !== "em_aberto") return;
    try {
      addDaysToDateKey(c.data_vencimento, 30);
    } catch {
      return;
    }
    setActionDialog(openChequeDialog(c));
    setActionStep("menu");
  };

  const onActionCompensar = () => {
    const c = actionDialog.cheque;
    setActionDialog((prev) => closeChequeDialog(prev));
    setActionStep("menu");
    if (c) onCompensarClick(c);
  };

  const onActionStartRenewal = () => setActionStep("confirm");

  const onActionCancel = () => {
    if (actionStep === "confirm") {
      setActionStep("menu");
    } else {
      setActionDialog((prev) => closeChequeDialog(prev));
      setActionStep("menu");
    }
  };

  const onActionDialogOpenChange = (o) => {
    if (!o) {
      setActionDialog((prev) => closeChequeDialog(prev));
      setActionStep("menu");
    }
  };

  const onConfirmRenewal = async () => {
    if (actionSaving || !actionDialog.cheque) return;
    setActionSaving(true);
    try {
      const result = await persistProfitRenewal({
        cheque: actionDialog.cheque,
        actionDate: localDateKey(new Date()),
        createRenewal: (renewal) => base44.entities.RenovacaoCheque.create(renewal),
        updateCheque: (id, update) => base44.entities.Cheque.update(id, update),
        deleteRenewal: (id) => base44.entities.RenovacaoCheque.delete(id),
      });
      await loadCheques(true);
      const novoVenc = result.chequeUpdate.data_vencimento;
      const lucroFmt = formatBRL(result.renewal.valor_lucro_realizado);
      const [vy, vm, vd] = novoVenc.split("-");
      const novoVencFmt = vd + "/" + vm + "/" + vy;
      setActionDialog((prev) => closeChequeDialog(prev));
      setActionStep("menu");
      toast({
        title: "Lucro realizado e cheque renovado por 30 dias",
        description: "Lucro " + lucroFmt + " · novo vencimento " + novoVencFmt,
        duration: 2500,
      });
    } catch (e) {
      if (e && e.message === "ROLLBACK_FAILED") {
        toast({
          title: "Conferência necessária",
          description: "A operação precisa ser verificada: a renovação foi criada, mas a atualização do cheque falhou e o rollback também. Verifique os registros.",
          variant: "destructive",
          duration: 2500,
        });
      } else {
        toast({
          title: "Não foi possível renovar o cheque",
          description: "Tente novamente em instantes.",
          variant: "destructive",
          duration: 2500,
        });
      }
    } finally {
      setActionSaving(false);
    }
  };

  const onConfirm = async () => {
    if (!pending || actionLoading) return;
    const { cheque, action } = pending;
    setActionLoading(true);
    try {
      if (action === "compensar") {
        await base44.entities.Cheque.update(cheque.id, {
          status: "compensado",
          data_compensacao: localDateKey(new Date()),
        });
      } else {
        await base44.entities.Cheque.update(cheque.id, {
          status: "em_aberto",
          data_compensacao: null,
          aviso_enviado: false,
        });
      }
      await loadCheques(true);
      setPending(null);
      toast({
        title: action === "compensar" ? "Cheque compensado" : "Compensação desfeita",
        description: action === "compensar"
          ? "O valor de face voltou ao saldo disponível."
          : "O cheque voltou para Em aberto.",
      });
    } catch (e) {
      toast({
        title: "Não foi possível atualizar o cheque",
        description: "Tente novamente. O diálogo permanece aberto.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = filterAndSortCheques(cheques, filter);

  const lucroAcumulado = filtered.reduce((s, c) => s + (c.valor_lucro || 0), 0);

  const actionHistorico = actionDialog.cheque
    ? renovacoes.filter((r) => r.cheque_id === actionDialog.cheque.id)
    : [];
  let actionNovoVencimento = "";
  if (actionDialog.cheque) {
    try {
      actionNovoVencimento = addDaysToDateKey(actionDialog.cheque.data_vencimento, 30);
    } catch {
      actionNovoVencimento = "";
    }
  }

  const formatDate = (d) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return day + "/" + m + "/" + y;
  };

  const filters = [
    { key: "todos", label: "Todos" },
    { key: "em_aberto", label: "Em aberto" },
    { key: "compensados", label: "Compensados" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Cheques</h1>

      {/* Filtro */}
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-emerald-700 text-white"
                : "bg-white text-gray-600 shadow-sm"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Totalizador */}
      <div className="bg-emerald-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between border border-emerald-100">
        <span className="text-sm text-gray-600">Lucro acumulado</span>
        <span className="text-base font-bold text-emerald-700">{formatBRL(lucroAcumulado)}</span>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-12">
          Nenhum cheque encontrado
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={
                "bg-white rounded-2xl p-4 shadow-sm " +
                (c.status === "em_aberto" ? "cursor-pointer active:bg-gray-50" : "")
              }
              {...(c.status === "em_aberto"
                ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-label":
                      "Abrir ações do cheque de " +
                      (c.emitente || "sem emitente") +
                      ", vencimento " +
                      (c.data_vencimento || "sem data"),
                    onClick: () => onCardClick(c),
                    onKeyDown: (e) => {
                      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                        e.preventDefault();
                        onCardClick(c);
                      }
                    },
                  }
                : {})}
            >
              <ChequeCardHeader cheque={c} />
              <ChequeFinancialSummary cheque={c} />

              {c.observacao && (
                <p className="text-xs text-gray-400 mb-3 italic">{c.observacao}</p>
              )}

              <div className="flex items-center justify-between">
                <div onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const legacy = [c.foto_url, c.foto_url_2].filter(Boolean);
                    const privateUris = getChequePrivateFileUris(c);
                    const urls = [...legacy, ...privateUris];
                    if (urls.length === 0)
                      return <span className="text-xs text-gray-300">Sem anexo</span>;
                    return (
                      <button
                        aria-label="Abrir foto"
                        onClick={() => setPhotoView({ urls, startIndex: 0, cheque: c })}
                        className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"
                      >
                        <ImageIcon size={14} />
                        Ver foto
                      </button>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setEditCheque(c)}
                    className="flex items-center gap-1 text-xs text-gray-500 font-medium"
                  >
                    <Pencil size={14} />
                    Editar
                  </button>
                  {c.status === "em_aberto" && (
                    <Button
                      size="sm"
                      onClick={() => onCompensarClick(c)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs h-9 px-3"
                    >
                      <Check size={14} className="mr-1" />
                      Compensar
                    </Button>
                  )}
                  {c.status === "compensado" && (
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label="Desfazer compensação"
                      onClick={() => onDesfazerClick(c)}
                      className="h-11 min-h-[44px] px-3 rounded-lg text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Undo2 size={14} className="mr-1" />
                      Desfazer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmação de compensação / desfazer */}
      <AlertDialog
        open={!!pending}
        onOpenChange={(o) => { if (!o && !actionLoading) setPending(null); }}
      >
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85dvh] rounded-2xl sm:rounded-2xl flex flex-col p-0 gap-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 pt-5 pb-3 space-y-4">
            <AlertDialogHeader className="space-y-1">
              <AlertDialogTitle className="text-lg font-bold text-gray-900">
                {pending?.action === "compensar" && pending?.adiantado
                  ? "Cheque ainda não venceu"
                  : pending?.action === "desfazer"
                  ? "Desfazer compensação"
                  : "Confirmar compensação"}
              </AlertDialogTitle>
              <AlertDialogDescription className="sr-only">
                {pending?.action === "desfazer"
                  ? "Confirme o cancelamento da compensação."
                  : "Confirme a compensação do cheque."}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {pending?.action === "compensar" && pending.adiantado && (
              <>
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Este cheque ainda não venceu. Compensar agora significa um adiantamento.
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Vencimento</p>
                  <p className="text-2xl font-bold text-gray-900">{formatDate(pending.cheque.data_vencimento)}</p>
                  <p className="text-sm font-semibold text-amber-700 mt-1">Faltam {pending.dias} dias</p>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3.5 py-2.5 text-sm">
                  <span className="text-gray-500">{pending.cheque.emitente || "Sem emitente"}</span>
                  <span className="font-bold text-gray-900">{formatBRL(pending.cheque.valor_cheque)}</span>
                </div>
              </>
            )}

            {pending?.action === "compensar" && !pending.adiantado && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Deseja marcar este cheque como compensado? O valor de face voltará para o saldo disponível.
                </p>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm">
                  <span className="text-gray-500">{pending.cheque.emitente || "Sem emitente"}</span>
                  <span className="font-bold text-gray-900">{formatBRL(pending.cheque.valor_cheque)}</span>
                </div>
              </div>
            )}

            {pending?.action === "desfazer" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    O cheque voltará para <strong>Em aberto</strong> mantendo o mesmo vencimento.
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm">
                  <span className="text-gray-500">{pending.cheque.emitente || "Sem emitente"}</span>
                  <span className="font-bold text-gray-900">{formatBRL(pending.cheque.valor_cheque)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3.5 py-2.5 text-sm">
                  <span className="text-gray-500">Vencimento</span>
                  <span className="font-semibold text-gray-700">{formatDate(pending.cheque.data_vencimento)}</span>
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter className="shrink-0 border-t border-gray-100 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex-row gap-2 sm:space-x-0">
            <AlertDialogCancel
              disabled={actionLoading}
              className="flex-1 h-11 mt-0 sm:mt-0 rounded-xl"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); onConfirm(); }}
              disabled={actionLoading}
              className={
                "flex-1 h-11 rounded-xl " +
                (pending?.action === "desfazer"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-emerald-700 hover:bg-emerald-800")
              }
            >
              {actionLoading
                ? "Aguarde..."
                : pending?.action === "compensar" && pending?.adiantado
                ? "Compensar mesmo assim"
                : pending?.action === "desfazer"
                ? "Desfazer"
                : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Foto ampliada */}
      <PhotoViewer
        urls={photoView?.urls}
        startIndex={photoView?.startIndex}
        open={!!photoView}
        onClose={() => setPhotoView(null)}
        emitente={photoView?.cheque?.emitente}
        dataVencimento={photoView?.cheque?.data_vencimento}
        cheque={photoView?.cheque}
        onPhotoUpdated={loadCheques}
      />

      {/* Editar cheque */}
      <EditChequeDialog
        cheque={editCheque}
        open={!!editCheque}
        onClose={() => setEditCheque(null)}
        onSaved={loadCheques}
        onPreview={(url) => {
          const c = editCheque;
          if (!c) return;
          const urls = [c.foto_url, c.foto_url_2].filter(Boolean).concat(getChequePrivateFileUris(c));
          setPhotoView({ urls, startIndex: Math.max(0, urls.indexOf(url)), cheque: c });
        }}
      />

      {/* Ações do cheque (compensar / renovar) */}
      <ChequeActionsDialog
        open={actionDialog.open}
        onOpenChange={onActionDialogOpenChange}
        cheque={actionDialog.cheque}
        novoVencimento={actionNovoVencimento}
        renovacoes={actionHistorico}
        step={actionStep}
        saving={actionSaving}
        onCompensar={onActionCompensar}
        onStartRenewal={onActionStartRenewal}
        onConfirmRenewal={onConfirmRenewal}
        onCancel={onActionCancel}
      />
    </div>
  );
}