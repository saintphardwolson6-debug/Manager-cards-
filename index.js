// index.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch"; // si Node 18+, ka itilize fetch natif

const app = express();
const port = process.env.PORT || 3000;

// 🔒 Middleware
app.use(cors()); // pèmèt frontend fè fetch
app.use(express.json()); // pou JSON body

// 🔑 Kle OpenAI nan variable d'environnement
const OPENAI_KEY = process.env.OPENAI_KEY;
if (!OPENAI_KEY) {
  console.error("⚠️ OPENAI_KEY pa defini nan environment variables!");
}

// 🔹 Route pou repons ChatGPT
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message vide" });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Tu es Tchoulo Assistant, support officiel du jeu Football Manager Ultimate (FMU). Réponds toujours en commençant par "Tchoulo:" et de façon naturelle.`,
          },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Erreur de réponse OpenAI";
    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.listen(port, () => {
  console.log(`Backend Tchoulo Assistant démarré sur le port ${port}`);
});