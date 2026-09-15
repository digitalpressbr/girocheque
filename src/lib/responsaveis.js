export function normalizeResponsavelName(value) {
  if (value == null) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

export function dedupeResponsaveis(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const result = [];
  for (const item of input) {
    const raw = typeof item === "string" ? item : item != null && item.nome != null ? item.nome : "";
    const name = normalizeResponsavelName(raw);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

export function canDeleteResponsavel(responsaveis, id) {
  if (!Array.isArray(responsaveis) || !id) return { ok: false, motivo: "Responsável inválido." };
  const target = responsaveis.find((r) => r && r.id === id);
  if (!target) return { ok: false, motivo: "Responsável não encontrado." };
  const ativo = target.ativo !== false;
  if (!ativo) return { ok: true };
  const outrosAtivos = responsaveis.filter((r) => r && r.id !== id && r.ativo !== false).length;
  if (outrosAtivos < 1) return { ok: false, motivo: "Não é possível excluir o único responsável ativo." };
  return { ok: true };
}

export async function deleteResponsavelEntity(client, id) {
  if (!id) throw new Error("id é obrigatório");
  if (!client || !client.entities || !client.entities.Responsavel || typeof client.entities.Responsavel.delete !== "function") {
    throw new Error("client.entities.Responsavel.delete é obrigatório");
  }
  return await client.entities.Responsavel.delete(id);
}

export function buildInitialResponsaveis(user) {
  if (user && user.full_name) {
    const name = normalizeResponsavelName(user.full_name);
    if (name) return [name];
  }
  if (user && user.email) {
    const email = String(user.email).trim().toLowerCase();
    const local = email.split("@")[0] || "";
    if (local) return [local];
  }
  return [];
}