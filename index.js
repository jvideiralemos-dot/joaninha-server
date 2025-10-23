const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const whatsappRoutes = require("./routes/whatsapp");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/assets", express.static(path.join(__dirname, "assets")));

app.get("/", (req, res) => {
  res.json({ ok: true, service: "Joaninha Server v1.2" });
});

app.use("/webhooks/whatsapp", whatsappRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Joaninha Server v1.2 rodando na porta ${PORT}`);
});