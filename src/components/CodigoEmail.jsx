import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MailCheck, Loader2, ArrowLeft } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

// Tela do código de 6 dígitos que o GiroCheque manda por e-mail (Gmail da Digital Press).
// children: campos extras (ex.: nova senha) que vão junto no mesmo formulário.
export default function CodigoEmail({ email, titulo, onConfirmar, onReenviar, onVoltar, children, validar, rotuloBotao = "Confirmar" }) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [espera, setEspera] = useState(60);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    const limpo = codigo.replace(/\D/g, "");
    if (limpo.length !== 6) {
      setErro("Digite os 6 números do código.");
      return;
    }
    const problema = validar?.();
    if (problema) {
      setErro(problema);
      return;
    }
    setCarregando(true);
    try {
      await onConfirmar(limpo);
    } catch (err) {
      setErro(err.message || "Código inválido.");
    } finally {
      setCarregando(false);
    }
  };

  const reenviar = async () => {
    setErro("");
    setAviso("");
    try {
      await onReenviar();
      setAviso("Mandamos outro código.");
      setEspera(60);
    } catch (err) {
      setErro(err.message || "Não foi possível reenviar.");
    }
  };

  return (
    <AuthLayout
      icon={MailCheck}
      title={titulo}
      subtitle={`Mandamos um código de 6 números para ${email.trim().toLowerCase()}`}
      footer={
        <button type="button" onClick={onVoltar} className="text-primary font-medium hover:underline min-h-11">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Voltar
        </button>
      }
    >
      {erro && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{erro}</div>}
      {aviso && !erro && <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">{aviso}</div>}
      <form onSubmit={enviar} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="codigo">Código do e-mail</Label>
          <Input
            id="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="000000"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-14 text-center text-2xl tracking-[0.5em] font-semibold"
          />
          <p className="text-xs text-muted-foreground">
            O e-mail vem de GiroCheque (digitalpressbr@gmail.com). Não achou? Olhe no Spam e em Promoções.
          </p>
        </div>
        {children}
        <Button type="submit" className="w-full h-12 font-medium" disabled={carregando}>
          {carregando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Conferindo...</> : rotuloBotao}
        </Button>
        <Button type="button" variant="outline" className="w-full h-11" disabled={espera > 0} onClick={reenviar}>
          {espera > 0 ? `Reenviar código em ${espera}s` : "Reenviar código"}
        </Button>
      </form>
    </AuthLayout>
  );
}
