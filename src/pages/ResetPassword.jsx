import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [sessaoOk, setSessaoOk] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // O link do e-mail abre esta tela já com a sessão de recuperação
  useEffect(() => {
    let ativo = true;
    const conferir = async () => {
      const { data } = await supabase.auth.getSession();
      if (ativo) setSessaoOk(!!data?.session);
    };
    conferir();
    const { data: sub } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (ativo && sessao && (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN")) setSessaoOk(true);
    });
    const espera = setTimeout(conferir, 1500);
    return () => {
      ativo = false;
      clearTimeout(espera);
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ newPassword });
      await checkUserAuth();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Não foi possível trocar a senha.");
    } finally {
      setLoading(false);
    }
  };

  if (sessaoOk === null) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!sessaoOk) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Link inválido ou vencido"
        subtitle="Peça um novo e-mail para criar a senha"
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Pedir novo link
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          Abra esta tela pelo link do e-mail "Reset your password". O link vale por 1 hora.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={Lock} title="Nova senha" subtitle="Digite a nova senha do GiroCheque">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha (mínimo 8 caracteres)</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="password" type="password" autoComplete="new-password" autoFocus placeholder="••••••••"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Repita a nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar nova senha"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
