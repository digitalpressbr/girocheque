import { describe, it, expect } from "vitest";
import { detectarPapel, melhorarImagem } from "./detectarPapel";

function imagem(w, h, pintar) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pintar(x, y);
      const i = (y * w + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

describe("detectarPapel", () => {
  it("acha o papel claro sobre mesa escura", () => {
    const img = imagem(200, 150, (x, y) => (x >= 40 && x < 160 && y >= 30 && y < 120 ? [235, 232, 225] : [70, 50, 40]));
    const c = detectarPapel(img);
    expect(c.x).toBeCloseTo(0.185, 1);
    expect(c.y).toBeCloseTo(0.185, 1);
    expect(c.x + c.w).toBeCloseTo(0.815, 1);
    expect(c.y + c.h).toBeCloseTo(0.815, 1);
  });

  it("separa papel branco de fundo vermelho vivo", () => {
    const img = imagem(160, 160, (x, y) => (x >= 20 && x < 140 && y >= 50 && y < 110 ? [240, 238, 230] : [200, 30, 40]));
    const c = detectarPapel(img);
    expect(c.w).toBeGreaterThan(0.7);
    expect(c.h).toBeLessThan(0.5);
  });

  it("devolve null quando não há mancha clara grande", () => {
    const img = imagem(100, 100, () => [90, 90, 90]);
    expect(detectarPapel(img)).toBeNull();
  });
});

describe("melhorarImagem", () => {
  it("estica o contraste de foto apagada", () => {
    const img = imagem(10, 10, (x) => (x < 5 ? [80, 80, 80] : [170, 170, 170]));
    melhorarImagem(img);
    expect(img.data[0]).toBe(0);
    expect(img.data[(9) * 4]).toBe(255);
  });
});
