// Acha o papel do cheque na foto, sem internet e em menos de meio segundo.
// O cheque é claro e pouco colorido; o fundo (mesa, estofado) é mais escuro ou mais colorido.
// Passos: reduz a foto, separa "claro e sem cor" do resto pelo limiar de Otsu, pega a maior
// mancha ligada e devolve a caixa dela em frações da imagem (0 a 1).

const LADO_MAX = 320;

function limiarOtsu(valores) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < valores.length; i++) hist[valores[i]]++;
  const total = valores.length;
  let somaTotal = 0;
  for (let i = 0; i < 256; i++) somaTotal += i * hist[i];
  let pesoFundo = 0;
  let somaFundo = 0;
  let melhor = -1;
  let limiar = 128;
  for (let i = 0; i < 256; i++) {
    pesoFundo += hist[i];
    if (!pesoFundo) continue;
    const pesoFrente = total - pesoFundo;
    if (!pesoFrente) break;
    somaFundo += i * hist[i];
    const mediaFundo = somaFundo / pesoFundo;
    const mediaFrente = (somaTotal - somaFundo) / pesoFrente;
    const variancia = pesoFundo * pesoFrente * (mediaFundo - mediaFrente) ** 2;
    if (variancia > melhor) {
      melhor = variancia;
      limiar = i;
    }
  }
  return limiar;
}

// imagem = { data: RGBA, width, height } (ImageData de um canvas já reduzido)
export function detectarPapel(imagem) {
  const { data, width: w, height: h } = imagem;
  if (!w || !h) return null;
  const valores = new Uint8Array(w * h);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const cinza = 0.299 * r + 0.587 * g + 0.114 * b;
    const saturacao = max ? (max - min) / max : 0;
    valores[p] = Math.max(0, Math.min(255, Math.round(cinza * (1 - 0.6 * saturacao))));
  }
  const limiar = limiarOtsu(valores);

  const rotulo = new Int32Array(w * h);
  const fila = new Int32Array(w * h);
  let atual = 0;
  let melhor = null;
  for (let inicio = 0; inicio < w * h; inicio++) {
    if (valores[inicio] <= limiar || rotulo[inicio]) continue;
    atual++;
    let ini = 0;
    let fim = 0;
    fila[fim++] = inicio;
    rotulo[inicio] = atual;
    let n = 0;
    let x0 = w, x1 = 0, y0 = h, y1 = 0;
    while (ini < fim) {
      const p = fila[ini++];
      n++;
      const x = p % w;
      const y = (p - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const viz = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of viz) {
        if (q >= 0 && !rotulo[q] && valores[q] > limiar) {
          rotulo[q] = atual;
          fila[fim++] = q;
        }
      }
    }
    if (!melhor || n > melhor.n) melhor = { n, x0, x1, y0, y1 };
  }
  if (!melhor) return null;

  const caixaW = melhor.x1 - melhor.x0 + 1;
  const caixaH = melhor.y1 - melhor.y0 + 1;
  const areaPct = (caixaW * caixaH) / (w * h);
  const preenchimento = melhor.n / (caixaW * caixaH);
  if (areaPct < 0.12 || preenchimento < 0.5) return null;

  const folga = 0.015;
  const x = Math.max(0, melhor.x0 / w - folga);
  const y = Math.max(0, melhor.y0 / h - folga);
  const x2 = Math.min(1, (melhor.x1 + 1) / w + folga);
  const y2 = Math.min(1, (melhor.y1 + 1) / h + folga);
  return { x, y, w: x2 - x, h: y2 - y };
}

// Clareia o fundo e escurece a tinta sem estourar: estica a luz entre os percentis 2% e 98%.
export function melhorarImagem(imagem) {
  const { data } = imagem;
  const hist = new Array(256).fill(0);
  const total = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    hist[Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])]++;
  }
  let acum = 0;
  let baixo = -1;
  let alto = -1;
  for (let i = 0; i < 256; i++) {
    acum += hist[i];
    if (baixo < 0 && acum > total * 0.02) baixo = i;
    if (alto < 0 && acum >= total * 0.98) alto = i;
  }
  if (alto - baixo < 40) return imagem;
  const escala = 255 / (alto - baixo);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = (data[i + c] - baixo) * escala;
      data[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  return imagem;
}

export { LADO_MAX };
