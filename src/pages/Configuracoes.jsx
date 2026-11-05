import { useState, useEffect, useCallback } from "react";
import InstallAppCard from "@/components/InstallAppCard";
import { AvisosConfig } from "@/components/AvisosVencimento";
import ActiveUsersSummary from "@/components/ActiveUsersSummary";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isOwnerEmail, normalizeEmail, OWNER_EMAIL } from "@/lib/userIsolation";
import { inviteUserThroughRuntime, buildAdminUserSummary } from "@/lib/adminUsers";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { canDeleteResponsavel } from "@/lib/responsaveis";
import ResponsavelManagerRow from "@/components/ResponsavelManagerRow";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, LogOut, Plus, UserCog, Users, ShieldAlert, CheckCircle2, Ban, RotateCcw,
  ChevronDown, Mail, MailWarning, Clock, Share2,
} from "lucide-react";

const LINK_APP = "https://digitalpressbr.github.io/girocheque/";
const TEXTO_CONVITE = "Você foi convidado para usar o GiroCheque. Abra " + LINK_APP +
  " no Safari, toque no ícone de baixar no topo e siga Compartilhar > Adicionar à Tela de Início > Adicionar. " +
  "Depois abra pelo ícone, toque em \"Primeiro acesso? Criar senha\" e use o e-mail convidado. " +
  "Quando aparecer \"Avisar os vencimentos?\", toque em Ativar avisos e depois em Permitir.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDate(d) {
  if (!d) return "—";
  const s = String(d).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "—";
  const [y, m, day] = s.split("-");
  return day + "/" + m + "/" + y;
}

export default function Configuracoes() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { responsaveis, ativos, loading: loadingResp, error: errorResp, add, toggle, remove, refetch } = useResponsaveis();

  const [deletingResponsavelId, setDeletingResponsavelId] = useState(null);

  const [novoNome, setNovoNome] = useState("");
  const [adding, setAdding] = useState(false);

  const isOwner = isOwnerEmail(user?.email);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendMotivo, setSuspendMotivo] = useState("");
  const [suspendSaving, setSuspendSaving] = useState(false);
  const [actionUser, setActionUser] = useState(null);
  const [convites, setConvites] = useState([]);
  const [filtroConvite, setFiltroConvite] = useState("pendente");
  const [verSuspensos, setVerSuspensos] = useState(false);
  const [reenviando, setReenviando] = useState(null);

  const loadConvites = useCallback(async () => {
    if (!isOwner) return;
    try {
      setConvites(await base44.users.listarConvites());
    } catch {
      /* a lista de usuários continua aparecendo */
    }
  }, [isOwner]);

  const loadUsers = useCallback(async () => {
    if (!isOwner) return [];
    setLoadingUsers(true);
    try {
      const list = await base44.entities.User.list();
      const fresh = Array.isArray(list) ? list : [];
      setUsers(fresh);
      return fresh;
    } catch (e) {
      toast({ title: "Não foi possível carregar usuários", variant: "destructive" });
      return [];
    } finally {
      setLoadingUsers(false);
    }
  }, [isOwner, toast]);

  useEffect(() => {
    if (isOwner) {
      loadUsers();
      loadConvites();
    }
  }, [isOwner, loadUsers, loadConvites]);

  const handleAddResp = async () => {
    const nome = novoNome.trim();
    if (!nome) return;
    setAdding(true);
    try {
      const created = await add(nome);
      if (created) {
        setNovoNome("");
        toast({ title: "Responsável adicionado" });
      } else {
        toast({ title: "Responsável já existe", description: "Selecione um nome diferente." });
      }
    } catch (e) {
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleToggleResp = async (r) => {
    try {
      await toggle(r.id, !r.ativo);
      toast({ title: r.ativo ? "Responsável desativado" : "Responsável ativado" });
    } catch (e) {
      toast({ title: "Não foi possível atualizar", variant: "destructive" });
    }
  };

  const handleDeleteResp = async (r) => {
    setDeletingResponsavelId(r.id);
    try {
      await remove(r.id);
      toast({ title: "Responsável excluído", description: "Os registros antigos foram preservados." });
    } catch (e) {
      toast({ title: e?.message || "Não foi possível excluir", variant: "destructive" });
    } finally {
      setDeletingResponsavelId(null);
    }
  };

  const avisarEnvio = (r, email) => {
    if (r?.ja_tem_conta) {
      toast({ title: "Usuário já tem conta", description: "O acesso de " + email + " está ativo." });
    } else if (r?.enviado) {
      toast({ title: "Convite enviado", description: "O e-mail saiu para " + email + "." });
    } else {
      toast({
        title: r?.motivo === "sem_senha_app" ? "Envio automático de e-mail ainda não ligado" : "O e-mail não saiu",
        description: "O acesso de " + email + " está liberado. Toque em Compartilhar para mandar o link pelo WhatsApp.",
      });
    }
  };

  const handleInvite = async () => {
    const email = normalizeEmail(inviteEmail);
    if (!EMAIL_RE.test(email)) {
      toast({ title: "E-mail inválido", description: "Verifique o endereço informado.", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      const r = await inviteUserThroughRuntime(base44, email);
      await Promise.all([loadUsers(), loadConvites()]);
      setFiltroConvite(r?.ja_tem_conta ? "aceito" : "pendente");
      avisarEnvio(r, email);
      setInviteEmail("");
    } catch (e) {
      toast({ title: "Não foi possível convidar", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const reenviar = async (email) => {
    setReenviando(email);
    try {
      const r = await inviteUserThroughRuntime(base44, email);
      await loadConvites();
      avisarEnvio(r, email);
    } catch (e) {
      toast({ title: "Não foi possível reenviar", description: e?.message, variant: "destructive" });
    } finally {
      setReenviando(null);
    }
  };

  const compartilhar = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "GiroCheque", text: TEXTO_CONVITE });
        return;
      }
      await navigator.clipboard.writeText(TEXTO_CONVITE);
      toast({ title: "Convite copiado", description: "Cole no WhatsApp da pessoa." });
    } catch { /* a pessoa cancelou */ }
  };

  const perfilPorEmail = new Map(users.map((u) => [normalizeEmail(u.email), u]));
  const convitesComSituacao = convites.map((c) => {
    const p = perfilPorEmail.get(normalizeEmail(c.email));
    const situacao = !p ? "pendente" : p.acesso_ativo ? "aceito" : "suspenso";
    return { ...c, perfil: p, situacao };
  });
  const convitesPendentes = convitesComSituacao.filter((c) => c.situacao === "pendente");
  const convitesAceitos = convitesComSituacao.filter((c) => c.situacao !== "pendente");
  const convitesVisiveis = filtroConvite === "pendente" ? convitesPendentes : convitesAceitos;

  const usuariosAtivos = users.filter((u) => isOwnerEmail(u.email) || u.acesso_ativo === true);
  const usuariosSuspensos = users.filter((u) => !(isOwnerEmail(u.email) || u.acesso_ativo === true));

  const adminSummary = buildAdminUserSummary(users, OWNER_EMAIL);

  const openSuspend = (u) => {
    setSuspendMotivo("");
    setSuspendTarget(u);
  };

  const confirmSuspend = async () => {
    if (!suspendTarget || suspendSaving) return;
    setSuspendSaving(true);
    try {
      const ts = new Date().toISOString();
      await base44.entities.User.update(suspendTarget.id, {
        acesso_ativo: false,
        data_suspensao: ts,
        motivo_suspensao: suspendMotivo.trim() || null,
      });
      await loadUsers();
      toast({ title: "Usuário suspenso" });
      setSuspendTarget(null);
    } catch (e) {
      toast({ title: "Não foi possível suspender", variant: "destructive" });
    } finally {
      setSuspendSaving(false);
    }
  };

  const handleReactivate = async (u) => {
    setActionUser(u.id);
    try {
      await base44.entities.User.update(u.id, {
        acesso_ativo: true,
        data_suspensao: null,
        motivo_suspensao: null,
      });
      await loadUsers();
      toast({ title: "Usuário reativado" });
    } catch (e) {
      toast({ title: "Não foi possível reativar", variant: "destructive" });
    } finally {
      setActionUser(null);
    }
  };

  const renderUsuario = (u) => {
                const ownerSelf = isOwnerEmail(u.email);
                const ativo = ownerSelf || u.acesso_ativo === true;
                const suspenso = !ativo && !!u.data_suspensao;
                return (
                  <li key={u.id} className="bg-white rounded-2xl border border-gray-100 p-3">
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1F2937] break-words">
                          {u.full_name || "Sem nome"}
                          {ownerSelf && <span className="ml-1.5 text-[10px] font-semibold text-[#0F6B4F]">(você)</span>}
                        </p>
                        <p className="text-xs text-gray-500 break-words">{u.email || "—"}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {ativo ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A36A]">
                              <CheckCircle2 size={12} /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C2414B]">
                              <Ban size={12} /> Suspenso{u.data_suspensao ? " · " + formatDate(u.data_suspensao) : ""}
                            </span>
                          )}
                        </div>
                        {suspenso && u.motivo_suspensao && (
                          <p className="text-[11px] text-gray-500 mt-1 break-words">Motivo: {u.motivo_suspensao}</p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {ownerSelf ? (
                          <span className="text-[11px] text-gray-300 font-medium">Protegido</span>
                        ) : ativo ? (
                          <Button
                            variant="outline"
                            onClick={() => openSuspend(u)}
                            className="h-10 min-h-[40px] rounded-xl text-xs font-semibold text-[#C2414B] border-[#C2414B]/30 hover:bg-[#C2414B]/5"
                          >
                            <Ban size={14} className="mr-1" />
                            Suspender
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handleReactivate(u)}
                            disabled={actionUser === u.id}
                            className="h-10 min-h-[40px] rounded-xl text-xs font-semibold text-[#0F6B4F] border-[#0F6B4F]/30 hover:bg-[#0F6B4F]/5"
                          >
                            {actionUser === u.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} className="mr-1" />}
                            Reativar
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
  };

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen bg-[#F7FAF8]">
      <h1 className="text-xl font-bold text-[#1F2937] mb-5">Configurações</h1>

      {/* 1) Minha conta */}
      <section className="mb-6" aria-labelledby="sec-conta">
        <h2 id="sec-conta" className="text-sm font-semibold text-[#1F2937] mb-2 flex items-center gap-2">
          <UserCog size={16} className="text-[#0F6B4F]" />
          Minha conta
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Nome</p>
            <p className="text-sm font-medium text-[#1F2937] break-words">{user?.full_name || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">E-mail</p>
            <p className="text-sm font-medium text-[#1F2937] break-words">{user?.email || "—"}</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Status</p>
              <p className={`text-sm font-semibold ${isOwner || user?.acesso_ativo ? "text-[#16A36A]" : "text-[#C2414B]"}`}>
                {isOwner ? "Administrador" : user?.acesso_ativo ? "Ativo" : "Suspenso"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => logout(true)}
              className="h-11 min-h-[44px] rounded-xl text-sm font-semibold"
              aria-label="Sair da conta"
            >
              <LogOut size={16} className="mr-1.5" />
              Sair
            </Button>
          </div>
        </div>
      </section>

      {/* Instalação do app */}
      <InstallAppCard />
      <AvisosConfig />

      {/* 2) Responsáveis */}
      <section className="mb-6" aria-labelledby="sec-resp">
        <h2 id="sec-resp" className="text-sm font-semibold text-[#1F2937] mb-2 flex items-center gap-2">
          <Users size={16} className="text-[#0F6B4F]" />
          Responsáveis pelas retiradas
        </h2>
        <p className="text-[11px] text-gray-500 mb-3 break-words">
          Use esta lista somente para identificar quem recebe uma retirada. Para liberar o aplicativo para outra pessoa, use “Convidar usuário” abaixo.
        </p>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex gap-2 mb-4">
            <Input
              id="novo-responsavel"
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome de quem pode receber retiradas"
              className="h-11 flex-1"
              aria-label="Nome do novo responsável"
            />
            <Button
              onClick={handleAddResp}
              disabled={adding || !novoNome.trim()}
              className="h-11 px-4 bg-[#0F6B4F] hover:bg-[#0F6B4F]/90 text-white rounded-xl"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} className="mr-1" />}
              Adicionar
            </Button>
          </div>

          {loadingResp && responsaveis.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : errorResp ? (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3">
              <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">Erro ao carregar responsáveis. <button onClick={() => refetch()} className="underline font-semibold">Tentar novamente</button></p>
            </div>
          ) : responsaveis.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Nenhum responsável cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {responsaveis.map((r) => (
                <ResponsavelManagerRow
                  key={r.id}
                  responsavel={r}
                  canDelete={canDeleteResponsavel(responsaveis, r.id)}
                  busy={deletingResponsavelId === r.id}
                  onToggle={handleToggleResp}
                  onDelete={handleDeleteResp}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 3) Usuários do aplicativo (somente owner) */}
      {isOwner && (
        <section className="mb-6" aria-labelledby="sec-users">
          <h2 id="sec-users" className="text-sm font-semibold text-[#1F2937] mb-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-[#0F6B4F]" />
            Usuários do aplicativo
          </h2>

          <div className="mb-3">
            <ActiveUsersSummary
              activeAdherents={adminSummary.activeAdherents}
              activeAdherentsCount={adminSummary.activeAdherentsCount}
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
            <Label htmlFor="invite-email" className="text-sm font-medium text-gray-700">Convidar usuário</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                id="invite-email"
                type="email"
                inputMode="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="h-11 flex-1"
                aria-label="E-mail do novo usuário"
              />
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="h-11 px-4 bg-[#0F6B4F] hover:bg-[#0F6B4F]/90 text-white rounded-xl"
              >
                {inviting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} className="mr-1" />}
                Convidar
              </Button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 break-words">
              A pessoa recebe o e-mail do GiroCheque com o link e o passo a passo. O convite fica pendente até ela criar a senha.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Convites</p>
            <div className="grid grid-cols-2 gap-2 mb-3" role="tablist">
              {[
                ["pendente", "Pendentes", convitesPendentes.length],
                ["aceito", "Aceitos", convitesAceitos.length],
              ].map(([chave, rotulo, n]) => (
                <button
                  key={chave}
                  type="button"
                  role="tab"
                  aria-selected={filtroConvite === chave}
                  onClick={() => setFiltroConvite(chave)}
                  className={"min-h-11 rounded-xl text-sm font-semibold border " + (filtroConvite === chave
                    ? "bg-[#0F6B4F] text-white border-[#0F6B4F]"
                    : "bg-white text-gray-600 border-gray-200")}
                >
                  {rotulo} ({n})
                </button>
              ))}
            </div>
            {convitesVisiveis.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">
                {filtroConvite === "pendente" ? "Nenhum convite esperando aceite." : "Nenhum convite aceito ainda."}
              </p>
            ) : (
              <ul className="space-y-2">
                {convitesVisiveis.map((c) => (
                  <li key={c.email} className="rounded-xl border border-gray-100 p-3">
                    <p className="text-sm font-semibold text-[#1F2937] break-all">{c.email}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Convidado em {formatDate(c.convidado_em)}</p>
                    {c.situacao === "pendente" ? (
                      <>
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold">
                          {c.email_enviado_em ? (
                            <span className="inline-flex items-center gap-1 text-[#B7791F]">
                              <Clock size={12} /> Aguardando aceite · e-mail enviado em {formatDate(c.email_enviado_em)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#C2414B]">
                              <MailWarning size={12} /> Aguardando aceite · e-mail não enviado
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <Button
                            variant="outline"
                            onClick={() => reenviar(c.email)}
                            disabled={reenviando === c.email}
                            className="min-h-11 rounded-xl text-xs font-semibold"
                          >
                            {reenviando === c.email ? <Loader2 size={14} className="animate-spin mr-1" /> : <Mail size={14} className="mr-1" />}
                            Reenviar e-mail
                          </Button>
                          <Button variant="outline" onClick={compartilhar} className="min-h-11 rounded-xl text-xs font-semibold">
                            <Share2 size={14} className="mr-1" />
                            Compartilhar
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className={"inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold " + (c.situacao === "aceito" ? "text-[#16A36A]" : "text-[#C2414B]")}>
                        {c.situacao === "aceito" ? <CheckCircle2 size={12} /> : <Ban size={12} />}
                        {c.situacao === "aceito" ? "Aceito · conta ativa" : "Aceito · conta suspensa"}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : usuariosAtivos.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Nenhum usuário ativo.</p>
          ) : (
            <ul className="space-y-2">
              {usuariosAtivos.map(renderUsuario)}
            </ul>
          )}

          {usuariosSuspensos.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setVerSuspensos((v) => !v)}
                aria-expanded={verSuspensos}
                className="w-full min-h-11 flex items-center justify-between rounded-xl px-3 text-sm font-medium text-gray-600 bg-white border border-gray-100"
              >
                <span>Suspensos ({usuariosSuspensos.length})</span>
                <ChevronDown size={18} className={"transition-transform " + (verSuspensos ? "rotate-180" : "")} />
              </button>
              {verSuspensos && (
                <ul className="space-y-2 mt-2">
                  {usuariosSuspensos.map(renderUsuario)}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {/* Confirmação de suspensão */}
      <AlertDialog open={!!suspendTarget} onOpenChange={(o) => { if (!o && !suspendSaving) setSuspendTarget(null); }}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender usuário</AlertDialogTitle>
            <AlertDialogDescription>
              {suspendTarget ? suspendTarget.email : ""} perderá o acesso ao aplicativo. A ação pode ser desfeita em "Reativar".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Label htmlFor="suspend-motivo" className="text-sm font-medium text-gray-700">Motivo (opcional)</Label>
            <Input
              id="suspend-motivo"
              type="text"
              value={suspendMotivo}
              onChange={(e) => setSuspendMotivo(e.target.value)}
              placeholder="Ex.: solicitação do usuário"
              className="h-11 mt-1.5"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suspendSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmSuspend(); }}
              disabled={suspendSaving}
              className="bg-[#C2414B] hover:bg-[#C2414B]/90"
            >
              {suspendSaving ? <Loader2 size={14} className="animate-spin" /> : "Suspender"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}