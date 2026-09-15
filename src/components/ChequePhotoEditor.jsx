import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, X, FileText } from "lucide-react";
import ChequePreviewDialog from "@/components/ChequePreviewDialog";

export default function ChequePhotoEditor({ fotoUrl1, fotoUrl2, onChange, onPreview }) {
  const [slot1, setSlot1] = useState({ url: fotoUrl1 || "", file: null, previewUrl: null, removed: false });
  const [slot2, setSlot2] = useState({ url: fotoUrl2 || "", file: null, previewUrl: null, removed: false });
  const [pending, setPending] = useState(null);
  const [targetSlot, setTargetSlot] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    onChange({ slot1, slot2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot1, slot2]);

  const triggerPick = (slot) => {
    setTargetSlot(slot);
    if (inputRef.current) inputRef.current.click();
  };

  const commitFile = useCallback((slot, file) => {
    const next = { url: "", file, previewUrl: URL.createObjectURL(file), removed: false };
    if (slot === 1) setSlot1(next);
    else setSlot2(next);
  }, []);

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
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

  const renderSlot = (slot, s) => {
    const active = (s.url || s.file) && !s.removed;
    const previewSrc = s.previewUrl || s.url;
    const isPdf = previewSrc && previewSrc.toLowerCase().endsWith(".pdf");
    if (!active) {
      if (slot === 1) {
        return (
          <button
            type="button"
            onClick={() => triggerPick(1)}
            className="flex items-center gap-1.5 h-24 w-24 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-500 hover:border-emerald-300 transition-colors"
          >
            <Plus size={16} />
            <span className="leading-tight text-center">Adicionar foto</span>
          </button>
        );
      }
      if (slot === 2 && slot1Active) {
        return (
          <button
            type="button"
            onClick={() => triggerPick(2)}
            className="flex items-center gap-1.5 h-24 w-24 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-500 hover:border-emerald-300 transition-colors"
          >
            <Plus size={16} />
            <span className="leading-tight text-center">Adicionar 2ª foto</span>
          </button>
        );
      }
      return null;
    }
    return (
      <div className="relative w-24">
        <button
          type="button"
          onClick={() => s.url && onPreview && onPreview(s.url)}
          className="block w-24 h-24 rounded-xl overflow-hidden border border-gray-200"
        >
          {isPdf ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
              <FileText size={24} className="text-gray-400" />
              <span className="text-[10px] text-gray-400 mt-0.5">PDF</span>
            </div>
          ) : (
            <img src={previewSrc} alt="Cheque" className="w-full h-full object-cover" />
          )}
        </button>
        <button
          type="button"
          onClick={() => removeSlot(slot)}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
        >
          <X size={14} />
        </button>
        <button
          type="button"
          onClick={() => triggerPick(slot)}
          className="absolute bottom-1 left-1 right-1 bg-white/90 backdrop-blur text-[11px] font-medium text-gray-700 rounded-md py-0.5"
        >
          Trocar
        </button>
      </div>
    );
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFile}
      />
      <div className="flex gap-3">
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