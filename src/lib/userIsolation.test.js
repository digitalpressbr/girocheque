import { describe, it, expect } from "vitest";
import { normalizeEmail, isOwnerEmail, canAccessApp } from "./userIsolation";

describe("normalizeEmail", () => {
  it("remove espaços externos e converte para minúsculas", () => {
    expect(normalizeEmail("  RO_AGRONOMO@HOTMAIL.COM  ")).toBe("ro_agronomo@hotmail.com");
    expect(normalizeEmail("Joao@Gmail.com")).toBe("joao@gmail.com");
  });
});

describe("isOwnerEmail", () => {
  it("aceita RO_AGRONOMO@HOTMAIL.COM com espaços", () => {
    expect(isOwnerEmail("  RO_AGRONOMO@HOTMAIL.COM  ")).toBe(true);
  });

  it("rejeita outro e-mail", () => {
    expect(isOwnerEmail("joao@gmail.com")).toBe(false);
  });
});

describe("canAccessApp", () => {
  it("retorna true para usuário ativo", () => {
    expect(canAccessApp({ email: "joao@gmail.com", acesso_ativo: true })).toBe(true);
  });

  it("retorna false para acesso_ativo=false", () => {
    expect(canAccessApp({ email: "joao@gmail.com", acesso_ativo: false })).toBe(false);
  });

  it("dono ro_agronomo@hotmail.com continua autorizado mesmo com acesso_ativo undefined", () => {
    expect(canAccessApp({ email: "ro_agronomo@hotmail.com" })).toBe(true);
  });

  it("usuário comum com acesso_ativo undefined fica bloqueado até ativação explícita", () => {
    expect(canAccessApp({ email: "joao@gmail.com" })).toBe(false);
  });
});