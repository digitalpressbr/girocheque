import { ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import DigitalPressBadge from "@/components/DigitalPressBadge";

export default function AccessBlocked({ user }) {
  const { logout } = useAuth();
  const suspended = !!(user && user.data_suspensao);
  const title = suspended ? "Acesso suspenso" : "Acesso aguardando ativação";
  const description = suspended
    ? "Seu acesso ao aplicativo foi suspenso pelo administrador."
    : "Seu cadastro ainda não foi ativado pelo administrador. Tente novamente mais tarde.";
  const motivo = user && user.motivo_suspensao ? String(user.motivo_suspensao) : "";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={24} />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">{title}</h1>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        {motivo && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-4 text-left">
            <p className="text-[11px] uppercase tracking-wide text-amber-600 font-semibold mb-0.5">Motivo</p>
            <p className="text-sm text-amber-800 break-words">{motivo}</p>
          </div>
        )}
        <button
          onClick={() => logout(true)}
          className="w-full h-11 min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
      <div className="absolute bottom-6 left-0 right-0">
        <DigitalPressBadge />
      </div>
    </div>
  );
}