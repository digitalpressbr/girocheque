import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RotateCw, Crop, X, Undo2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { autoDetectAndCrop, verifyCropComplete } from "@/lib/chequeScanner";

async function fileToImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    if (typeof img.decode === "function") {
      try { await img.decode(); } catch {}
    }
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function rotateCanvas(img, deg) {
  const canvas = document.createElement("canvas");
  if (deg % 180 === 0) {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
  } else {
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
  }
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return canvas;
}

function canvasToFile(canvas, name) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob], name, { type: "image/jpeg" }));
    }, "image/jpeg", 0.85);
  });
}

const MIN_CROP = 0.05;

const HANDLES = [
  { id: "tl", edges: { left: true, top: true }, cursor: "nwse-resize", pos: { left: "0%", top: "0%" } },
  { id: "tr", edges: { right: true, top: true }, cursor: "nesw-resize", pos: { left: "100%", top: "0%" } },
  { id: "bl", edges: { left: true, bottom: true }, cursor: "nesw-resize", pos: { left: "0%", top: "100%" } },
  { id: "br", edges: { right: true, bottom: true }, cursor: "nwse-resize", pos: { left: "100%", top: "100%" } },
  { id: "t", edges: { top: true }, cursor: "ns-resize", pos: { left: "50%", top: "0%" } },
  { id: "b", edges: { bottom: true }, cursor: "ns-resize", pos: { left: "50%", top: "100%" } },
  { id: "l", edges: { left: true }, cursor: "ew-resize", pos: { left: "0%", top: "50%" } },
  { id: "r", edges: { right: true }, cursor: "ew-resize", pos: { left: "100%", top: "50%" } },
];

export default function ChequePreviewDialog({ open, file, onChoose, onClose }) {
  const [displayUrl, setDisplayUrl] = useState("");
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState(null);
  const [busy, setBusy] = useState(false);
  const [iaStatus, setIaStatus] = useState("");
  const [canRevert, setCanRevert] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const containerRef = useRef(null);
  const objectUrlRef = useRef("");
  const originalFileRef = useRef(null);
  const currentFileRef = useRef(null);
  const preCropFileRef = useRef(null);
  const suggestedBoxRef = useRef(null);
  const dragRef = useRef(null);
  const iaGuard = useRef(false);

  async function preloadAndSwap(newFile) {
    const newUrl = URL.createObjectURL(newFile);
    try {
      const tmp = new Image();
      await new Promise((resolve, reject) => {
        tmp.onload = resolve;
        tmp.onerror = reject;
        tmp.src = newUrl;
      });
      if (typeof tmp.decode === "function") {
        try { await tmp.decode(); } catch {}
      }
    } catch {}
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = newUrl;
    setDisplayUrl(newUrl);
  }

  useEffect(() => {
    if (!open || !file) return;

    originalFileRef.current = file;
    currentFileRef.current = file;
    preCropFileRef.current = null;
    suggestedBoxRef.current = null;
    setCropping(false);
    setCrop(null);
    setBusy(false);
    setCanRevert(false);
    setShowDiscardConfirm(false);
    setIaStatus("detectando");

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setDisplayUrl(url);

    const guardId = Date.now();
    iaGuard.current = guardId;

    (async () => {
      try {
        const { file: croppedFile, box, method, telemetry } = await autoDetectAndCrop(file);
        if (iaGuard.current !== guardId) return;

        if (croppedFile && box) {
          suggestedBoxRef.current = box;

          setIaStatus("conferindo");
          const isComplete = await verifyCropComplete(croppedFile);
          if (iaGuard.current !== guardId) return;

          base44.entities.DiagnosticoScan.create({
            data_hora: new Date().toISOString(),
            metodo: method,
            caixa: telemetry.caixa,
            area_pct: telemetry.area_pct,
            rotacionou: telemetry.rotacionou,
            conferencia: isComplete ? "aprovou" : "reprovou",
            resultado: isComplete ? "aplicado" : "original",
            motivo: telemetry.motivo,
            caixa_luminosidade: telemetry.caixa_luminosidade,
            caixa_ia: telemetry.caixa_ia,
          }).catch(() => {});

          if (isComplete) {
            currentFileRef.current = croppedFile;
            await preloadAndSwap(croppedFile);
            setCanRevert(true);
          }
        } else {
          base44.entities.DiagnosticoScan.create({
            data_hora: new Date().toISOString(),
            metodo: method,
            caixa: "",
            area_pct: 0,
            rotacionou: false,
            conferencia: "nao_rodou",
            resultado: "original",
            motivo: telemetry.motivo,
            caixa_luminosidade: telemetry.caixa_luminosidade,
            caixa_ia: telemetry.caixa_ia,
          }).catch(() => {});
        }
      } catch (err) {
        console.error("[ChequePreviewDialog] Erro IA:", err);
      } finally {
        if (iaGuard.current === guardId) setIaStatus("");
      }
    })();

    return () => {
      iaGuard.current = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overlay-open");
      return () => document.body.classList.remove("overlay-open");
    }
  }, [open]);

  if (!open || !file) return null;

  const cancelIa = () => {
    iaGuard.current = false;
    setIaStatus("");
  };

  const handleRotate = async () => {
    if (busy) return;
    cancelIa();
    setBusy(true);
    try {
      const img = await fileToImage(currentFileRef.current);
      const canvas = rotateCanvas(img, 90);
      const newFile = await canvasToFile(canvas, "cheque_rotated.jpg");
      currentFileRef.current = newFile;
      await preloadAndSwap(newFile);
      setCanRevert(true);
    } catch (err) {
      console.error("[ChequePreviewDialog] Erro ao girar:", err);
    } finally {
      setBusy(false);
    }
  };

  const enterCrop = async () => {
    if (busy) return;
    cancelIa();
    preCropFileRef.current = currentFileRef.current;
    const origFile = originalFileRef.current;
    currentFileRef.current = origFile;
    const init = suggestedBoxRef.current || { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
    setCrop(init);
    setCropping(true);
    await preloadAndSwap(origFile);
  };

  const cancelCrop = async () => {
    if (preCropFileRef.current) {
      currentFileRef.current = preCropFileRef.current;
      await preloadAndSwap(preCropFileRef.current);
    }
    setCropping(false);
    setCrop(null);
  };

  const confirmCrop = async () => {
    if (busy || !crop) return;
    setBusy(true);
    try {
      const img = await fileToImage(originalFileRef.current);
      const sx = crop.x * img.naturalWidth;
      const sy = crop.y * img.naturalHeight;
      const sw = crop.w * img.naturalWidth;
      const sh = crop.h * img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const newFile = await canvasToFile(canvas, "cheque_cropped.jpg");
      currentFileRef.current = newFile;
      await preloadAndSwap(newFile);
      setCanRevert(true);
      setCropping(false);
      setCrop(null);
    } catch (err) {
      console.error("[ChequePreviewDialog] Erro ao recortar:", err);
    } finally {
      setBusy(false);
    }
  };

  const handleRevert = async () => {
    if (busy) return;
    cancelIa();
    const origFile = originalFileRef.current;
    currentFileRef.current = origFile;
    await preloadAndSwap(origFile);
    setCanRevert(false);
    setCropping(false);
    setCrop(null);
  };

  const startDrag = (e, handleId) => {
    if (!cropping || !crop || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragRef.current = {
      handleId,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
      rectW: rect.width,
      rectH: rect.height,
    };
    try { containerRef.current.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  };

  const onDragMove = (e) => {
    const d = dragRef.current;
    if (!d) return;

    const dx = (e.clientX - d.startX) / d.rectW;
    const dy = (e.clientY - d.startY) / d.rectH;
    const sc = d.startCrop;

    let left = sc.x;
    let top = sc.y;
    let right = sc.x + sc.w;
    let bottom = sc.y + sc.h;

    if (d.handleId === "move") {
      const w = right - left;
      const h = bottom - top;
      left = Math.max(0, Math.min(left + dx, 1 - w));
      top = Math.max(0, Math.min(top + dy, 1 - h));
      right = left + w;
      bottom = top + h;
    } else {
      const handle = HANDLES.find((h) => h.id === d.handleId);
      if (!handle) return;

      if (handle.edges.left) {
        left = Math.max(0, Math.min(left + dx, right - MIN_CROP));
      }
      if (handle.edges.right) {
        right = Math.min(1, Math.max(right + dx, left + MIN_CROP));
      }
      if (handle.edges.top) {
        top = Math.max(0, Math.min(top + dy, bottom - MIN_CROP));
      }
      if (handle.edges.bottom) {
        bottom = Math.min(1, Math.max(bottom + dy, top + MIN_CROP));
      }
    }

    setCrop({ x: left, y: top, w: right - left, h: bottom - top });
  };

  const endDrag = (e) => {
    if (dragRef.current && containerRef.current) {
      try { containerRef.current.releasePointerCapture(e.pointerId); } catch {}
    }
    dragRef.current = null;
  };

  const cropStyle = crop
    ? { left: crop.x * 100 + "%", top: crop.y * 100 + "%", width: crop.w * 100 + "%", height: crop.h * 100 + "%" }
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="fixed inset-0 z-[9999] max-w-none w-screen h-[100dvh] max-h-none p-0 border-0 rounded-none sm:rounded-none bg-black overflow-hidden flex flex-col gap-0 translate-x-0 translate-y-0 shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">Pré-visualização da foto do cheque</DialogTitle>
        <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
          <button
            type="button"
            onClick={() => { if (!busy) { if (canRevert || cropping) setShowDiscardConfirm(true); else onClose(); } }}
            className="w-8 h-8 flex items-center justify-center text-white/80"
          >
            <X size={20} />
          </button>
          <span className="text-sm font-medium">Pré-visualização</span>
          <div className="w-8" />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 overflow-hidden min-h-0">
          <div
            ref={containerRef}
            className="relative inline-block max-w-full max-h-full touch-none overflow-hidden"
            onPointerMove={onDragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {displayUrl ? (
              <img
                src={displayUrl}
                alt="Cheque"
                className="block max-w-full max-h-[50vh] rounded-lg select-none"
                draggable={false}
              />
            ) : (
              <div className="w-[300px] h-[200px] bg-gray-800 rounded-lg" />
            )}

            {iaStatus === "detectando" && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 text-white text-xs px-2.5 py-1.5 rounded-md">
                <Loader2 size={12} className="animate-spin" />
                <span>IA analisando...</span>
              </div>
            )}

            {iaStatus === "conferindo" && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 text-white text-xs px-2.5 py-1.5 rounded-md">
                <Loader2 size={12} className="animate-spin" />
                <span>Conferindo recorte...</span>
              </div>
            )}

            {crop && cropStyle && (
              <div
                className={`absolute border-2 ${cropping ? "border-emerald-400 cursor-move" : "border-emerald-500/60 pointer-events-none"}`}
                style={{
                  ...cropStyle,
                  boxShadow: cropping ? "0 0 0 9999px rgba(0,0,0,0.5)" : "none",
                }}
                onPointerDown={(e) => { if (cropping) startDrag(e, "move"); }}
              >
                {cropping && HANDLES.map((h) => (
                  <div
                    key={h.id}
                    className="absolute flex items-center justify-center touch-none"
                    style={{
                      left: h.pos.left,
                      top: h.pos.top,
                      transform: "translate(-50%, -50%)",
                      width: "32px",
                      height: "32px",
                      cursor: h.cursor,
                    }}
                    onPointerDown={(e) => { e.stopPropagation(); startDrag(e, h.id); }}
                  >
                    <div className="w-3 h-3 bg-white border-2 border-emerald-500 rounded-sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 space-y-2 bg-black border-t border-white/10 relative z-30">
          {!cropping ? (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRotate}
                  disabled={busy}
                  className="flex items-center gap-1 px-3 h-9 border border-white/20 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  <RotateCw size={14} />
                  Girar
                </button>
                <button
                  type="button"
                  onClick={enterCrop}
                  disabled={busy}
                  className="flex items-center gap-1 px-3 h-9 border border-white/20 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  <Crop size={14} />
                  Ajustar recorte
                </button>
                {canRevert && (
                  <button
                    type="button"
                    onClick={handleRevert}
                    disabled={busy}
                    className="flex items-center gap-1 px-3 h-9 border border-emerald-400/40 text-emerald-300 rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    <Undo2 size={14} />
                    Reverter recorte da IA
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onChoose(originalFileRef.current)}
                  disabled={busy}
                  className="flex-1 h-11 border border-white/20 text-white/80 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  Usar original
                </button>
                <button
                  type="button"
                  onClick={() => onChoose(currentFileRef.current)}
                  disabled={busy}
                  className="flex-1 h-11 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {busy ? "..." : "Usar esta"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelCrop}
                className="flex-1 h-11 border border-white/20 text-white rounded-xl text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                disabled={busy}
                className="flex-1 h-11 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {busy ? "..." : "OK"}
              </button>
            </div>
          )}
        </div>

        {showDiscardConfirm && (
          <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center px-6">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-xs w-full text-center space-y-4">
              <p className="text-white text-base font-semibold">Descartar alterações?</p>
              <p className="text-white/60 text-sm">Suas edições serão perdidas.</p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 h-11 border border-white/20 text-white rounded-xl text-sm font-medium"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDiscardConfirm(false); onClose(); }}
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