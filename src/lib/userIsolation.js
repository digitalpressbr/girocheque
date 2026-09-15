export const OWNER_EMAIL = "ro_agronomo@hotmail.com";

export function normalizeEmail(value) {
  if (value == null) return "";
  return String(value).trim().toLowerCase();
}

export function isOwnerEmail(email) {
  return normalizeEmail(email) === OWNER_EMAIL;
}

export function canAccessApp(user) {
  if (!user) return false;
  if (isOwnerEmail(user.email)) return true;
  return user.acesso_ativo === true;
}