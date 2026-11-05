// Avisos de vencimento no celular (Web Push).
// iPhone: só funciona com o app instalado na Tela de Início (iOS 16.4 ou mais novo)
// e o pedido de permissão precisa sair de um toque da pessoa.
import { supabase } from "@/api/supabaseClient";

export const VAPID_PUBLICA = "BBwSJ8AAz9fcaWiBT2hLtQor0nTPgbhI0fv9I6G9RA-cZCtBqc6wGCtvowY01L-6y8YCfF_uJnQIn5matJ8qN2E";

export function chaveParaBytes(base64url) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const b64 = (base64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function suportaPush() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function estaInstalado() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function ehIOS() {
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

// "pronto" | "bloqueado" | "pedir" | "instalar-antes" | "sem-suporte"
export function situacaoAvisos() {
  if (ehIOS() && !estaInstalado()) return "instalar-antes";
  if (!suportaPush()) return "sem-suporte";
  if (Notification.permission === "granted") return "pronto";
  if (Notification.permission === "denied") return "bloqueado";
  return "pedir";
}

export async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  const base = import.meta.env.BASE_URL;
  return navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
}

async function gravarInscricao(sub) {
  const j = sub.toJSON();
  const { data: sessao } = await supabase.auth.getSession();
  const uid = sessao?.session?.user?.id;
  if (!uid) throw new Error("Faça login novamente.");
  await supabase.from("push_inscricoes").delete().eq("endpoint", j.endpoint);
  const { error } = await supabase.from("push_inscricoes").insert({
    endpoint: j.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
    aparelho: (navigator.userAgent || "").slice(0, 200),
  });
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
}

// Chamar dentro do toque no botão.
export async function ativarAvisos() {
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao;
  const reg = (await registrarServiceWorker()) || (await navigator.serviceWorker.ready);
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(VAPID_PUBLICA) });
  }
  await gravarInscricao(sub);
  return "granted";
}

// Já autorizado: garante que a inscrição deste aparelho está gravada (o iOS às vezes troca o endereço).
export async function sincronizarInscricao() {
  if (situacaoAvisos() !== "pronto") return;
  try {
    const reg = await registrarServiceWorker();
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(VAPID_PUBLICA) });
    await gravarInscricao(sub);
  } catch {
    /* sem rede ou sem suporte: tenta de novo na próxima abertura */
  }
}

export async function avisoDeTeste() {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification("GiroCheque", {
    body: "Teste: é assim que chega o aviso de cheque vencendo amanhã.",
    icon: `${import.meta.env.BASE_URL}icon-192.png`,
    tag: "girocheque-teste",
    silent: false,
    vibrate: [200, 100, 200],
  });
}
