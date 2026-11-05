import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, Lock } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import CodigoEmail from "@/components/CodigoEmail";

export default function ForgotPassword() {
  const { checkUserAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
      setEnviado(true);
    } catch (err) {
      setError(err.message || "Não foi possível enviar o e-mail.");
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <CodigoEmail
        email={email}
        titulo="Nova senha"
        rotuloBotao="Salvar nova senha"
        validar={() => {
          if (novaSenha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
          if (novaSenha !== confirmar) return "As senhas não conferem.";
          return "";
        }}
        onConfirmar={async (codigo) => {
          await base44.auth.verifyRecovery({ email, code: codigo });
          await base44.auth.resetPassword({ newPassword: novaSenha });
          await checkUserAuth?.();
          window.location.replace(`${import.meta.env.BASE_URL}`);
        }}
        onReenviar={() => base44.auth.resetPasswordRequest(email)}
        onVoltar={() => setEnviado(false)}
      >
        <div className="space-y-2">
          <Label htmlFor="nova">Nova senha (mínimo 8 caracteres)</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="nova" type="password" autoComplete="new-password" placeholder="••••••••"
              value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmar">Repita a nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="confirmar" type="password" autoComplete="new-password" placeholder="••••••••"
              value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
      </CodigoEmail>
    );
  }

  return (
    <AuthLayout
      icon={Mail}
      title="Esqueci a senha"
      subtitle="Mandamos um código para o seu e-mail"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Voltar para entrar
        </Link>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar código"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
