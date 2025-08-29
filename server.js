import express from "express";
import session from "express-session";
import cors from "cors";
import WebSocket from "ws";

const app = express();
app.use(cors());
app.use(session({ secret: "segredo", resave: false, saveUninitialized: true }));

const PORT = process.env.PORT || 5000;
const API_TOKEN = process.env.API_TOKEN;

app.get("/", (req, res) => {
  res.send('<h2>Bot Deriv usando API Token ✅<br><a href="/start-bot">Iniciar Bot</a></h2>');
});

app.get("/start-bot", (req, res) => {
  if (!API_TOKEN) return res.send("⚠️ API_TOKEN não definido");

  const ws = new WebSocket("wss://ws.deriv.com/websockets/v3");

  ws.on("open", () => {
    console.log("Conectado à Deriv WS");
    ws.send(JSON.stringify({ authorize: API_TOKEN }));
  });

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.msg_type === "authorize") {
      console.log("Autorizado. Comprando contrato...");
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

    if (data.msg_type === "buy") {
      console.log("Contrato comprado:", data);
      res.json({ status: "Bot iniciado ✅", trade: data });
      ws.close();
    }
  });

  ws.on("error", (err) => {
    console.error("Erro WebSocket:", err);
    res.send("Erro ao conectar com a Deriv WS");
  });
});

app.listen(PORT, () => console.log(`🚀 Backend rodando na porta ${PORT}`));
