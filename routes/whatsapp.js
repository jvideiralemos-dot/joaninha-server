// routes/whatsapp.js
const express = require("express");
const router = express.Router();
const twilio = require("twilio");
const {
  getIntent,
  extractValueBRL,
  extractClientName,
  normalize,
} = require("../utils/intentResolver");
const msg = require("../utils/messages");

// --- Twilio client (só envia de verdade se tiver credenciais) ---
const client = (() => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token) return twilio(sid, token);
  return null; // modo dev: só loga no console
})();
const FROM = process.env.TWILIO_WHATSAPP_FROM; // ex.: whatsapp:+14155238886 (sandbox)
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://example.com";

// --- Sessões simples em memória (MVP) ---
const sessions = new Map();

// Envio com guarda + LOGS
async function sendWhats(to, body, mediaUrl) {
  if (!to || typeof to !== "string" || !to.startsWith("whatsapp:")) {
    console.log("[skip send] 'to' inválido:", to, body);
    return;
  }
  if (!client || !FROM) {
    console.log(
      "[dev reply] (sem TWILIO_ACCOUNT_SID/AUTH_TOKEN/WHATSAPP_FROM)",
      { to, body, mediaUrl }
    );
    return;
  }
  const payload = { from: FROM, to, body };
  if (mediaUrl) payload.mediaUrl = mediaUrl;

  try {
    const resp = await client.messages.create(payload);
    console.log("[sent]", { sid: resp.sid, to: resp.to, status: resp.status });
    return resp;
  } catch (err) {
    console.error(
      "[twilio send error]",
      err?.status || "",
      err?.code || "",
      err?.message || "",
      err?.moreInfo || ""
    );
  }
}

// Healthcheck da rota montada em /webhooks/whatsapp
router.get("/", (req, res) => res.send("whatsapp webhook live"));

router.post("/", async (req, res) => {
  try {
    // Twilio envia application/x-www-form-urlencoded
    const from =
      req.body && typeof req.body.From === "string" ? req.body.From : null; // "whatsapp:+55..."
    const text =
      req.body && typeof req.body.Body === "string" ? req.body.Body : "";

    console.log("[inbound]", { from, text });

    // Se vier sem 'From', ignora educadamente (não tenta responder)
    if (!from) {
      console.log("[warn] Webhook sem 'From' — ignorando.");
      return res.sendStatus(200);
    }

    // Sessão por número
    if (!sessions.has(from)) {
      sessions.set(from, { state: "idle", data: {} });
      await sendWhats(from, msg.hello());
      return res.sendStatus(200);
    }

    const session = sessions.get(from);
    const low = normalize(text);

    // --- Confirma emissão ---
    if (session.state === "await_emit_confirm") {
      if (low.includes("sim")) {
        const success = msg.emitSuccess(PUBLIC_BASE_URL);
        await sendWhats(from, success.text);
        await sendWhats(from, "Segue o PDF da nota.", success.mediaUrl);
        sessions.set(from, { state: "idle", data: {} });
        return res.sendStatus(200);
      }
      if (low.includes("nao") || low.includes("não")) {
        await sendWhats(
          from,
          "Beleza, emissão cancelada. Posso te ajudar com mais alguma coisa?"
        );
        sessions.set(from, { state: "idle", data: {} });
        return res.sendStatus(200);
      }
    }

    // --- Confirma envio por e-mail ---
    if (session.state === "await_send_email_confirm") {
      if (low.includes("sim")) {
        await sendWhats(from, "E-mail enviado com sucesso! ✉️");
        sessions.set(from, { state: "idle", data: {} });
        return res.sendStatus(200);
      }
      if (low.includes("nao") || low.includes("não")) {
        await sendWhats(
          from,
          "Certo! Não vou enviar por e-mail. Precisa de mais algo?"
        );
        sessions.set(from, { state: "idle", data: {} });
        return res.sendStatus(200);
      }
    }

    // --- Intenções ---
    const { intent } = getIntent(text);

    // EMITIR
    if (intent === "emitir_nota") {
      const valor = extractValueBRL(text);
      const cliente = extractClientName(text) || session.data.cliente;
      session.data.valor = valor ?? session.data.valor;
      session.data.cliente = cliente ?? session.data.cliente;

      if (!session.data.cliente) {
        await sendWhats(
          from,
          "Pra quem é a nota? Me diga o *nome do seu cliente* ou o *CNPJ*."
        );
        session.state = "await_client_for_emit";
        return res.sendStatus(200);
      }
      if (session.data.valor == null) {
        await sendWhats(from, "Qual é o *valor* da nota?");
        session.state = "await_value_for_emit";
        return res.sendStatus(200);
      }
      if (!session.data.descricao) {
        await sendWhats(
          from,
          "Qual *descrição* você quer colocar na nota? (pode digitar um texto curto)"
        );
        session.state = "await_desc_for_emit";
        return res.sendStatus(200);
      }

      await sendWhats(
        from,
        msg.emitSummary({
          cliente: session.data.cliente,
          valor: session.data.valor,
          descricao: session.data.descricao,
        })
      );
      session.state = "await_emit_confirm";
      return res.sendStatus(200);
    }

    if (session.state === "await_client_for_emit") {
      session.data.cliente = text.trim();
      if (session.data.valor == null) {
        await sendWhats(from, "E qual é o *valor* da nota?");
        session.state = "await_value_for_emit";
        return res.sendStatus(200);
      }
    }

    if (session.state === "await_value_for_emit") {
      const v = extractValueBRL(text);
      if (v == null) {
        await sendWhats(
          from,
          "Não reconheci o valor. Pode mandar no formato *350* ou *R$ 350,00*?"
        );
        return res.sendStatus(200);
      }
      session.data.valor = v;
      if (!session.data.descricao) {
        await sendWhats(from, "Beleza! Agora me diga a *descrição* que vai na nota.");
        session.state = "await_desc_for_emit";
        return res.sendStatus(200);
      }
    }

    if (session.state === "await_desc_for_emit") {
      session.data.descricao = text.trim();
      await sendWhats(
        from,
        msg.emitSummary({
          cliente: session.data.cliente,
          valor: session.data.valor,
          descricao: session.data.descricao,
        })
      );
      session.state = "await_emit_confirm";
      return res.sendStatus(200);
    }

    // CANCELAR
    if (intent === "cancelar_nota") {
      await sendWhats(
        from,
        "Para *cancelar*, pode me dizer o *número da nota* ou o *nome do seu cliente*?"
      );
      session.state = "await_cancel_ident";
      return res.sendStatus(200);
    }
    if (session.state === "await_cancel_ident") {
      await sendWhats(
        from,
        "Encontrei a nota nº 10 da *Maria da Silva*. Confirma o *cancelamento*? (SIM/NÃO)"
      );
      session.state = "await_cancel_confirm";
      return res.sendStatus(200);
    }
    if (session.state === "await_cancel_confirm") {
      if (low.includes("sim")) {
        await sendWhats(from, "Nota cancelada com sucesso. Precisa de mais alguma coisa?");
        sessions.set(from, { state: "idle", data: {} });
        return res.sendStatus(200);
      }
      if (low.includes("nao") || low.includes("não")) {
        await sendWhats(from, "Beleza, não cancelei. Posso ajudar com mais algo?");
        sessions.set(from, { state: "idle", data: {} });
        return res.sendStatus(200);
      }
    }

    // ENVIAR NOTA POR E-MAIL
    if (intent === "enviar_nota_email" || intent === "enviar_nota_email_ask_email") {
      await sendWhats(
        from,
        "Para *enviar* uma nota por e-mail, me diga o *número*, o *valor* ou o *nome do cliente* para eu localizar."
      );
      session.state = "await_send_ident";
      return res.sendStatus(200);
    }
    if (session.state === "await_send_ident") {
      await sendWhats(
        from,
        "Achei uma nota emitida para *Livance* em *10/2025* no valor de *R$ 7.000,00*.\nÉ *essa nota* que você está se referindo? (SIM/NÃO)"
      );
      session.state = "await_send_is_this_one";
      return res.sendStatus(200);
    }
    if (session.state === "await_send_is_this_one") {
      if (low.includes("sim")) {
        const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (emailMatch) {
          session.data.email = emailMatch[0];
          await sendWhats(
            from,
            `Confirma o envio da nota para *${session.data.email}*? (SIM/NÃO)`
          );
          session.state = "await_send_email_confirm";
          return res.sendStatus(200);
        } else {
          await sendWhats(from, "Pra qual e-mail você deseja que eu envie essa nota?");
          session.state = "await_send_email_input";
          return res.sendStatus(200);
        }
      } else if (low.includes("nao") || low.includes("não")) {
        await sendWhats(
          from,
          "Opa! Então preciso de um pouco mais de informação para identificar a nota.\nPode me dizer o *número*, o *valor* ou o *nome do cliente*?"
        );
        session.state = "await_send_ident";
        return res.sendStatus(200);
      }
    }
    if (session.state === "await_send_email_input") {
      const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      if (!emailMatch) {
        await sendWhats(from, "Não reconheci um e-mail válido. Pode enviar de novo?");
        return res.sendStatus(200);
      }
      session.data.email = emailMatch[0];
      await sendWhats(
        from,
        `Confirma o envio da nota para *${session.data.email}*? (SIM/NÃO)`
      );
      session.state = "await_send_email_confirm";
      return res.sendStatus(200);
    }

    // Genéricas
    if (intent === "nota_sem_verbo") {
      await sendWhats(from, msg.askWhatToDo());
      return res.sendStatus(200);
    }
    if (intent === "ambigua") {
      await sendWhats(from, msg.notSure());
      return res.sendStatus(200);
    }

    await sendWhats(from, msg.askWhatToDo());
    return res.sendStatus(200);
  } catch (err) {
    console.error("[webhook error]", err);
    // Nunca derruba o processo por erro de entrada
    return res.sendStatus(200);
  }
});

// --- Status Callback para ver entrega no log ---
router.post("/status", (req, res) => {
  const sid = req.body.MessageSid;
  const status = req.body.MessageStatus; // queued, sent, delivered, undelivered, failed
  const errorCode = req.body.ErrorCode;  // se houver
  console.log("[status]", { sid, status, errorCode });
  res.sendStatus(200);
}
});

module.exports = router;
