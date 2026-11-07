import { useRef } from "react";
import { Camera, Images, FileText } from "lucide-react";

// Três botões grandes para escolher de onde vem a foto do cheque.
// "Galeria" aceita só imagem: no Android e no iPhone isso abre as Fotos do celular
// (com PDF junto, o Android abria o gerenciador de arquivos).
// O navegador da Samsung (Samsung Internet) não abre a Galeria com "image/*": mostra só
// Câmera e Meus Arquivos. Com a lista de tipos explícita ele costuma incluir a Galeria.
const SAMSUNG = typeof navigator !== "undefined" && /SamsungBrowser/i.test(navigator.userAgent || "");
const TIPOS_GALERIA = SAMSUNG ? "image/jpeg,image/png,image/heic,image/heif,image/webp" : "image/*";

export default function OrigemFoto({ onArquivo, compacto = false }) {
  const camera = useRef(null);
  const galeria = useRef(null);
  const pdf = useRef(null);
  const receber = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) onArquivo(f);
  };
  const botao = "flex flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white text-gray-700 active:bg-emerald-50 hover:border-emerald-300 transition-colors";
  return (
    <div>
    <div className="grid grid-cols-3 gap-2">
      <button type="button" onClick={() => camera.current?.click()} className={`${botao} ${compacto ? "h-14" : "h-20"}`}>
        <Camera size={compacto ? 18 : 22} className="text-emerald-700" />
        <span className="text-xs font-semibold">Câmera</span>
      </button>
      <button type="button" onClick={() => galeria.current?.click()} className={`${botao} ${compacto ? "h-14" : "h-20"}`}>
        <Images size={compacto ? 18 : 22} className="text-emerald-700" />
        <span className="text-xs font-semibold">Galeria</span>
      </button>
      <button type="button" onClick={() => pdf.current?.click()} className={`${botao} ${compacto ? "h-14" : "h-20"}`}>
        <FileText size={compacto ? 18 : 22} className="text-gray-500" />
        <span className="text-xs font-semibold">PDF</span>
      </button>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={receber} />
      <input ref={galeria} type="file" accept={TIPOS_GALERIA} className="hidden" onChange={receber} />
      <input ref={pdf} type="file" accept="application/pdf" className="hidden" onChange={receber} />
    </div>
    {SAMSUNG && (
      <p className="mt-2 text-[11px] leading-snug text-gray-500">
        No navegador Samsung, se a Galeria não aparecer, toque em <strong>Meus Arquivos</strong> e depois em <strong>Imagens</strong>. Pelo Chrome, a Galeria abre direto.
      </p>
    )}
    </div>
  );
}
