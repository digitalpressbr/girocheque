import { Smartphone, Download, Share, MonitorSmartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import useInstallApp from "@/hooks/useInstallApp";

export default function InstallAppCard() {
  const { canPrompt, install, isInstalled, platform } = useInstallApp();

  return (
    <section className="mb-6" aria-labelledby="sec-install">
      <h2 id="sec-install" className="text-sm font-semibold text-[#1F2937] mb-2 flex items-center gap-2">
        <Smartphone size={16} className="text-[#0F6B4F]" />
        Aplicativo no celular
      </h2>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        {isInstalled ? (
          <div className="flex items-center gap-2 text-[#16A36A]">
            <CheckCircle2 size={18} />
            <p className="text-sm font-semibold">Aplicativo instalado</p>
          </div>
        ) : platform === "android" && canPrompt ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              O link abre o GiroCheque. A instalação depende do comando do sistema/navegador.
            </p>
            <Button
              onClick={install}
              className="w-full h-11 min-h-[44px] rounded-xl bg-[#0F6B4F] hover:bg-[#0F6B4F]/90 text-white text-sm font-semibold"
            >
              <Download size={16} className="mr-1.5" />
              Instalar no celular
            </Button>
          </div>
        ) : platform === "android" ? (
          <div className="flex items-start gap-2">
            <Download size={16} className="text-[#0F6B4F] shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600">
              No Chrome, toque no menu <span className="font-semibold">(⋮)</span> e depois em{" "}
              <span className="font-semibold">Instalar aplicativo</span>.
            </p>
          </div>
        ) : platform === "ios" ? (
          <div className="flex items-start gap-2">
            <Share size={16} className="text-[#0F6B4F] shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600">
              Abra no Safari, toque em <span className="font-semibold">Compartilhar</span> e depois em{" "}
              <span className="font-semibold">Adicionar à Tela de Início</span>.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <MonitorSmartphone size={16} className="text-[#0F6B4F] shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600">
              No navegador de desktop, use o ícone <span className="font-semibold">Instalar</span> na barra de endereço.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}