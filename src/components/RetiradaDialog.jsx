import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currencyMask } from "@/lib/masks";
import { parseBRLInput } from "@/lib/formatCurrency";
import { localDateKey } from "@/lib/financialLedger";
import { useToast } from "@/components/ui/use-toast";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { normalizeResponsavelName } from "@/lib/responsaveis";
import { Plus, Check, X as XIcon } from "lucide-react";

function valorToMaskedStr(v) {
  const cents = Math.round(Number(v || 0) * 100);
  return currencyMask(String(cents));
}

function isDateKey(d) {
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export default function RetiradaDialog({ open, onOpenChange, retirada, onSaved }) {
  const { toast } = useToast();
  const { ativos, add: addResponsavel } = useResponsaveis();
  const [responsavel, setResponsavel] = useState("");
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valorStr, setValorStr] = useState("");
  const [data, setData] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNovoAberto(false);
    setNovoNome("");
    if (!open) {
      setResponsavel("");
      setDescricao("");
      setValorStr("");
      setData("");
      setErrors({});
      return;
    }
    if (retirada) {
      setResponsavel(retirada.responsavel || "");
      setDescricao(retirada.descricao || "");
      setValorStr(valorToMaskedStr(retirada.valor));
      setData(retirada.data || localDateKey(new Date()));
    } else {
      setResponsavel("");
      setDescricao("");
      setValorStr("");
      setData(localDateKey(new Date()));
    }
    setErrors({});
  }, [open, retirada]);

  const valorNum = parseBRLInput(valorStr);

  // Nomes ativos da conta + o nome já gravado na retirada que está sendo editada
  const opcoes = useMemo(() => {
    const nomes = ativos.map((r) => r.nome).filter(Boolean);
    if (retirada?.responsavel && !nomes.some((n) => n.toLowerCase() === retirada.responsavel.toLowerCase())) {
      nomes.push(retirada.responsavel);
    }
    if (responsavel && !nomes.some((n) => n.toLowerCase() === responsavel.toLowerCase())) {
      nomes.push(responsavel);
    }
    return nomes;
  }, [ativos, retirada, responsavel]);

  // Só um nome cadastrado: já vem marcado
  useEffect(() => {
    if (open && !retirada && !responsavel && opcoes.length === 1) setResponsavel(opcoes[0]);
  }, [open, retirada, responsavel, opcoes]);

  const confirmarNovoNome = async () => {
    const nome = normalizeResponsavelName(novoNome);
    if (!nome || salvandoNome) return;
    const existente = opcoes.find((n) => n.toLowerCase() === nome.toLowerCase());
    if (existente) {
      setResponsavel(existente);
    } else {
      setSalvandoNome(true);
      const criado = await addResponsavel(nome);
      setSalvandoNome(false);
      if (!criado) {
        toast({ title: "Não foi possível salvar o nome", description: "Tente de novo.", variant: "destructive" });
        return;
      }
      setResponsavel(criado.nome || nome);
    }
    setNovoAberto(false);
    setNovoNome("");
    setErrors((e) => ({ ...e, responsavel: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!responsavel.trim()) errs.responsavel = "Escolha quem fez a retirada.";
    if (!descricao.trim()) errs.descricao = "Informe uma descrição.";
    if (!Number.isFinite(valorNum) || valorNum <= 0) errs.valor = "Informe um valor maior que zero.";
    if (!isDateKey(data)) errs.data = "Informe uma data válida.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    const payload = {
      tipo: "retirada",
      responsavel,
      descricao: descricao.trim(),
      observacao: descricao.trim(),
      valor: valorNum,
      data,
    };
    try {
      if (retirada) {
        await base44.entities.Movimentacao.update(retirada.id, payload);
      } else {
        await base44.entities.Movimentacao.create(payload);
      }
      await onSaved?.();
      toast({ title: retirada ? "Retirada atualizada" : "Retirada registrada" });
      onOpenChange?.(false);
    } catch (e) {
      toast({
        title: "Não foi possível salvar a retirada",
        description: "Tente novamente. O formulário permanece aberto.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (saving) return; onOpenChange?.(o); }}>
      <DialogContent className="max-w-md max-h-[85dvh] rounded-2xl flex flex-col p-0 gap-0 overflow-hidden [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle>{retirada ? "Editar retirada" : "Nova retirada"}</DialogTitle>
          <DialogDescription className="sr-only">
            Registre a retirada informando o responsável, a descrição, o valor e a data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
          <div>
            <Label htmlFor="retirada-responsavel" className="text-sm font-medium text-gray-700">Retirada feita por</Label>
            <div
              id="retirada-responsavel"
              role="radiogroup"
              aria-label="Retirada feita por"
              className="mt-1.5 grid grid-cols-2 gap-2"
            >
              {opcoes.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={responsavel === r}
                  onClick={() => setResponsavel(r)}
                  className={`min-h-11 min-w-11 px-2 rounded-xl text-sm font-semibold transition-colors border truncate ${
                    responsavel === r
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {r}
                </button>
              ))}
              {!novoAberto && (
                <button
                  type="button"
                  onClick={() => setNovoAberto(true)}
                  className="min-h-11 min-w-11 rounded-xl text-sm font-semibold border border-dashed border-emerald-300 text-emerald-700 bg-emerald-50/50 flex items-center justify-center gap-1"
                >
                  <Plus size={16} />
                  Outra pessoa
                </button>
              )}
            </div>
            {novoAberto && (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  autoFocus
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmarNovoNome(); } }}
                  placeholder="Nome de quem retirou"
                  autoCapitalize="words"
                  enterKeyHint="done"
                  className="h-11 text-base flex-1 min-w-0"
                  aria-label="Nome de quem retirou"
                />
                <button
                  type="button"
                  onClick={confirmarNovoNome}
                  disabled={!novoNome.trim() || salvandoNome}
                  aria-label="Adicionar nome"
                  className="w-11 h-11 shrink-0 rounded-xl bg-emerald-700 text-white flex items-center justify-center disabled:opacity-50"
                >
                  <Check size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => { setNovoAberto(false); setNovoNome(""); }}
                  aria-label="Cancelar novo nome"
                  className="w-11 h-11 shrink-0 rounded-xl border border-gray-200 text-gray-500 flex items-center justify-center"
                >
                  <XIcon size={18} />
                </button>
              </div>
            )}
            {errors.responsavel && <p className="text-xs text-red-600 mt-1.5">{errors.responsavel}</p>}
          </div>

          <div>
            <Label htmlFor="retirada-descricao" className="text-sm font-medium text-gray-700">Descrição</Label>
            <Textarea
              id="retirada-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="mt-1.5 min-h-[60px] resize-none"
              rows={2}
              placeholder="Motivo da retirada"
            />
            {errors.descricao && <p className="text-xs text-red-600 mt-1.5">{errors.descricao}</p>}
          </div>

          <div>
            <Label htmlFor="retirada-valor" className="text-sm font-medium text-gray-700">Valor (R$)</Label>
            <Input
              id="retirada-valor"
              type="text"
              inputMode="numeric"
              enterKeyHint="done"
              value={valorStr}
              onChange={(e) => setValorStr(currencyMask(e.target.value))}
              className="mt-1.5 h-12 text-base"
              placeholder="0,00"
            />
            {errors.valor && <p className="text-xs text-red-600 mt-1.5">{errors.valor}</p>}
          </div>

          <div>
            <Label htmlFor="retirada-data" className="text-sm font-medium text-gray-700">Data</Label>
            <Input
              id="retirada-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="mt-1.5 h-12"
            />
            {errors.data && <p className="text-xs text-red-600 mt-1.5">{errors.data}</p>}
          </div>
        </div>

        <div className="shrink-0 sticky bottom-0 bg-background border-t border-gray-100 z-30 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={saving}
              className="flex-1 min-h-11 min-w-11 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 min-h-11 min-w-11 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl"
            >
              {saving ? "Salvando..." : retirada ? "Salvar alterações" : "Salvar retirada"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}