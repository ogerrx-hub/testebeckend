import express from "express";
import session from "express-session";
import cors from "cors";
import WebSocket from "ws";

const app = express();
app.use(cors());
app.use(session({ secret: "segredo", resave: false, saveUninitialized: true }));

const PORT = process.env.PORT || 5000;
const API_TOKEN = process.env.API_TOKEN;

if (!API_TOKEN) {
  console.error("❌ API_TOKEN não definido. Configure a variável de ambiente.");
  process.exit(1);
}

app.get("/", (req, res) => {
  res.send('<h2>Bot Deriv usando API Token ✅<br><a href="/start-bot">Iniciar Bot</a></h2>');
});

app.get("/start-bot", (req, res) => {
  console.log("➡️ Iniciando bot...");

  const ws = new WebSocket("wss://ws.deriv.com/websockets/v3");

  ws.on("open", () => {
    console.log("✅ Conectado ao WebSocket da Deriv");

    // Envia autorização com API Token
    ws.send(JSON.stringify({ authorize: API_TOKEN }));
  });

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    console.log("📩 Mensagem do WS:", data);

    // Se autorizado, enviar ordem de compra
    if (data.msg_type === "authorize") {
      console.log("🔑 Autorizado. Comprando contrato CALL de 1 minuto...");
      ws.send(JSON.stringify({
        buy: 1,
        parameters: {
          contract_type: "CALL",
          symbol: "R_10",
          duration: 1,
          duration_unit: "m",
          amount: 1,
          currency: "USD",
          basis: "stake"
        }
      }));
    }

    // Se compra realizada
    if (data.msg_type === "buy") {
      console.log("🎉 Contrato comprado com sucesso!", data);
      res.json({ status: "Bot iniciado ✅", trade: data });
      ws.close();
    }

    // Se erro retornado pela API
    if (data.error) {
      console.error("❌ Erro do WS:", data.error);
      res.send(`Erro na Deriv: ${data.error.message || JSON.stringify(data.error)}`);
      ws.close();
    }
  });

  ws.on("close", () => {
    console.log("⚠️ Conexão WS fechada.");
  });

  ws.on("error", (err) => {
    console.error("❌ Erro ao conectar com a Deriv WS:", err.message || err);
    res.send("Erro ao conectar com a Deriv WS. Verifique API_TOKEN e rede.");
  });
});

app.listen(PORT, () => console.log(`🚀 Backend rodando na porta ${PORT}`));
