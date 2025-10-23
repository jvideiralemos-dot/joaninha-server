// routes/whatsapp.js
const express = require("express");
const router = express.Router();

// rota de teste (depois substituímos pelo fluxo real)
router.post("/", (req, res) => {
  console.log("Mensagem recebida:", req.body);
  res.status(200).send("Mensagem processada com sucesso!");
});

module.exports = router;

