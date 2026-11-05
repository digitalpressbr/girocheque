import { useEffect, useState } from "react";
import { Bell, BellRing, BellOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { situacaoAvisos, ativarAvisos, sincronizarInscricao, avisoDeTeste, ehIOS } from "@/lib/push";

const CHAVE_ADIADO = "girocheque-avisos-adiado-ate";

function adiadoAgora() {
  try {
    return Number(localStorage.getItem(CHAVE_ADIADO) || 0) > Date.now();
  } catch {
    return false;
  }
}

function adiar(dias) {
  try {
    localStorage.setItem(CHAVE_ADIADO, String(Date.now() + dias * 86400000));
  } catch { /* sem armazenamento: pergunta de novo na próxima vez */ }
}

function useAtivar() {
  const { toast } = useToast();
  const [ativando, setAtivando] = useState(false);
  const ativar = async () => {
    setAtivando(true);
    try {
      const r = await ativarAvisos();
      if (r === "granted") {
        toast({ title: "Avisos ligados", description: "Você recebe o aviso 1 dia antes do vencimento, às 8h." });
        return true;
      }
      toast({ title: "Avisos não autorizados", description: "Dá para ligar depois em Configurações.", variant: "destructive" });
      return false;
    } catch {
      toast({ title: "Não foi possível ligar os avisos", description: "Tente de novo em Configurações.", variant: "destructive" });
      return false;
    } finally {
      setAtivando(false);
    }
  };
  return { ativar, ativando };
}

// Abre sozinho na Início quando o app instalado ainda não tem permissão de aviso.
export function PedidoDeAvisos() {
  const [aberto, setAberto] = useState(false);
  const { ativar, ativando } = useAtivar();

  useEffect(() => {
    const s = situacaoAvisos();
    if (s === "pronto") {
      sincronizarInscricao();
      return;
    }
    if (s === "pedir" && !adiadoAgora()) {
      const t = setTimeout(() => setAberto(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const fechar = () => {
    adiar(3);
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogContent className="max-w-sm rounded-2xl [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11">
        <DialogHeader>
          <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700">
            <BellRing size={24} />
          </div>
          <DialogTitle className="text-center">Avisar os vencimentos?</DialogTitle>
          <DialogDescription className="text-center">
            Um dia antes de cada cheque vencer, às 8h, o celular mostra o aviso com som.
          </DialogDescription>
        </DialogHeader>
        {ehIOS() && (
          <p className="text-xs text-gray-500 text-center">
            Na próxima tela, toque em <strong>Permitir</strong>.
          </p>
        )}
        <div className="grid gap-2">
          <Button
            onClick={async () => { const ok = await ativar(); if (ok) setAberto(false); }}
            disabled={ativando}
            className="w-full min-h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
          >
            {ativando ? <Loader2 size={16} className="animate-spin mr-2" /> : <Bell size={16} className="mr-2" />}
            Ativar avisos
          </Button>
          <Button variant="outline" onClick={fechar} className="w-full min-h-11 rounded-xl">
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Bloco em Configurações: mostra a situação e permite ligar ou testar.
export function AvisosConfig() {
  const { toast } = useToast();
  const [situacao, setSituacao] = useState(() => situacaoAvisos());
  const { ativar, ativando } = useAtivar();

  const testar = async () => {
    try {
      await avisoDeTeste();
    } catch {
      toast({ title: "Não foi possível mostrar o teste", variant: "destructive" });
    }
  };

  const textos = {
    pronto: "Ligados. O aviso chega 1 dia antes do vencimento, às 8h, com som.",
    pedir: "Desligados. Toque em Ativar e permita os avisos.",
    bloqueado: ehIOS()
      ? "Bloqueados no aparelho. Abra Ajustes > Notificações > GiroCheque e ligue Permitir Notificações, Sons e Alertas."
      : "Bloqueados no navegador. Libere as notificações do site nas configurações do navegador.",
    "instalar-antes": "No iPhone, os avisos só funcionam com o app instalado. Use o botão de instalar no topo da Início e abra pelo ícone.",
    "sem-suporte": "Este navegador não recebe avisos. Use o app instalado no celular.",
  };

  return (
    <section className="mb-6" aria-labelledby="sec-avisos">
      <h2 id="sec-avisos" className="text-sm font-semibold text-[#1F2937] mb-2 flex items-center gap-2">
        <Bell size={16} className="text-[#0F6B4F]" />
        Avisos de vencimento
      </h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-start gap-2">
          {situacao === "pronto" ? (
            <BellRing size={16} className="text-[#16A36A] shrink-0 mt-0.5" />
          ) : (
            <BellOff size={16} className="text-gray-400 shrink-0 mt-0.5" />
          )}
          <p className="text-xs text-gray-600">{textos[situacao]}</p>
        </div>
        {situacao === "pedir" && (
          <Button
            onClick={async () => { await ativar(); setSituacao(situacaoAvisos()); }}
            disabled={ativando}
            className="w-full min-h-11 rounded-xl bg-[#0F6B4F] hover:bg-[#0F6B4F]/90 text-white text-sm font-semibold"
          >
            {ativando ? <Loader2 size={16} className="animate-spin mr-2" /> : <Bell size={16} className="mr-2" />}
            Ativar avisos
          </Button>
        )}
        {situacao === "pronto" && (
          <Button variant="outline" onClick={testar} className="w-full min-h-11 rounded-xl text-sm">
            Mostrar um aviso de teste
          </Button>
        )}
      </div>
    </section>
  );
}
