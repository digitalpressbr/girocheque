function norm(uri) {
  if (uri == null) return "";
  return String(uri).trim();
}

export function getChequePrivateFileUris(cheque) {
  if (!cheque) return [];
  const uris = [norm(cheque.foto_uri), norm(cheque.foto_uri_2)].filter(Boolean);
  const seen = new Set();
  const result = [];
  for (const u of uris) {
    if (seen.has(u)) continue;
    seen.add(u);
    result.push(u);
  }
  return result;
}

export function mergeChequePrivateFileUris(cheque, uri, options = {}) {
  let slot = options.slot;
  if (slot === undefined) {
    slot = cheque && norm(cheque.foto_uri) ? 2 : 1;
  }
  if (slot !== 1 && slot !== 2) {
    throw new Error("slot inválido: use 1 ou 2");
  }
  const normalized = norm(uri);
  const base = {
    foto_uri: cheque && cheque.foto_uri != null ? cheque.foto_uri : "",
    foto_uri_2: cheque && cheque.foto_uri_2 != null ? cheque.foto_uri_2 : "",
  };
  if (slot === 1) {
    base.foto_uri = normalized;
  } else {
    base.foto_uri_2 = normalized;
  }
  return base;
}