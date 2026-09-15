import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { formatBRL, parseBRLInput } from "@/lib/formatCurrency";
import { currencyMask } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ArrowDownUp } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

export default function AporteModal({ open, onClose, onChanged }) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState("aporte");
  const [valorStr, setValorStr] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const pushedHistoryRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const particularNoCaixaAtual = movimentacoes
    .filter((m) => m.tipo === "aporte").reduce((s, m) => s + (m.valor || 0), 0)
    - movimentacoes.filter((m) => m.tipo === "devolucao").reduce((s, m) => s + (m.valor || 0), 0);

  const loadMovimentacoes = async () => {
    setLoading(true);
    const list = await base44.entities.Movimentacao.list("-data", 500);
    setMovimentacoes(list);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setTipo("aporte");
      setValorStr("");
      setData(new Date().toISOString().split("T")[0]);
      setObservacao("");
      loadMovimentacoes();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overlay-open");
      return () => document.body.classList.remove("overlay-open");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ aporteModal: true }, "");
    pushedHistoryRef.current = true;
    const onPopState = () => {
      pushedHistoryRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (pushedHistoryRef.current) {
        pushedHistoryRef.current = false;
        window.history.back();
      }
    };
  }, [open]);

  const valor = parseBRLInput(valorStr);
  const devolucaoInvalida = tipo === "devolucao" && valor > particularNoCaixaAtual;

  const handleSave = async () => {
    if (valor <= 0) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }
    if (devolucaoInvalida) {
      toast({ title: "Devolução maior que o particular no caixa", variant: "destructive" });
      return;
    }
    setSaving(true);
    await base44.entities.Movimentacao.create({ tipo, valor, data, observacao });
    setSaving(false);
    setValorStr("");
    setObservacao("");
    setTipo("aporte");
    setData(new Date().toISOString().split("T")[0]);
    await loadMovimentacoes();
    if (onChanged) onChanged();
    toast({ title: tipo === "aporte" ? "Aporte registrado!" : "Devolução registrada!" });
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    await base44.entities.Movimentacao.delete(confirmDeleteId);
    setConfirmDeleteId(null);
    await loadMovimentacoes();
    if (onChanged) onChanged();
  };

  const formatDate = (d) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return day + "/" + m + "/" + y;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b">
            <DialogTitle className="flex items-center gap-2 pr-8">
              <ArrowDownUp size={18} className="text-blue-600" />
              Aporte particular
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setTipo("aporte")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tipo === "aporte" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
              >
                Aporte
              </button>
              <button
                type="button"
                onClick={() => setTipo("devolucao")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tipo === "devolucao" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500"}`}
              >
                Devolução
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">Valor (R$)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="done"
                  placeholder="0,00"
                  value={valorStr}
                  onChange={(e) => setValorStr(currencyMask(e.target.value))}
                  className="mt-1.5 h-12 text-lg"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Data</Label>
                <Input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="mt-1.5 h-12"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Observação</Label>
                <Textarea
                  placeholder="Opcional..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="mt-1.5 min-h-[50px] resize-none"
                  rows={2}
                />
              </div>

              {devolucaoInvalida && (
                <p className="text-xs text-red-500">
                  Devolução maior que o particular no caixa ({formatBRL(particularNoCaixaAtual)})
                </p>
              )}

              <Button
                onClick={handleSave}
                disabled={saving || devolucaoInvalida}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl"
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">Histórico</p>
              {loading ? (
                <p className="text-xs text-gray-400 text-center py-4">Carregando...</p>
              ) : movimentacoes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Nenhuma movimentação</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {movimentacoes.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${m.tipo === "aporte" ? "text-blue-600" : "text-orange-600"}`}>
                          {m.tipo === "aporte" ? "Aporte" : "Devolução"}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(m.data)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${m.tipo === "aporte" ? "text-blue-600" : "text-orange-600"}`}>
                          {m.tipo === "aporte" ? "+" : "−"}{formatBRL(m.valor)}
                        </span>
                        <button
                          onClick={() => setConfirmDeleteId(m.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir movimentação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir esta movimentação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}