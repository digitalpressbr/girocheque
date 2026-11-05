import React, { useState } from "react";
import { Link } from "react-router-dom";
import CodigoEmail from "@/components/CodigoEmail";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, User } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [etapaCodigo, setEtapaCodigo] = useState(false);

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
      await base44.auth.register({ email, password, fullName: nome.trim() });
      setEtapaCodigo(true);
    } catch (err) {
      setError(err.message || "Não foi possível criar o cadastro.");
    } finally {
      setLoading(false);
    }
  };

  if (etapaCodigo) {
    return (
      <CodigoEmail
        email={email}
        titulo="Confirme o seu e-mail"
        onConfirmar={async (codigo) => {
          await base44.auth.verifyOtp({ email, otpCode: codigo });
          window.location.replace(`${import.meta.env.BASE_URL}`);
        }}
        onReenviar={() => base44.auth.resendOtp(email)}
        onVoltar={() => setEtapaCodigo(false)}
      />
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Primeiro acesso"
      subtitle="Use o e-mail que foi convidado e crie a sua senha"
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
          <Label htmlFor="nome">Seu nome</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="nome"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              placeholder="Como quer ser chamado"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
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
              Enviando o código...
            </>
          ) : (
            "Criar senha"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
