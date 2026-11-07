import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RotateCw, X, Loader2, Sparkles, Check, Maximize2 } from "lucide-react";
import { detectarPapel, melhorarImagem, LADO_MAX } from "@/lib/detectarPapel";

// Tela da foto do cheque: o recorte automático aparece na hora como uma moldura sobre a foto.
// A pessoa arrasta os cantos se precisar, gira, liga ou desliga "Melhorar" e toca em "Usar foto".
// Tudo roda no celular, sem internet. O resultado sai deitado (paisagem) e em JPEG.

async function carregarImagem(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasParaArquivo(canvas, nome) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(new File([blob], nome, { type: "image/jpeg" })), "image/jpeg", 0.88);
  });
}

function girar90(img) {
  const c = document.createElement("canvas");
  c.width = img.naturalHeight || img.height;
  c.height = img.naturalWidth || img.width;
  const ctx = c.getContext("2d");
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -(img.naturalWidth || img.width) / 2, -(img.naturalHeight || img.height) / 2);
  return c;
}

function detectarNaImagem(img) {
  const escala = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * escala));
  c.height = Math.max(1, Math.round(img.naturalHeight * escala));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return detectarPapel(ctx.getImageData(0, 0, c.width, c.height));
}

const CAIXA_INTEIRA = { x: 0, y: 0, w: 1, h: 1 };
const MIN_CROP = 0.08;
const CANTOS = [
  { id: "tl", left: true, top: true, pos: { left: "0%", top: "0%" } },
  { id: "tr", right: true, top: true, pos: { left: "100%", top: "0%" } },
  { id: "bl", left: true, bottom: true, pos: { left: "0%", top: "100%" } },
  { id: "br", right: true, bottom: true, pos: { left: "100%", top: "100%" } },
];

export default function ChequePreviewDialog({ open, file, onChoose, onClose }) {
  const [url, setUrl] = useState("");
  const [crop, setCrop] = useState(CAIXA_INTEIRA);
  const [achou, setAchou] = useState(null);
  const [melhorar, setMelhorar] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const fonteRef = useRef(null);
  const urlRef = useRef("");
  const caixaRef = useRef(null);
  const arrastoRef = useRef(null);

  const mostrar = async (arquivoOuCanvas) => {
    const blob = arquivoOuCanvas instanceof Blob
      ? arquivoOuCanvas
      : await new Promise((r) => arquivoOuCanvas.toBlob(r, "image/jpeg", 0.92));
    const novo = URL.createObjectURL(blob);
    const img = await carregarImagem(blob);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = novo;
    fonteRef.current = img;
    setUrl(novo);
    let caixa = null;
    try { caixa = detectarNaImagem(img); } catch { caixa = null; }
    setAchou(!caixa ? "nao" : caixa.w > 0.95 && caixa.h > 0.95 ? "inteiro" : "sim");
    setCrop(caixa || CAIXA_INTEIRA);
  };

  useEffect(() => {
    if (!open || !file) return undefined;
    setMelhorar(true);
    setOcupado(true);
    mostrar(file).catch(() => setAchou("nao")).finally(() => setOcupado(false));
    document.body.classList.add("overlay-open");
    return () => {
      document.body.classList.remove("overlay-open");
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file]);

  if (!open || !file) return null;

  const girar = async () => {
    if (ocupado || !fonteRef.current) return;
    setOcupado(true);
    try {
      await mostrar(girar90(fonteRef.current));
    } finally {
      setOcupado(false);
    }
  };

  const usar = async (comRecorte) => {
    if (ocupado || !fonteRef.current) return;
    setOcupado(true);
    try {
      const img = fonteRef.current;
      const c0 = comRecorte ? crop : CAIXA_INTEIRA;
      const sx = c0.x * img.naturalWidth;
      const sy = c0.y * img.naturalHeight;
      const sw = c0.w * img.naturalWidth;
      const sh = c0.h * img.naturalHeight;
      let canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      if (comRecorte && canvas.height > canvas.width * 1.15) canvas = girar90(canvas);
      if (melhorar) {
        const c2 = canvas.getContext("2d", { willReadFrequently: true });
        const dados = c2.getImageData(0, 0, canvas.width, canvas.height);
        c2.putImageData(melhorarImagem(dados), 0, 0);
      }
      const base = (file.name || "cheque").replace(/\.[^.]+$/, "");
      onChoose(await canvasParaArquivo(canvas, base + "_cheque.jpg"));
    } finally {
      setOcupado(false);
    }
  };

  const iniciarArrasto = (e, id) => {
    if (!caixaRef.current) return;
    const r = caixaRef.current.getBoundingClientRect();
    arrastoRef.current = { id, x: e.clientX, y: e.clientY, crop: { ...crop }, w: r.width, h: r.height };
    try { caixaRef.current.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
    e.preventDefault();
    e.stopPropagation();
  };

  const mover = (e) => {
    const d = arrastoRef.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / d.w;
    const dy = (e.clientY - d.y) / d.h;
    let { x: l, y: t } = d.crop;
    let rr = d.crop.x + d.crop.w;
    let b = d.crop.y + d.crop.h;
    if (d.id === "mover") {
      const w = rr - l;
      const h = b - t;
      l = Math.max(0, Math.min(l + dx, 1 - w));
      t = Math.max(0, Math.min(t + dy, 1 - h));
      rr = l + w;
      b = t + h;
    } else {
      const c = CANTOS.find((k) => k.id === d.id);
      if (c.left) l = Math.max(0, Math.min(l + dx, rr - MIN_CROP));
      if (c.right) rr = Math.min(1, Math.max(rr + dx, l + MIN_CROP));
      if (c.top) t = Math.max(0, Math.min(t + dy, b - MIN_CROP));
      if (c.bottom) b = Math.min(1, Math.max(b + dy, t + MIN_CROP));
    }
    setCrop({ x: l, y: t, w: rr - l, h: b - t });
  };

  const soltar = (e) => {
    if (arrastoRef.current && caixaRef.current) {
      try { caixaRef.current.releasePointerCapture(e.pointerId); } catch { /* nada */ }
    }
    arrastoRef.current = null;
  };

  const estilo = { left: crop.x * 100 + "%", top: crop.y * 100 + "%", width: crop.w * 100 + "%", height: crop.h * 100 + "%" };
  const aviso = ocupado
    ? "Procurando o cheque na foto..."
    : achou === "sim"
      ? "Cheque encontrado. Se a moldura não pegou tudo, arraste os cantos."
      : achou === "inteiro"
        ? "O cheque ocupa a foto toda. Arraste os cantos se quiser cortar mais."
        : "Não achei a borda do cheque. Arraste os cantos da moldura até ele.";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !ocupado) onClose(); }}>
      <DialogContent className="fixed inset-0 z-[9999] max-w-none w-screen h-[100dvh] max-h-none p-0 border-0 rounded-none sm:rounded-none bg-black overflow-hidden flex flex-col gap-0 left-0 top-0 translate-x-0 translate-y-0 shadow-none [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Foto do cheque</DialogTitle>
        <div className="flex items-center justify-between px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 text-white shrink-0">
          <button type="button" onClick={onClose} disabled={ocupado} aria-label="Cancelar" className="w-11 h-11 flex items-center justify-center text-white/80">
            <X size={22} />
          </button>
          <span className="text-sm font-semibold">Foto do cheque</span>
          <button type="button" onClick={girar} disabled={ocupado} aria-label="Girar a foto" className="w-11 h-11 flex items-center justify-center text-white/80">
            <RotateCw size={20} />
          </button>
        </div>

        <p className="px-4 pb-2 text-center text-xs text-white/70 shrink-0" role="status">{aviso}</p>

        <div className="flex-1 flex items-center justify-center px-6 overflow-hidden min-h-0">
          <div
            ref={caixaRef}
            className="relative inline-block max-w-full max-h-full touch-none select-none"
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerCancel={soltar}
          >
            {url ? (
              <img src={url} alt="Cheque" draggable={false} className="block max-w-full max-h-[calc(100dvh-15rem)] rounded-md" />
            ) : (
              <div className="w-[280px] h-[180px] flex items-center justify-center">
                <Loader2 className="animate-spin text-white/60" />
              </div>
            )}
            {url && (
              <div
                className="absolute border-2 border-emerald-400 cursor-move"
                style={{ ...estilo, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
                onPointerDown={(e) => iniciarArrasto(e, "mover")}
              >
                {CANTOS.map((c) => (
                  <div
                    key={c.id}
                    className="absolute w-11 h-11 flex items-center justify-center touch-none"
                    style={{ ...c.pos, transform: "translate(-50%, -50%)" }}
                    onPointerDown={(e) => iniciarArrasto(e, c.id)}
                  >
                    <div className="w-5 h-5 rounded-full bg-white border-[3px] border-emerald-500 shadow" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 space-y-2 bg-black border-t border-white/10">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMelhorar((m) => !m)}
              aria-pressed={melhorar}
              className={"h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 border " + (melhorar ? "border-emerald-400 text-emerald-300" : "border-white/20 text-white/70")}
            >
              <Sparkles size={16} />
              {melhorar ? "Melhorar: ligado" : "Melhorar: desligado"}
            </button>
            <button
              type="button"
              onClick={() => setCrop(CAIXA_INTEIRA)}
              className="h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 border border-white/20 text-white/80"
            >
              <Maximize2 size={16} />
              Foto inteira
            </button>
          </div>
          <button
            type="button"
            onClick={() => usar(true)}
            disabled={ocupado || !url}
            className="w-full h-12 bg-emerald-600 text-white rounded-xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {ocupado ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            Usar foto
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
