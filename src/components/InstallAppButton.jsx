import { useState } from "react";
import { Download, Share, SquarePlus, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useInstallApp from "@/hooks/useInstallApp";

// Ícone discreto no topo da tela. Some quando o app já está instalado.
// Android com aviso do Chrome: abre o instalar do sistema. iPhone: o Safari não tem esse aviso,
// então mostra o passo a passo curto (Compartilhar → Adicionar à Tela de Início).
export default function InstallAppButton({ className = "" }) {
  const { canPrompt, install, isInstalled, platform, iosOutroNavegador } = useInstallApp();
  const [open, setOpen] = useState(false);

  if (isInstalled) return null;

  const onClick = () => {
    if (canPrompt) {
      install();
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label="Instalar o aplicativo no celular"
        title="Instalar no celular"
        className={`w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-emerald-700 transition-colors ${className}`}
      >
        <Download size={18} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11">
          <DialogHeader>
            <DialogTitle>Instalar o GiroCheque</DialogTitle>
            <DialogDescription>O app fica na tela do celular e abre em tela cheia.</DialogDescription>
          </DialogHeader>

          {platform === "ios" ? (
            <ol className="space-y-3 text-sm text-gray-700">
              {iosOutroNavegador && (
                <li className="rounded-xl bg-amber-50 text-amber-800 p-3 text-xs">
                  Abra este link no Safari para instalar.
                </li>
              )}
              <li className="flex items-center gap-3">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-blue-600">
                  <Share size={18} />
                </span>
                <span>1. Toque em <strong>Compartilhar</strong>, na barra do Safari.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                  <SquarePlus size={18} />
                </span>
                <span>2. Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-xs">
                  OK
                </span>
                <span>3. Toque em <strong>Adicionar</strong>. Depois abra pelo ícone da tela.</span>
              </li>
            </ol>
          ) : platform === "android" ? (
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-3">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                  <MoreVertical size={18} />
                </span>
                <span>1. No Chrome, toque no menu <strong>⋮</strong>.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                  <Download size={18} />
                </span>
                <span>2. Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</span>
              </li>
            </ol>
          ) : (
            <p className="text-sm text-gray-700">
              Abra este link no celular. No iPhone, use o Safari: Compartilhar e depois Adicionar à Tela de Início.
            </p>
          )}

          <Button onClick={() => setOpen(false)} className="w-full min-h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white">
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
