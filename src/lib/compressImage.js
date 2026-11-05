// Reduz a foto antes de subir: foto de iPhone/Android vem com 3 a 8 MB (4032 x 3024).
// Lado maior até 2000 px em JPEG 0,85 deixa o cheque legível com uns 300 a 600 KB.
// PDF, arquivo que não é imagem e imagem já pequena passam sem mexer.
export const LADO_MAX = 2000;
export const QUALIDADE = 0.85;
export const TAMANHO_SEM_MEXER = 700 * 1024;

export function medidaFinal(largura, altura, ladoMax = LADO_MAX) {
  const maior = Math.max(largura, altura);
  if (!maior || maior <= ladoMax) return { largura, altura, reduziu: false };
  const escala = ladoMax / maior;
  return { largura: Math.round(largura * escala), altura: Math.round(altura * escala), reduziu: true };
}

function nomeJpg(nome) {
  const base = String(nome || 'foto').replace(/\.[^.]+$/, '');
  return `${base}.jpg`;
}

async function carregar(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* cai para <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function comprimirImagem(file) {
  if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const img = await carregar(file);
    const w = img.width || img.naturalWidth;
    const h = img.height || img.naturalHeight;
    const alvo = medidaFinal(w, h);
    const jaEhJpeg = file.type === 'image/jpeg';
    if (!alvo.reduziu && jaEhJpeg && file.size <= TAMANHO_SEM_MEXER) return file;
    const canvas = document.createElement('canvas');
    canvas.width = alvo.largura;
    canvas.height = alvo.altura;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (typeof img.close === 'function') img.close();
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', QUALIDADE));
    if (!blob) return file;
    if (blob.size >= file.size && jaEhJpeg) return file;
    return new File([blob], nomeJpg(file.name), { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}
