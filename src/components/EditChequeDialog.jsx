import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { phoneMask, currencyMask } from "@/lib/masks";
import { formatBRL, parseBRLInput } from "@/lib/formatCurrency";
import { mergeChequePrivateFileUris } from "@/lib/chequePrivateFiles";
import { useToast } from "@/components/ui/use-toast";
import BankSelect from "@/components/BankSelect";
import ChequePhotoEditor from "@/components/ChequePhotoEditor";

function valorToMaskedStr(v) {
  const cents = Math.round(Number(v || 0) * 100);
  return currencyMask(String(cents));
}

export default function EditChequeDialog({ cheque, open, onClose, onSaved, onPreview }) {
  const { toast } = useToast();
  const [banco, setBanco] = useState("");
  const [contato, setContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");
  const [dataCaptacao, setDataCaptacao] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [valorChequeStr, setValorChequeStr] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const photoRef = useRef({ slot1: {}, slot2: {} });

  useEffect(() => {
    if (cheque) {
      setBanco(cheque.banco || "");
      setContato(cheque.contato || "");
      setTelefone(cheque.telefone_contato || "");
      setObservacao(cheque.observacao || "");
      setDataCaptacao(cheque.data_captacao || "");
      setDataVencimento(cheque.data_vencimento || "");
      setValorChequeStr(valorToMaskedStr(cheque.valor_cheque));
      photoRef.current = { slot1: {}, slot2: {} };
      setPhotoDirty(false);
      setConfirmDiscard(false);
    }
  }, [cheque]);

  const valorTransferidoNum = Number(cheque?.valor_transferido || 0);
  const novoValorCheque = parseBRLInput(valorChequeStr);
  const lucroAtualizado = Math.round((novoValorCheque - valorTransferidoNum) * 100) / 100;
  const valorDirty = Math.abs(novoValorCheque - Number(cheque?.valor_cheque || 0)) > 0.005;

  const handlePhotoChange = (s) => {
    photoRef.current = s;
    const s1 = s.slot1 || {};
    const s2 = s.slot2 || {};
    const dirty = !!(s1.file || s1.removed || s2.file || s2.removed);
    setPhotoDirty(dirty);
  };

  const requestClose = () => {
    if (saving) return;
    if (photoDirty || valorDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const handleSave = async () => {
    if (!Number.isFinite(novoValorCheque) || novoValorCheque <= 0) {
      toast({ title: "Informe um valor do cheque válido", variant: "destructive" });
      return;
    }
    if (novoValorCheque < valorTransferidoNum) {
      toast({ title: "Valor do cheque menor que o transferido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
    const ps = photoRef.current;

    let fotoUri = cheque.foto_uri || "";
    let fotoUri2 = cheque.foto_uri_2 || "";

    if (ps.slot1.removed) {
      const merged = mergeChequePrivateFileUris(cheque, "", { slot: 1 });
      fotoUri = merged.foto_uri;
    } else if (ps.slot1.file) {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: ps.slot1.file });
      const merged = mergeChequePrivateFileUris(cheque, file_uri, { slot: 1 });
      fotoUri = merged.foto_uri;
      fotoUri2 = merged.foto_uri_2;
    }

    if (ps.slot2.removed) {
      const merged = mergeChequePrivateFileUris(cheque, "", { slot: 2 });
      fotoUri2 = merged.foto_uri_2;
    } else if (ps.slot2.file) {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: ps.slot2.file });
      const merged = mergeChequePrivateFileUris(cheque, file_uri, { slot: 2 });
      fotoUri = merged.foto_uri;
      fotoUri2 = merged.foto_uri_2;
    }

    const updateData = {
      banco,
      contato,
      telefone_contato: telefone,
      observacao,
      data_captacao: dataCaptacao,
      data_vencimento: dataVencimento,
      valor_cheque: novoValorCheque,
      valor_lucro: lucroAtualizado,
      foto_uri: fotoUri,
      foto_uri_2: fotoUri2,
    };
    if (cheque.data_vencimento !== dataVencimento) {
      updateData.aviso_enviado = false;
    }
    await base44.entities.Cheque.update(cheque.id, updateData);
    await onSaved?.();
    setPhotoDirty(false);
    onClose();
    } finally {
    setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) requestClose(); }}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl max-h-[90dvh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle>Editar cheque</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
          <BankSelect value={banco} onChange={setBanco} />
          <div>
            <Label className="text-sm font-medium text-gray-700">Valor do cheque (R$)</Label>
            <Input
              type="text"
              inputMode="numeric"
              enterKeyHint="done"
              value={valorChequeStr}
              onChange={(e) => setValorChequeStr(currencyMask(e.target.value))}
              className="mt-1.5 h-12 text-lg"
            />
            <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
              <span className="text-gray-500">Valor transferido</span>
              <span className="font-semibold text-gray-700">{formatBRL(valorTransferidoNum)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs">
              <span className="text-emerald-700">Lucro atualizado</span>
              <span className="font-semibold text-emerald-800">{formatBRL(lucroAtualizado)}</span>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Contato (quem cobrar)</Label>
            <Input
              type="text"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              className="mt-1.5 h-12"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Telefone do contato</Label>
            <Input
              type="text"
              inputMode="tel"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(phoneMask(e.target.value))}
              className="mt-1.5 h-12"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="mt-1.5 min-h-[60px] resize-none"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-gray-700">Data captação</Label>
              <Input
                type="date"
                value={dataCaptacao}
                onChange={(e) => setDataCaptacao(e.target.value)}
                className="mt-1.5 h-12"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Vencimento</Label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="mt-1.5 h-12"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">Fotos do cheque</Label>
            {cheque && (
              <div className="mt-1.5">
                <ChequePhotoEditor
                  key={cheque.id}
                  fotoUrl1={cheque.foto_url}
                  fotoUrl2={cheque.foto_url_2}
                  onChange={handlePhotoChange}
                  onPreview={onPreview}
                />
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 sticky bottom-0 bg-background border-t border-gray-100 z-30 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
          {photoDirty && (
            <p className="text-xs text-emerald-700 font-medium text-center">
              Foto pronta. Toque em Salvar alterações para confirmar.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={requestClose}
              disabled={saving}
              className="flex-1 h-12 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>

        {confirmDiscard && (
          <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center px-6">
            <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center space-y-4">
              <p className="text-gray-900 text-base font-semibold">Descartar alterações não salvas?</p>
              <p className="text-gray-500 text-sm">As alterações não salvas serão perdidas.</p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(false)}
                  className="flex-1 h-11 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmDiscard(false); onClose(); }}
                  className="flex-1 h-11 bg-red-600 text-white rounded-xl text-sm font-semibold"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}