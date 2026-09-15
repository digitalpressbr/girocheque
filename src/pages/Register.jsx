import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { toast } from "@/components/ui/use-toast";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setEnviado(true);
    } catch (err) {
      setError(err.message || "Não foi possível criar o cadastro.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "E-mail reenviado", description: "Confira a caixa de entrada e o lixo eletrônico." });
    } catch (err) {
      setError(err.message || "Não foi possível reenviar o e-mail.");
    }
  };

  if (enviado) {
    return (
      <AuthLayout
        icon={Mail}
        title="Confirme seu e-mail"
        subtitle={`Enviamos um e-mail para ${email}`}
        footer={
          <Link to="/login" className="text-primary font-medium hover:underline">
            Voltar para entrar
          </Link>
        }
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="space-y-3 text-sm text-foreground">
          <p>1. Abra o e-mail com o assunto <strong>"Confirm your signup"</strong> (vem em inglês, do Supabase).</p>
          <p>2. Toque no link <strong>"Confirm your mail"</strong>.</p>
          <p>3. O GiroCheque abre com a sua conta ativa.</p>
          <p className="text-muted-foreground">Não achou? Olhe o lixo eletrônico.</p>
        </div>
        <Button variant="outline" className="w-full h-12 font-medium mt-6" onClick={handleResend}>
          Reenviar e-mail
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Primeiro acesso"
      subtitle="Use o e-mail liberado pelo administrador e crie sua senha"
      footer={
        <>
          Já tem senha?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </>
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
        <div className="space-y-2">
          <Label htmlFor="password">Senha (mínimo 8 caracteres)</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Repita a senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            "Criar senha"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
