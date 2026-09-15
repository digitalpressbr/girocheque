// Adaptador com a mesma interface que o app usava do SDK do Base44 (entities, auth,
// integrations, functions, users), agora em cima do Supabase. Assim as telas não mudam.
import { supabase } from '@/api/supabaseClient';
import { DETECTAR_CHEQUE_PROMPT, DETECTAR_CHEQUE_SCHEMA } from '@/api/detectarChequePrompt';

const TABELAS = {
  ConfigCaixa: 'config_caixa',
  Cheque: 'cheques',
  Movimentacao: 'movimentacoes',
  DiagnosticoScan: 'diagnosticos_scan',
  RenovacaoCheque: 'renovacoes_cheque',
  Responsavel: 'responsaveis',
  User: 'perfis',
};

const CAMPOS_DO_SISTEMA = ['id', 'created_date', 'updated_date', 'created_by_id', 'created_by'];

const BASE = import.meta.env.BASE_URL || '/';

function erroDe(error, status) {
  const e = new Error(traduzirErro(error?.message || 'Erro inesperado'));
  e.status = status ?? error?.status;
  e.original = error;
  return e;
}

export function traduzirErro(msg) {
  const m = String(msg || '');
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(m)) return 'Confirme o cadastro tocando no link do e-mail "Confirm your signup" antes de entrar.';
  if (/User already registered/i.test(m)) return 'Este e-mail já tem cadastro. Use "Entrar" ou "Esqueci a senha".';
  if (/Password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/Token has expired or is invalid/i.test(m)) return 'Código inválido ou vencido. Peça um novo código.';
  if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
  if (/Unable to validate email address/i.test(m)) return 'E-mail inválido.';
  if (/New password should be different/i.test(m)) return 'A nova senha precisa ser diferente da atual.';
  return m;
}

function semCamposDoSistema(dados) {
  const limpo = { ...(dados || {}) };
  for (const c of CAMPOS_DO_SISTEMA) delete limpo[c];
  return limpo;
}

function ordenar(q, sort) {
  if (!sort) return q.order('created_date', { ascending: false });
  const desc = String(sort).startsWith('-');
  const campo = desc ? String(sort).slice(1) : String(sort);
  return q.order(campo, { ascending: !desc, nullsFirst: false });
}

function entidade(nome) {
  const tabela = TABELAS[nome];
  if (!tabela) throw new Error(`Entidade desconhecida: ${nome}`);
  return {
    async list(sort, limit) {
      let q = ordenar(supabase.from(tabela).select('*'), sort);
      if (limit) q = q.limit(limit);
      const { data, error, status } = await q;
      if (error) throw erroDe(error, status);
      return data || [];
    },
    async filter(criterio = {}, sort, limit) {
      let q = supabase.from(tabela).select('*');
      for (const [campo, valor] of Object.entries(criterio || {})) {
        q = valor === null ? q.is(campo, null) : q.eq(campo, valor);
      }
      q = ordenar(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error, status } = await q;
      if (error) throw erroDe(error, status);
      return data || [];
    },
    async get(id) {
      const { data, error, status } = await supabase.from(tabela).select('*').eq('id', id).single();
      if (error) throw erroDe(error, status);
      return data;
    },
    async create(dados) {
      const { data, error, status } = await supabase.from(tabela).insert(semCamposDoSistema(dados)).select().single();
      if (error) throw erroDe(error, status);
      return data;
    },
    async bulkCreate(lista) {
      const { data, error, status } = await supabase.from(tabela).insert((lista || []).map(semCamposDoSistema)).select();
      if (error) throw erroDe(error, status);
      return data || [];
    },
    async update(id, dados) {
      const { data, error, status } = await supabase.from(tabela).update(semCamposDoSistema(dados)).eq('id', id).select().single();
      if (error) throw erroDe(error, status);
      return data;
    },
    async delete(id) {
      const { error, status } = await supabase.from(tabela).delete().eq('id', id);
      if (error) throw erroDe(error, status);
      return { id };
    },
  };
}

const entities = new Proxy({}, { get: (_, nome) => entidade(String(nome)) });

async function usuarioDaSessao() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

function nomeSeguro(nome) {
  const base = String(nome || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

async function enviarArquivo(bucket, file, prefixo = '') {
  const u = await usuarioDaSessao();
  if (!u) throw erroDe({ message: 'Faça login novamente.' }, 401);
  const aleatorio = Math.random().toString(36).slice(2, 11);
  const caminho = `${u.email.toLowerCase()}/${prefixo}${aleatorio}_${nomeSeguro(file?.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(caminho, file, {
    contentType: file?.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw erroDe(error);
  return caminho;
}

async function invocarIA(params) {
  const { data, error } = await supabase.functions.invoke('invoke-llm', { body: params });
  if (error) throw erroDe(error);
  return data;
}

const auth = {
  async me() {
    const u = await usuarioDaSessao();
    if (!u) throw erroDe({ message: 'Sessão expirada' }, 401);
    const { data: perfil } = await supabase.from('perfis').select('*').eq('id', u.id).maybeSingle();
    return {
      id: u.id,
      email: (u.email || '').toLowerCase(),
      full_name: perfil?.full_name || u.user_metadata?.full_name || '',
      role: perfil?.role || 'user',
      acesso_ativo: perfil?.acesso_ativo === true,
      data_suspensao: perfil?.data_suspensao || null,
      motivo_suspensao: perfil?.motivo_suspensao || null,
    };
  },
  async isAuthenticated() {
    return !!(await usuarioDaSessao());
  },
  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl !== undefined) window.location.href = `${BASE}login`;
  },
  redirectToLogin() {
    window.location.href = `${BASE}login`;
  },
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw erroDe(error);
    return data;
  },
  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: `${window.location.origin}${BASE}` },
    });
    if (error) throw erroDe(error);
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw erroDe({ message: 'User already registered' });
    }
    return data;
  },
  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otpCode, type: 'signup' });
    if (error) throw erroDe(error);
    return { access_token: data?.session?.access_token };
  },
  setToken() {},
  async resendOtp(email) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}${BASE}` },
    });
    if (error) throw erroDe(error);
  },
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}${BASE}reset-password`,
    });
    if (error) throw erroDe(error);
  },
  // Chamado com a sessão aberta pelo link do e-mail de nova senha
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw erroDe(error);
  },
};

const integrations = {
  Core: {
    async UploadPrivateFile({ file }) {
      return { file_uri: await enviarArquivo('cheques', file) };
    },
    async CreateFileSignedUrl({ file_uri, expires_in = 900 }) {
      const { data, error } = await supabase.storage.from('cheques').createSignedUrl(file_uri, expires_in);
      if (error) throw erroDe(error);
      return { signed_url: data?.signedUrl || '' };
    },
    // Imagem temporária para a IA do scanner (bucket privado, link assinado curto)
    async UploadFile({ file }) {
      const caminho = await enviarArquivo('scanner', file, 'tmp_');
      const { data, error } = await supabase.storage.from('scanner').createSignedUrl(caminho, 600);
      if (error) throw erroDe(error);
      return { file_url: data?.signedUrl || '' };
    },
    async InvokeLLM(params) {
      return invocarIA(params);
    },
  },
};

const functions = {
  async invoke(nome, params) {
    if (nome === 'detectarCheque') {
      const data = await invocarIA({
        prompt: DETECTAR_CHEQUE_PROMPT,
        file_urls: [params.file_url],
        response_json_schema: DETECTAR_CHEQUE_SCHEMA,
      });
      return { data };
    }
    throw new Error(`Função desconhecida: ${nome}`);
  },
};

const users = {
  async inviteUser(email) {
    const { error } = await supabase.from('convites').upsert({ email: String(email).trim().toLowerCase() });
    if (error) throw erroDe(error);
    return { ok: true };
  },
};

export const base44 = { entities, auth, integrations, functions, users };
