const express = require("express");

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "dev-token";

// Healthcheck (pra Render)
app.get("/health", (req, res) => res.status(200).send("ok"));

// Verificação do Webhook (Meta)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado com sucesso.");
    return res.status(200).send(challenge);
  }

  console.log("❌ Falha na verificação do webhook.", { mode, token });
  return res.sendStatus(403);
});

// Recebe eventos do WhatsApp
app.post("/webhook", (req, res) => {
  console.log("📩 Evento recebido:", JSON.stringify(req.body, null, 2));
  return res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});
