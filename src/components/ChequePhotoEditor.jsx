import { useState, useEffect, useCallback } from "react";
import { FileText, RefreshCw, Trash2, Plus } from "lucide-react";
import ChequePreviewDialog from "@/components/ChequePreviewDialog";
import OrigemFoto from "@/components/OrigemFoto";
import { base44 } from "@/api/base44Client";

// As fotos ficam no armazenamento privado (foto_uri); para mostrar é preciso um link assinado.
function useLinkDaFoto(valor) {
  const [link, setLink] = useState("");
  useEffect(() => {
    let vivo = true;
    if (!valor) { setLink(""); return undefined; }
    if (/^(https?:|blob:)/.test(valor)) { setLink(valor); return undefined; }
    setLink("");
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: valor, expires_in: 900 })
      .then((r) => { if (vivo) setLink(r?.signed_url || ""); })
      .catch(() => { if (vivo) setLink(""); });
    return () => { vivo = false; };
  }, [valor]);
  return link;
}

export default function ChequePhotoEditor({ fotoUrl1, fotoUrl2, onChange, onPreview }) {
  const [slot1, setSlot1] = useState({ url: fotoUrl1 || "", file: null, previewUrl: null, removed: false });
  const [slot2, setSlot2] = useState({ url: fotoUrl2 || "", file: null, previewUrl: null, removed: false });
  const [pending, setPending] = useState(null);
  const [targetSlot, setTargetSlot] = useState(null);

  useEffect(() => {
    onChange({ slot1, slot2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot1, slot2]);

  const triggerPick = (slot) => {
    setTargetSlot((atual) => (atual === slot ? null : slot));
  };

  const commitFile = useCallback((slot, file) => {
    const next = { url: "", file, previewUrl: URL.createObjectURL(file), removed: false };
    if (slot === 1) setSlot1(next);
    else setSlot2(next);
  }, []);

  const handleFile = (f) => {
    if (!f || !targetSlot) return;
    const slot = targetSlot;
    setTargetSlot(null);

    if (f.type === "application/pdf") {
      commitFile(slot, f);
      return;
    }

    setPending({ file: f, slot });
  };

  const choosePending = useCallback((selectedFile) => {
    const slot = pending?.slot ?? null;
    if (slot == null) {
      setPending(null);
      return;
    }
    commitFile(slot, selectedFile);
    setPending(null);
  }, [commitFile, pending]);

  const closePending = useCallback(() => {
    setPending(null);
  }, []);

  const removeSlot = (slot) => {
    const next = { url: "", file: null, previewUrl: null, removed: true };
    if (slot === 1) setSlot1(next);
    else setSlot2(next);
  };

  const slot1Active = ((slot1.url || slot1.file) && !slot1.removed);
  const link1 = useLinkDaFoto(slot1.removed ? "" : slot1.url);
  const link2 = useLinkDaFoto(slot2.removed ? "" : slot2.url);

  const renderSlot = (slot, s) => {
    const active = (s.url || s.file) && !s.removed;
    const previewSrc = s.previewUrl || (slot === 1 ? link1 : link2);
    const isPdf = (s.file && s.file.type === "application/pdf") || (s.url && s.url.toLowerCase().split("?")[0].endsWith(".pdf"));
    const escolhendo = targetSlot === slot;
    if (!active) {
      if (slot === 2 && !slot1Active) return null;
      return (
        <div key={slot}>
          {escolhendo ? (
            <OrigemFoto compacto onArquivo={handleFile} />
          ) : (
            <button
              type="button"
              onClick={() => triggerPick(slot)}
              className="w-full h-12 flex items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-emerald-300"
            >
              <Plus size={16} />
              {slot === 1 ? "Adicionar foto" : "Adicionar 2ª foto (verso)"}
            </button>
          )}
        </div>
      );
    }
    return (
      <div key={slot} className="rounded-xl border border-gray-200 bg-white p-2">
        <button
          type="button"
          onClick={() => s.url && onPreview && onPreview(s.url)}
          className="block w-full rounded-lg overflow-hidden bg-gray-50"
          aria-label="Ver a foto"
        >
          {isPdf ? (
            <div className="h-20 flex items-center justify-center gap-2 text-gray-500">
              <FileText size={20} /> <span className="text-sm">PDF</span>
            </div>
          ) : previewSrc ? (
            <img src={previewSrc} alt={slot === 1 ? "Foto do cheque" : "Verso do cheque"} className="w-full max-h-40 object-contain" />
          ) : (
            <div className="h-28 flex items-center justify-center text-xs text-gray-400">Carregando a foto...</div>
          )}
        </button>
        {escolhendo ? (
          <div className="mt-2 space-y-2">
            <OrigemFoto compacto onArquivo={handleFile} />
            <button type="button" onClick={() => setTargetSlot(null)} className="w-full h-11 text-sm text-gray-500">Manter esta foto</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button type="button" onClick={() => triggerPick(slot)} className="h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 flex items-center justify-center gap-1.5">
              <RefreshCw size={16} /> Trocar
            </button>
            <button type="button" onClick={() => removeSlot(slot)} className="h-11 rounded-xl border border-red-200 text-sm font-semibold text-red-600 flex items-center justify-center gap-1.5">
              <Trash2 size={16} /> Excluir
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="space-y-3">
        {renderSlot(1, slot1)}
        {renderSlot(2, slot2)}
      </div>

      <ChequePreviewDialog
        open={!!pending}
        file={pending?.file}
        onChoose={choosePending}
        onClose={closePending}
      />
    </div>
  );
}
