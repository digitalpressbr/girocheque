import { describe, it, expect, vi } from "vitest";
import {
  inviteUserThroughRuntime,
  buildAdminUserSummary,
  findInvitedUser,
} from "./adminUsers";

describe("inviteUserThroughRuntime", () => {
  it("chama exclusivamente client.users.inviteUser(emailNormalizado,'user') e retorna a resposta", async () => {
    const fakeResponse = { ok: true, invited: "a@x.com" };
    const usersInvite = vi.fn().mockResolvedValue(fakeResponse);
    const authInvite = vi.fn();
    const client = { users: { inviteUser: usersInvite }, auth: { inviteUser: authInvite } };

    const res = await inviteUserThroughRuntime(client, "  A@X.COM  ");

    expect(usersInvite).toHaveBeenCalledTimes(1);
    expect(usersInvite).toHaveBeenCalledWith("a@x.com", "user");
    expect(authInvite).not.toHaveBeenCalled();
    expect(res).toBe(fakeResponse);
  });

  it("nunca aciona client.auth.inviteUser mesmo se users existir", async () => {
    const usersInvite = vi.fn().mockResolvedValue({ ok: true });
    const authInvite = vi.fn();
    const client = { users: { inviteUser: usersInvite }, auth: { inviteUser: authInvite } };

    await inviteUserThroughRuntime(client, "b@x.com");

    expect(authInvite).not.toHaveBeenCalled();
    expect(usersInvite).toHaveBeenCalledWith("b@x.com", "user");
  });
});

describe("buildAdminUserSummary", () => {
  const ownerEmail = "ro_agronomo@hotmail.com";

  it("considera ativos somente acesso_ativo===true", () => {
    const users = [
      { email: "a@x.com", full_name: "Ana", acesso_ativo: true },
      { email: "b@x.com", full_name: "Bia", acesso_ativo: false },
      { email: "c@x.com", full_name: "Caio", acesso_ativo: "true" },
      { email: "d@x.com", full_name: "Davi", acesso_ativo: 1 },
      { email: "e@x.com", full_name: "Eva", acesso_ativo: null },
    ];
    const summary = buildAdminUserSummary(users, ownerEmail);

    expect(summary.ativos).toBe(1);
    expect(summary.aderentes.map((u) => u.email)).toEqual(["a@x.com"]);
  });

  it("exclui o owner da contagem e da lista de aderentes", () => {
    const users = [
      { email: ownerEmail, full_name: "Owner", acesso_ativo: true },
      { email: "a@x.com", full_name: "Ana", acesso_ativo: true },
    ];
    const summary = buildAdminUserSummary(users, ownerEmail);

    expect(summary.ativos).toBe(1);
    expect(summary.aderentes.map((u) => u.email)).toEqual(["a@x.com"]);
    expect(summary.aderentes.find((u) => u.email === ownerEmail)).toBeUndefined();
  });

  it("ordena os aderentes ativos por nome pt-BR", () => {
    const users = [
      { email: "z@x.com", full_name: "Zilda", acesso_ativo: true },
      { email: "a@x.com", full_name: "Ágata", acesso_ativo: true },
      { email: "m@x.com", full_name: "Maria", acesso_ativo: true },
    ];
    const summary = buildAdminUserSummary(users, ownerEmail);

    expect(summary.aderentes.map((u) => u.name)).toEqual(["Ágata", "Maria", "Zilda"]);
  });

  it("usa o e-mail como fallback de nome", () => {
    const users = [
      { email: "semnome@x.com", acesso_ativo: true },
    ];
    const summary = buildAdminUserSummary(users, ownerEmail);

    expect(summary.aderentes[0].name).toBe("semnome@x.com");
  });
});

describe("findInvitedUser", () => {
  it("busca na lista fresca com e-mail normalizado, sem depender de estado anterior", () => {
    const freshUsers = [
      { email: "A@X.COM", full_name: "Ana", acesso_ativo: false },
      { email: "b@x.com", full_name: "Bia", acesso_ativo: false },
    ];

    const found = findInvitedUser(freshUsers, "  a@x.com  ");
    expect(found).toEqual({ email: "A@X.COM", full_name: "Ana", acesso_ativo: false });
  });

  it("retorna undefined quando o e-mail não está na lista fresca", () => {
    expect(findInvitedUser([], "a@x.com")).toBeUndefined();
    expect(findInvitedUser([{ email: "b@x.com" }], "a@x.com")).toBeUndefined();
  });
});