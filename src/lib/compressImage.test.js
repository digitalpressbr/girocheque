import { describe, it, expect } from "vitest";
import { medidaFinal, comprimirImagem } from "./compressImage";

describe("medidaFinal", () => {
  it("reduz foto de celular para lado maior de 2000 px mantendo a proporção", () => {
    expect(medidaFinal(4032, 3024)).toEqual({ largura: 2000, altura: 1500, reduziu: true });
    expect(medidaFinal(3024, 4032)).toEqual({ largura: 1500, altura: 2000, reduziu: true });
  });
  it("não mexe em imagem que já cabe", () => {
    expect(medidaFinal(1600, 700)).toEqual({ largura: 1600, altura: 700, reduziu: false });
  });
});

describe("comprimirImagem", () => {
  it("devolve PDF sem alteração", async () => {
    const pdf = { type: "application/pdf", size: 10, name: "a.pdf" };
    expect(await comprimirImagem(pdf)).toBe(pdf);
  });
  it("devolve nulo sem quebrar", async () => {
    expect(await comprimirImagem(null)).toBe(null);
  });
});
