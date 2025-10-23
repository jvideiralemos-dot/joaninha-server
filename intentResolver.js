function normalize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s@.+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dist(a, b) {
  const m = [];
  for (let i = 0; i <= b.length; i++) { m[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { m[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = Math.min(
        m[i-1][j] + 1,
        m[i][j-1] + 1,
        m[i-1][j-1] + (a[j-1] === b[i-1] ? 0 : 1)
      );
    }
  }
  return m[b.length][a.length];
}

function fuzzyIncludes(text, variants, maxDistance = 2) {
  const tokens = text.split(" ");
  for (const tok of tokens) {
    for (const v of variants) {
      if (tok === v) return true;
      if (tok.startsWith(v) || v.startsWith(tok)) return true;
      if (dist(tok, v) <= maxDistance) return true;
    }
  }
  return false;
}

const vocab = {
  nota: ["nf","nfe","nfse","nota","notafiscal","nfs"],
  emitir: ["emitir","emite","emit","gerar","faturar","fatura","criar","fazer","faça","gero","quero emitir","quero gerar"],
  cancelar: ["cancelar","cancela","cancel","estornar","anular","invalidar","cancelamento"],
  enviar: ["enviar","mandar","remeter","reencaminhar","encaminhar"],
  email: ["email","e-mail","mail"]
};

function getIntent(textRaw) {
  const text = normalize(textRaw);

  const hasNota = fuzzyIncludes(text, vocab.nota);
  const isEmitir = fuzzyIncludes(text, vocab.emitir);
  const isCancelar = fuzzyIncludes(text, vocab.cancelar);
  const isEnviar = fuzzyIncludes(text, vocab.enviar);
  const hasEmail = fuzzyIncludes(text, vocab.email);

  if (isEmitir && hasNota) return { intent: "emitir_nota" };
  if (isCancelar && hasNota) return { intent: "cancelar_nota" };
  if (isEnviar && hasNota && hasEmail) return { intent: "enviar_nota_email" };

  if (hasNota && (isEnviar || isEmitir || isCancelar)) {
    if (isEnviar) return { intent: "enviar_nota_email_ask_email" };
  }

  if (hasNota) return { intent: "nota_sem_verbo" };
  return { intent: "ambigua" };
}

function extractValueBRL(textRaw) {
  const text = normalize(textRaw);
  const m = text.match(/(?:r?\$?\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/);
  if (!m) return null;
  let val = m[1].replace(/\./g, "").replace(",", ".");
  const num = parseFloat(val);
  if (Number.isNaN(num)) return null;
  return num;
}

function extractClientName(textRaw) {
  const m = textRaw.match(/(?:pra|para|p\/)\s+(.+)$/i);
  if (m) return m[1].trim();
  return null;
}

module.exports = { getIntent, extractValueBRL, extractClientName, normalize };