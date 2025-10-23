function hello() {
  return "Oi, eu sou a Joaninha 🐞 — sua agente financeira.\nPosso te ajudar a *emitir*, *cancelar* ou *enviar por e-mail* uma nota fiscal.";
}

function askWhatToDo() {
  return "Você quer *emitir* uma nota, *cancelar* uma nota ou *enviar por e-mail* uma nota existente?";
}

function notSure() {
  return "Não tenho certeza se entendi. Você quis dizer *emitir* uma nota, *cancelar* ou *enviar por e-mail*?";
}

function askClientOrNumberForCancel() {
  return "Para *cancelar*, pode me dizer o *número da nota* ou o *nome do seu cliente*?";
}

function askInfoForSend() {
  return "Para *enviar* uma nota por e-mail, me diga o *número*, o *valor* ou o *nome do cliente* para eu localizar.";
}

function confirmSendTo(email) {
  return `Confirma o envio da nota para **${email}**?`;
}

function askMissingEmail() {
  return "Para qual e-mail você deseja que eu envie essa nota?";
}

function emitAskBasic() {
  return "Perfeito! Para *emitir*, me diga o **CNPJ** (ou o nome do cliente se for favorito), o **valor** e a **descrição** (pode ser por texto).";
}

function emitSummary({cliente, valor, descricao}) {
  const v = (valor != null) ? valor.toLocaleString("pt-BR", {style:"currency", currency:"BRL"}) : "(sem valor)";
  return `Segue o resumo da nota:\n• Prestador: *PLENUS CONSULTORIA E ASSESSORIA CONTÁBIL LTDA* (Niterói/RJ)\n• Cliente: *${cliente || "(a preencher)"}*\n• Serviço: *17.03 – Planejamento e organização técnica*\n• Regime: *Simples Nacional (ISS via DAS)*\n• Valor: *${v}*\n• Descrição: *${descricao || "(a preencher)"}*\nConfirmo a emissão? (responda *SIM* ou *NÃO*)`;
}

function emitSuccess(publicBaseUrl) {
  const pdfUrl = `${publicBaseUrl}/assets/sample_invoice.pdf`;
  return {
    text: "Nota emitida com sucesso! 🎉\nEnviei o PDF na sequência. Quer que eu envie por e-mail também?",
    mediaUrl: pdfUrl
  };
}

function foundInvoiceSummary({numero, cliente, valor, competencia, descricao}) {
  const v = (valor != null) ? valor.toLocaleString("pt-BR", {style:"currency", currency:"BRL"}) : "";
  return `Encontrei esta nota:\n• Nº: ${numero}\n• Cliente: ${cliente}\n• Valor: ${v}\n• Competência: ${competencia}\n• Descrição: ${descricao}\nÉ *essa nota* que você está se referindo? (SIM/NÃO)`;
}

function needMoreInfoToFind() {
  return "Opa! Então preciso de um pouco mais de informação para identificar a nota.\nPode me dizer o *número*, o *valor* ou o *nome do cliente*?";
}

module.exports = {
  hello, askWhatToDo, notSure, askClientOrNumberForCancel, askInfoForSend,
  confirmSendTo, askMissingEmail, emitAskBasic, emitSummary, emitSuccess,
  foundInvoiceSummary, needMoreInfoToFind
};