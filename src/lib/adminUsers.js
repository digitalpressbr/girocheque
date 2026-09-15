function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function inviteUserThroughRuntime(client, email) {
  if (!client || !client.users || typeof client.users.inviteUser !== "function") {
    throw new Error("inviteUserThroughRuntime requer client.users.inviteUser");
  }
  const normalized = normalizeEmail(email);
  return client.users.inviteUser(normalized, "user");
}

export function buildAdminUserSummary(users, ownerEmail) {
  const owner = normalizeEmail(ownerEmail);
  const activeAdherents = (Array.isArray(users) ? users : [])
    .filter((u) => u && u.acesso_ativo === true)
    .filter((u) => normalizeEmail(u.email) !== owner)
    .map((u) => {
      const displayName =
        (u.full_name && String(u.full_name).trim()) ||
        (u.name && String(u.name).trim()) ||
        u.email;
      return { ...u, name: displayName, displayName, email: u.email };
    })
    .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName), "pt-BR"));

  return {
    ativos: activeAdherents.length,
    aderentes: activeAdherents,
    activeAdherents,
    activeAdherentsCount: activeAdherents.length,
  };
}

export function findInvitedUser(freshUsers, email) {
  const target = normalizeEmail(email);
  return (Array.isArray(freshUsers) ? freshUsers : []).find(
    (u) => normalizeEmail(u && u.email) === target
  );
}