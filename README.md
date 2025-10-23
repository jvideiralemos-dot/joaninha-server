# Joaninha Server v1.2

Servidor (Express/Node) para a agente financeira **Joaninha** no WhatsApp (Twilio).

## Funcionalidades nesta versão
- Resolvedor de intenções com sinônimos, abreviações e tolerância a erros (emitir/cancelar/enviar NF).
- Fluxo de **emissão** (texto) com **resumo e confirmação**.
- **Envio automático do PDF** no WhatsApp após a emissão (arquivo de exemplo).
- Fluxo de **cancelamento** usando linguagem **“seu cliente”**.
- Fluxo de **envio de nota existente** com **resumo → confirmação → perguntar e-mail (se faltar)**.
- Mensagens amigáveis quando a intenção está ambígua.

## Subir no Render (gratuito, para testes)
1. Faça upload deste projeto no GitHub (repo público), ex.: `joaninha-server`.
2. No Render: **New → Web Service → Connect a repository** → escolha seu repo.
3. Configure:
   - **Name:** `joaninha-test`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Environment** → adicione variáveis (ver abaixo)
4. Deploy. O Render vai te dar uma URL, ex.: `https://joaninha-test.onrender.com`.

### Variáveis de ambiente (Render → Environment)
- `PORT` (Render define automaticamente, não precisa setar)
- `PUBLIC_BASE_URL` → cole a URL do serviço, ex.: `https://joaninha-test.onrender.com`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` → ex.: `whatsapp:+14155238886` (Sandbox) ou seu número aprovado

### Conectar no Twilio (Sandbox)
- Twilio Console → **Messaging → Try it out → WhatsApp Sandbox**.
- Em **WHEN A MESSAGE COMES IN**, cole:
  `https://SEU_DOMINIO/webhooks/whatsapp` (ex.: `https://joaninha-test.onrender.com/webhooks/whatsapp`)
- Salve. Envie "Oi" do seu WhatsApp para o número do Sandbox.

## Endpoints
- `GET /` → healthcheck
- `POST /webhooks/whatsapp` → recepção de mensagens (Twilio → Joaninha)
- `GET /assets/sample_invoice.pdf` → exemplo de PDF (usado no envio pós-emissão)

## Observações
- Esta versão **não emite NF de verdade**; a integração com a Prefeitura será ligada depois.
- O arquivo `sample_invoice.pdf` é apenas um exemplo para validar o envio de documento no WhatsApp.