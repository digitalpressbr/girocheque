import { useState, useCallback, useEffect } from "react";
import { FileText, RefreshCw, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import ChequePreviewDialog from "@/components/ChequePreviewDialog";
import OrigemFoto from "@/components/OrigemFoto";

// Foto do cheque no cadastro: escolhe de onde vem, ajusta o recorte e depois mostra
// a miniatura com "Trocar" e "Excluir".
export default function ChequeScanner({ file, onFileSelected }) {
  const [preview, setPreview] = useState(null);
  const [miniatura, setMiniatura] = useState("");
  const [trocando, setTrocando] = useState(false);

  useEffect(() => {
    if (!file || file.type === "application/pdf") {
      setMiniatura("");
      return undefined;
    }
    const u = URL.createObjectURL(file);
    setMiniatura(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const receber = (f) => {
    setTrocando(false);
    if (f.type === "application/pdf") {
      onFileSelected(f);
      return;
    }
    setPreview({ file: f });
  };

  const escolher = useCallback((f) => {
    onFileSelected(f);
    setPreview(null);
  }, [onFileSelected]);

  return (
    <>
      <div>
        <Label className="text-sm font-medium text-gray-700">Foto do cheque</Label>
        <div className="mt-1.5">
          {file && !trocando ? (
            <div className="rounded-xl border border-gray-200 bg-white p-2">
              {miniatura ? (
                <img src={miniatura} alt="Foto do cheque" className="w-full max-h-48 object-contain rounded-lg bg-gray-50" />
              ) : (
                <div className="h-20 flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg">
                  <FileText size={18} /> <span className="truncate max-w-[14rem]">{file.name || "PDF"}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button type="button" onClick={() => setTrocando(true)} className="h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 flex items-center justify-center gap-1.5">
                  <RefreshCw size={16} /> Trocar
                </button>
                <button type="button" onClick={() => onFileSelected(null)} className="h-11 rounded-xl border border-red-200 text-sm font-semibold text-red-600 flex items-center justify-center gap-1.5">
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            </div>
          ) : (
            <>
              <OrigemFoto onArquivo={receber} />
              {trocando && (
                <button type="button" onClick={() => setTrocando(false)} className="mt-2 w-full h-11 text-sm text-gray-500">
                  Manter a foto atual
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <ChequePreviewDialog
        open={!!preview}
        file={preview?.file}
        onChoose={escolher}
        onClose={() => setPreview(null)}
      />
    </>
  );
}
