import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <AuthLayout
      icon={Mail}
      title="Esqueci a senha"
      subtitle="Enviamos um link para você criar uma nova senha"
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
      {enviado ? (
        <div className="space-y-3 text-sm text-foreground">
          <p>Abra o e-mail com o assunto <strong>"Reset your password"</strong> (vem em inglês, do Supabase) e toque no link.</p>
          <p>O GiroCheque abre na tela de nova senha.</p>
          <p className="text-muted-foreground">Não achou? Olhe o lixo eletrônico.</p>
        </div>
      ) : (
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
              "Enviar link"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
