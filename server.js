import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ==========================
// ENV VARS
// ==========================
const PORT = process.env.PORT || 10000;

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v22.0";

// ==========================
// HEALTH CHECK
// ==========================
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "joaninha-server" });
});

// ==========================
// WEBHOOK - VERIFICAÇÃO (GET)
// ==========================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verificado com sucesso");
    return res.status(200).send(challenge);
  }

  console.log("❌ Falha na verificação do webhook");
  return res.sendStatus(403);
});

// ==========================
// WEBHOOK - RECEBIMENTO (POST)
// ==========================
app.post("/webhook", (req, res) => {
  console.log("📩 Evento recebido do WhatsApp:");
  console.dir(req.body, { depth: null });

  res.sendStatus(200);
});

// ==========================
// SEND MESSAGE ENDPOINT
// ==========================
app.post("/send", async (req, res) => {
  try {
    const { to, text } = req.body;

    if (!to || !text) {
      return res.status(400).json({
        error: "Campos obrigatórios: to, text",
      });
    }

    const url = `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        body: text,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Erro ao enviar mensagem:", data);
      return res.status(500).json(data);
    }

    console.log("✅ Mensagem enviada com sucesso:", data);
    res.json({ success: true, data });
  } catch (error) {
    console.error("🔥 Erro interno:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// ==========================
// START SERVER
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});
