import { describe, it, expect } from "vitest";
import {
  normalizeResponsavelName,
  dedupeResponsaveis,
  buildInitialResponsaveis,
  canDeleteResponsavel,
  deleteResponsavelEntity,
} from "./responsaveis";

describe("normalizeResponsavelName", () => {
  it("apara espaços externos e colapsa espaços internos repetidos em um só", () => {
    expect(normalizeResponsavelName("  Rodrigo   Souza  ")).toBe("Rodrigo Souza");
    expect(normalizeResponsavelName("Isabela")).toBe("Isabela");
  });
});

describe("dedupeResponsaveis", () => {
  it("deduplica case-insensitive preservando a primeira grafia", () => {
    expect(dedupeResponsaveis(["Rodrigo", "rodrigo", "Isabela", "ISABELA"])).toEqual([
      "Rodrigo",
      "Isabela",
    ]);
  });

  it("retorna array vazio para entrada vazia", () => {
    expect(dedupeResponsaveis([])).toEqual([]);
  });
});

describe("buildInitialResponsaveis", () => {
  it("usa full_name do usuário", () => {
    expect(buildInitialResponsaveis({ full_name: "Rodrigo Souza", email: "r@x.com" })).toEqual([
      "Rodrigo Souza",
    ]);
  });

  it("sem full_name usa a parte anterior ao @ do e-mail", () => {
    expect(buildInitialResponsaveis({ email: "ro_agronomo@hotmail.com" })).toEqual([
      "ro_agronomo",
    ]);
  });
});

describe("canDeleteResponsavel", () => {
  const mk = (id, ativo) => ({ id, nome: id, ativo });

  it("permite excluir item inativo mesmo se for o único inativo", () => {
    const list = [mk("a", true), mk("b", false)];
    const r = canDeleteResponsavel(list, "b");
    expect(r).toEqual({ ok: true });
  });

  it("permite excluir ativo quando sobra pelo menos um outro ativo", () => {
    const list = [mk("a", true), mk("b", true), mk("c", false)];
    const r = canDeleteResponsavel(list, "a");
    expect(r).toEqual({ ok: true });
  });

  it("bloqueia excluir o último ativo", () => {
    const list = [mk("a", true), mk("b", false)];
    const r = canDeleteResponsavel(list, "a");
    expect(r.ok).toBe(false);
    expect(typeof r.motivo).toBe("string");
    expect(r.motivo.length).toBeGreaterThan(0);
  });

  it("bloqueia excluir id inexistente", () => {
    const list = [mk("a", true)];
    const r = canDeleteResponsavel(list, "zzz");
    expect(r.ok).toBe(false);
    expect(typeof r.motivo).toBe("string");
  });
});

describe("deleteResponsavelEntity", () => {
  const mkClient = (resp) => ({
    entities: { Responsavel: { delete: () => resp } },
  });

  it("exige id não vazio", async () => {
    const client = mkClient("NOPE");
    await expect(deleteResponsavelEntity(client, "")).rejects.toThrow(/id/i);
    await expect(deleteResponsavelEntity(client, null)).rejects.toThrow(/id/i);
  });

  it("chama exclusivamente client.entities.Responsavel.delete(id) e retorna a resposta", async () => {
    let calledArgs = [];
    const client = {
      entities: {
        Responsavel: {
          delete: (id) => { calledArgs.push(id); return { ok: true, id }; },
        },
        Outro: { delete: () => { throw new Error("não deve chamar Outro"); } },
      },
      users: { inviteUser: () => { throw new Error("não deve chamar users"); } },
    };
    const r = await deleteResponsavelEntity(client, "r1");
    expect(calledArgs).toEqual(["r1"]);
    expect(r).toEqual({ ok: true, id: "r1" });
  });
});