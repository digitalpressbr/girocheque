import { useState, useCallback } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import ChequePreviewDialog from "@/components/ChequePreviewDialog";

export default function ChequeScanner({ file, onFileSelected }) {
  const [preview, setPreview] = useState(null);

  const handleFile = (f) => {
    if (!f) return;
    if (f.type === "application/pdf") {
      onFileSelected(f);
      return;
    }
    setPreview({ file: f });
  };

  const closePreview = useCallback(() => {
    setPreview(null);
  }, []);

  const choose = useCallback((selectedFile) => {
    onFileSelected(selectedFile);
    setPreview(null);
  }, [onFileSelected]);

  return (
    <>
      <div>
        <Label className="text-sm font-medium text-gray-700">Foto do cheque</Label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <label className="flex items-center justify-center gap-1.5 h-12 min-w-0 px-2 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-300 transition-colors">
            <Camera size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">Tirar foto</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { handleFile(e.target.files[0] || null); e.target.value = ""; }}
            />
          </label>
          <label className="flex items-center justify-center gap-1.5 h-12 min-w-0 px-2 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-300 transition-colors">
            <ImageIcon size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600 truncate max-w-[9rem]">
              {file ? "Trocar foto" : "Galeria ou PDF"}
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => { handleFile(e.target.files[0] || null); e.target.value = ""; }}
            />
          </label>
        </div>
      </div>

      <ChequePreviewDialog
        open={!!preview}
        file={preview?.file}
        onChoose={choose}
        onClose={closePreview}
      />
    </>
  );
}