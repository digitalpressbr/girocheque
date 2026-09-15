import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, ChevronLeft, ChevronRight, Wand2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { downloadFile, sanitizeName } from "@/lib/download";
import { base44 } from "@/api/base44Client";
import { getChequePrivateFileUris, mergeChequePrivateFileUris } from "@/lib/chequePrivateFiles";
import { useToast } from "@/components/ui/use-toast";
import ChequePreviewDialog from "@/components/ChequePreviewDialog";

export default function PhotoViewer({ url, startIndex = 0, open, onClose, emitente, dataVencimento, cheque, onPhotoUpdated }) {
  const [index, setIndex] = useState(0);
  const [editFile, setEditFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [signed, setSigned] = useState([]);
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [errorUrls, setErrorUrls] = useState(false);
  const touchStartX = useRef(null);
  const { toast } = useToast();

  // Fontes de visualização por slot: URI privada (assinada) ou legado público.
  // slot 1 = foto_uri / foto_url ; slot 2 = foto_uri_2 / foto_url_2.
  const slotSources = [];
  if (cheque) {
    const s1Uri = signed[0] || "";
    const s1Legacy = cheque.foto_url || "";
    if (s1Uri) slotSources.push({ kind: "private", url: s1Uri, slot: 1 });
    else if (s1Legacy) slotSources.push({ kind: "legacy", url: s1Legacy, slot: 1 });

    const s2Uri = signed[1] || "";
    const s2Legacy = cheque.foto_url_2 || "";
    if (s2Uri) slotSources.push({ kind: "private", url: s2Uri, slot: 2 });
    else if (s2Legacy) slotSources.push({ kind: "legacy", url: s2Legacy, slot: 2 });
  }
  const list = slotSources.map((s) => s.url);
  const listKey = list.join("|");

  const generateSignedUrls = async (chequeRef) => {
    if (!chequeRef) return;
    const uris = getChequePrivateFileUris(chequeRef);
    if (uris.length === 0) {
      setSigned([]);
      setLoadingUrls(false);
      setErrorUrls(false);
      return;
    }
    setLoadingUrls(true);
    setErrorUrls(false);
    try {
      const results = await Promise.all(
        uris.map((file_uri) =>
          base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 900 })
            .then((r) => r.signed_url || "")
            .catch(() => "")
        )
      );
      setSigned(results);
    } catch {
      setErrorUrls(true);
    } finally {
      setLoadingUrls(false);
    }
  };

  useEffect(() => {
    if (open) {
      const clamped = Math.min(Math.max(0, startIndex), Math.max(0, list.length - 1));
      setIndex(clamped);
      setEditFile(null);
      setSaving(false);
      setZoom(false);
      setSigned([]);
      generateSignedUrls(cheque);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startIndex, cheque]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overlay-open");
      return () => document.body.classList.remove("overlay-open");
    }
  }, [open]);

  if (!open) return null;
  if (list.length === 0) return null;

  if (saving) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  if (editFile) {
    return (
      <ChequePreviewDialog
        open={true}
        file={editFile}
        onChoose={(selectedFile) => handleChooseEdit(selectedFile)}
        onClose={() => setEditFile(null)}
      />
    );
  }

  const current = list[index] || list[0] || "";
  const currentSource = slotSources[index] || slotSources[0];
  const isPdf = current ? current.toLowerCase().endsWith(".pdf") : false;
  const baseName = "cheque-" + sanitizeName(emitente) + "-" + (dataVencimento || "sem-data");
  const filename = baseName + (list.length > 1 ? "-" + (index + 1) : "") + (isPdf ? ".pdf" : ".jpg");

  const goTo = (i) => { setIndex((i + list.length) % list.length); setZoom(false); };
  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (zoom) return;
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx > 0) prev(); else next();
    }
    touchStartX.current = null;
  };

  const handleEdit = async () => {
    try {
      const res = await fetch(current);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const file = new File([blob], "cheque_edit.jpg", { type: blob.type || "image/jpeg" });
      setEditFile(file);
    } catch (err) {
      toast({ title: "Não foi possível carregar a imagem para edição", variant: "destructive" });
    }
  };

  async function handleChooseEdit(selectedFile) {
    if (selectedFile === editFile) {
      setEditFile(null);
      return;
    }
    const slot = currentSource?.slot || 1;
    setEditFile(null);
    setSaving(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: selectedFile });
      const merged = mergeChequePrivateFileUris(cheque, file_uri, { slot });
      const updateData = { foto_uri: merged.foto_uri, foto_uri_2: merged.foto_uri_2 };
      await base44.entities.Cheque.update(cheque.id, updateData);

      // Estado local atualizado para regenerar links sem depender do pai.
      const updatedCheque = { ...cheque, foto_uri: merged.foto_uri, foto_uri_2: merged.foto_uri_2 };
      setSigned([]);
      await generateSignedUrls(updatedCheque);

      if (onPhotoUpdated) await onPhotoUpdated();
      toast({ title: "Foto atualizada" });
    } catch (err) {
      toast({ title: "Erro ao atualizar foto", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-2 rounded-2xl">
        <DialogTitle className="sr-only">Fotos do cheque</DialogTitle>
        {isPdf ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <FileText size={48} className="text-gray-400" />
            <div className="flex gap-2">
              <a
                href={current}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm font-semibold"
              >
                Abrir PDF
              </a>
              <button
                onClick={() => downloadFile(current, filename)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold flex items-center gap-1.5"
              >
                <Download size={16} />
                Baixar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center text-sm font-semibold text-emerald-800 mb-2">
              Foto {index + 1} de {list.length}
            </div>
            <div className="relative">
              {loadingUrls ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10">
                  <Loader2 size={24} className="animate-spin text-emerald-700" />
                  <p className="text-xs text-gray-500">Carregando foto…</p>
                </div>
              ) : errorUrls ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <AlertCircle size={28} className="text-red-500" />
                  <p className="text-xs text-gray-500 text-center px-4">Não foi possível carregar a foto.</p>
                  <button
                    onClick={() => generateSignedUrls(cheque)}
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} />
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <div className={zoom ? "rounded-xl overflow-auto max-h-[60vh] overscroll-contain" : ""}>
                  <img
                    src={current}
                    alt="Foto do cheque"
                    onClick={() => setZoom((z) => !z)}
                    className={`rounded-xl select-none ${zoom ? "w-[200%] h-auto max-w-none block" : "w-full object-contain max-h-[60vh]"}`}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    draggable={false}
                  />
                </div>
              )}
              {list.length > 1 && !zoom && !loadingUrls && (
                <>
                  <button
                    onClick={prev}
                    aria-label="Foto anterior"
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/40 text-white rounded-full"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={next}
                    aria-label="Próxima foto"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/40 text-white rounded-full"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={() => setZoom((z) => !z)}
                  aria-label={zoom ? "Reduzir" : "Ampliar"}
                  className="min-h-[44px] min-w-[44px] px-3 bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-md"
                >
                  {zoom ? "Reduzir" : "Ampliar"}
                </button>
                <button
                  onClick={handleEdit}
                  className="min-h-[44px] px-3 bg-white/90 backdrop-blur text-gray-800 rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <Wand2 size={16} />
                  Editar
                </button>
                <button
                  onClick={() => downloadFile(current, filename)}
                  className="min-h-[44px] px-3 bg-white/90 backdrop-blur text-gray-800 rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <Download size={16} />
                  Baixar
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-center mt-3">
              {slotSources.map((s, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={i === 0 ? "Foto 1" : "Foto 2"}
                  className={`relative rounded-lg overflow-hidden border-2 ${i === index ? "border-emerald-700" : "border-transparent"}`}
                  style={{ width: 60, height: 60 }}
                >
                  <img
                    src={s.url}
                    alt={i === 0 ? "Foto 1" : "Foto 2"}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}