import { base44 } from "@/api/base44Client";

const MAX_WIDTH = 1600;

async function loadLocalImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    if (typeof img.decode === "function") {
      try { await img.decode(); } catch {}
    }
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function enhanceCanvas(sourceCanvas) {
  let canvas = sourceCanvas;
  if (canvas.width > MAX_WIDTH) {
    const scale = MAX_WIDTH / canvas.width;
    const resized = document.createElement("canvas");
    resized.width = MAX_WIDTH;
    resized.height = Math.round(canvas.height * scale);
    resized.getContext("2d").drawImage(canvas, 0, 0, resized.width, resized.height);
    canvas = resized;
  }
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = 1.35;
  const brightness = 1.1;
  const saturation = 0.6;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    r *= brightness; g *= brightness; b *= brightness;
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * saturation;
    g = gray + (g - gray) * saturation;
    b = gray + (b - gray) * saturation;
    data[i] = clamp(r, 0, 255);
    data[i + 1] = clamp(g, 0, 255);
    data[i + 2] = clamp(b, 0, 255);
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function isCanvasBlack(canvas) {
  try {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const samples = 20;
    let blackCount = 0;
    for (let i = 0; i < samples; i++) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      if (pixel[0] < 10 && pixel[1] < 10 && pixel[2] < 10) blackCount++;
    }
    return blackCount > samples * 0.8;
  } catch {
    return true;
  }
}

function rotateCanvas90CW(sourceCanvas) {
  const out = document.createElement("canvas");
  out.width = sourceCanvas.height;
  out.height = sourceCanvas.width;
  const ctx = out.getContext("2d");
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
  return out;
}

function canvasToFile(canvas, name) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob], name, { type: "image/jpeg" }));
    }, "image/jpeg", 0.85);
  });
}

export async function detectCheque(file) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  const response = await base44.functions.invoke('detectarCheque', { file_url });
  return response.data;
}

function cornersToBox(detection) {
  if (!detection || !detection.encontrado || !detection.cantos) return null;
  const c = detection.cantos;
  const corners = [c.superior_esquerdo, c.superior_direito, c.inferior_direito, c.inferior_esquerdo];
  if (corners.some((pt) => !pt || isNaN(pt.x) || isNaN(pt.y))) return null;

  const allVals = corners.flatMap((pt) => [pt.x, pt.y]);
  const maxVal = Math.max(...allVals);
  let scale = 1;
  if (maxVal <= 1) scale = 100;
  else if (maxVal <= 100) scale = 1;
  else if (maxVal <= 1000) scale = 0.1;
  else return null;

  const xs = corners.map((pt) => pt.x * scale);
  const ys = corners.map((pt) => pt.y * scale);

  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  const pad = 4;
  minX = clamp(minX - pad, 0, 100);
  minY = clamp(minY - pad, 0, 100);
  maxX = clamp(maxX + pad, 0, 100);
  maxY = clamp(maxY + pad, 0, 100);

  const w = maxX - minX;
  const h = maxY - minY;
  if (w <= 0 || h <= 0) return null;

  return { x: minX, y: minY, w, h };
}

async function cropByBox01(file, box01, shouldRotate) {
  try {
    const img = await loadLocalImage(file);
    if (!img.naturalWidth || !img.naturalHeight) return null;

    const sx = box01.x * img.naturalWidth;
    const sy = box01.y * img.naturalHeight;
    const sw = box01.w * img.naturalWidth;
    const sh = box01.h * img.naturalHeight;

    let canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    if (Math.min(canvas.width, canvas.height) < 200) {
      console.warn("[chequeScanner] Recorte muito pequeno:", canvas.width + "x" + canvas.height);
      return null;
    }
    if (isCanvasBlack(canvas)) {
      console.warn("[chequeScanner] Resultado preto após recorte.");
      return null;
    }

    if (shouldRotate) {
      canvas = rotateCanvas90CW(canvas);
    }

    const enhanced = enhanceCanvas(canvas);
    if (isCanvasBlack(enhanced)) {
      console.warn("[chequeScanner] Resultado preto após melhoria.");
      return null;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const croppedFile = await canvasToFile(enhanced, baseName + "_scan.jpg");
    return { file: croppedFile, box: box01 };
  } catch (err) {
    console.error("[chequeScanner] Erro ao recortar:", err);
    return null;
  }
}

function dilateMask(mask, w, h, iterations) {
  let current = mask;
  for (let it = 0; it < iterations; it++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (current[idx]) { next[idx] = 1; continue; }
        if ((x > 0 && current[idx - 1]) || (x < w - 1 && current[idx + 1]) ||
            (y > 0 && current[idx - w]) || (y < h - 1 && current[idx + w])) {
          next[idx] = 1;
        }
      }
    }
    current = next;
  }
  return current;
}

export async function detectByLuminosity(file) {
  try {
    const img = await loadLocalImage(file);
    if (!img.naturalWidth || !img.naturalHeight) return { box: null, motivo: "sem imagem", caixa_raw: "" };

    const targetW = 240;
    const scale = targetW / img.naturalWidth;
    const w = targetW;
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const numPixels = w * h;
    const lum = new Float32Array(numPixels);
    for (let i = 0; i < numPixels; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const sorted = Float32Array.from(lum).sort();
    const median = sorted[Math.floor(numPixels / 2)];

    const threshold = Math.max(median * 1.25, median + 25);

    let mask = new Uint8Array(numPixels);
    for (let i = 0; i < numPixels; i++) {
      mask[i] = lum[i] > threshold ? 1 : 0;
    }

    mask = dilateMask(mask, w, h, 2);

    const visited = new Uint8Array(numPixels);
    const queue = new Int32Array(numPixels);
    let bestBox = null;
    let bestArea = 0;

    for (let start = 0; start < numPixels; start++) {
      if (!mask[start] || visited[start]) continue;

      let qHead = 0, qTail = 0;
      queue[qTail++] = start;
      visited[start] = 1;
      let minX = w, maxX = 0, minY = h, maxY = 0;
      let area = 0;

      while (qHead < qTail) {
        const cur = queue[qHead++];
        const cx = cur % w;
        const cy = (cur - cx) / w;
        area++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        if (cx > 0) { const n = cur - 1; if (mask[n] && !visited[n]) { visited[n] = 1; queue[qTail++] = n; } }
        if (cx < w - 1) { const n = cur + 1; if (mask[n] && !visited[n]) { visited[n] = 1; queue[qTail++] = n; } }
        if (cy > 0) { const n = cur - w; if (mask[n] && !visited[n]) { visited[n] = 1; queue[qTail++] = n; } }
        if (cy < h - 1) { const n = cur + w; if (mask[n] && !visited[n]) { visited[n] = 1; queue[qTail++] = n; } }
      }

      if (area > bestArea) {
        bestArea = area;
        bestBox = { minX, maxX, minY, maxY };
      }
    }

    if (!bestBox || bestArea < numPixels * 0.02) {
      console.warn("[chequeScanner] Luminosidade: nenhum componente claro significativo.");
      return { box: null, motivo: "sem componente claro", caixa_raw: "" };
    }

    const padX = Math.round(w * 0.02);
    const padY = Math.round(h * 0.02);
    bestBox.minX = Math.max(0, bestBox.minX - padX);
    bestBox.maxX = Math.min(w - 1, bestBox.maxX + padX);
    bestBox.minY = Math.max(0, bestBox.minY - padY);
    bestBox.maxY = Math.min(h - 1, bestBox.maxY + padY);

    const bw = (bestBox.maxX - bestBox.minX + 1) / w;
    const bh = (bestBox.maxY - bestBox.minY + 1) / h;
    const bx = bestBox.minX / w;
    const by = bestBox.minY / h;

    const areaPct = bw * bh * 100;
    if (areaPct < 12 || areaPct > 95) {
      console.warn("[chequeScanner] Luminosidade: área fora do intervalo (12%-95%):", areaPct.toFixed(1) + "%");
      return { box: null, motivo: "area " + areaPct.toFixed(1) + "% fora da faixa", caixa_raw: JSON.stringify({ x: bx, y: by, w: bw, h: bh }) };
    }

    const aspect = bw / bh;
    if (aspect < 0.15 || aspect > 6.0) {
      console.warn("[chequeScanner] Luminosidade: proporção implausível:", aspect.toFixed(2));
      return { box: null, motivo: "proporcao " + aspect.toFixed(2) + " fora da faixa", caixa_raw: JSON.stringify({ x: bx, y: by, w: bw, h: bh }) };
    }

    console.log("[chequeScanner] Luminosidade: caixa detectada", { x: bx, y: by, w: bw, h: bh }, "área:", areaPct.toFixed(1) + "%");
    return { box: { x: bx, y: by, w: bw, h: bh }, motivo: "ok", caixa_raw: JSON.stringify({ x: bx, y: by, w: bw, h: bh }) };
  } catch (err) {
    console.error("[chequeScanner] Erro na detecção por luminosidade:", err);
    return { box: null, motivo: "erro: " + err.message, caixa_raw: "" };
  }
}

export async function applyDetection(file, detection) {
  try {
    const box = cornersToBox(detection);
    if (!box) {
      console.warn("[chequeScanner] Cantos inválidos ou ausentes.");
      return null;
    }

    const areaPercent = (box.w * box.h) / 100;
    if (areaPercent < 25 || areaPercent > 95) {
      console.warn("[chequeScanner] Área fora do intervalo (25%-95%):", areaPercent.toFixed(1) + "%");
      return null;
    }

    const box01 = { x: box.x / 100, y: box.y / 100, w: box.w / 100, h: box.h / 100 };
    const shouldRotate = box01.h > box01.w * 1.3;
    return await cropByBox01(file, box01, shouldRotate);
  } catch (err) {
    console.error("[chequeScanner] Erro ao aplicar detecção:", err);
    return null;
  }
}

async function getIABox(file) {
  const detection = await detectCheque(file);
  const box = cornersToBox(detection);
  if (!box) return null;
  const areaPercent = (box.w * box.h) / 100;
  if (areaPercent < 25 || areaPercent > 95) return null;
  return { x: box.x / 100, y: box.y / 100, w: box.w / 100, h: box.h / 100 };
}

export async function autoDetectAndCrop(file) {
  let method = "nenhum";
  let chosenBox = null;

  const lumResult = await detectByLuminosity(file);
  const lumBox = lumResult.box;
  const motivo = lumResult.motivo;
  const caixa_luminosidade = lumResult.caixa_raw;

  let iaBox = null;
  let caixa_ia = "";
  try {
    iaBox = await getIABox(file);
    if (iaBox) caixa_ia = JSON.stringify(iaBox);
  } catch (err) {
    console.error("[chequeScanner] IA falhou:", err);
  }

  const lumArea = lumBox ? lumBox.w * lumBox.h : Infinity;
  const iaArea = iaBox ? iaBox.w * iaBox.h : Infinity;

  if (lumBox && iaBox) {
    if (iaArea < lumArea) {
      chosenBox = iaBox;
      method = "ia";
    } else {
      chosenBox = lumBox;
      method = "luminosidade";
    }
  } else if (lumBox) {
    chosenBox = lumBox;
    method = "luminosidade";
  } else if (iaBox) {
    chosenBox = iaBox;
    method = "ia";
  }

  const telemetryBase = { motivo, caixa_luminosidade, caixa_ia };

  if (!chosenBox) {
    console.log("[chequeScanner] Método de detecção: nenhum");
    return { file: null, box: null, method, telemetry: { area_pct: 0, rotacionou: false, caixa: "", ...telemetryBase } };
  }

  const rotacionou = chosenBox.h > chosenBox.w * 1.3;
  const result = await cropByBox01(file, chosenBox, rotacionou);

  if (!result) {
    console.log("[chequeScanner] Recorte falhou para método:", method);
    return { file: null, box: null, method, telemetry: { area_pct: 0, rotacionou: false, caixa: "", ...telemetryBase } };
  }

  const area_pct = chosenBox.w * chosenBox.h * 100;
  console.log("[chequeScanner] Método:", method, "Área:", area_pct.toFixed(1) + "%", "Rotacionou:", rotacionou);

  return {
    file: result.file,
    box: result.box,
    method,
    telemetry: {
      area_pct,
      rotacionou,
      caixa: JSON.stringify(chosenBox),
      ...telemetryBase,
    },
  };
}

export async function verifyCropComplete(file) {
  try {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: "A imagem mostra um cheque bancário INTEIRO, com as 4 bordas do papel visíveis? Responda apenas com o campo cheque_completo (true ou false).",
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          cheque_completo: { type: "boolean" }
        }
      }
    });
    return result.cheque_completo === true;
  } catch (err) {
    console.error("[chequeScanner] Erro ao verificar recorte:", err);
    return true;
  }
}