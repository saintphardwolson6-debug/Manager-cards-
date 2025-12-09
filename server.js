import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config(); // li .env

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post("/ask", async (req, res) => {
    const { message } = req.body;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `Tu es Tchoulo Assistant, expert du jeu FOOTBALL MANAGER ULTIMATE, qui répond toujours comme un humain et commence par "Tchoulo:"`
                    },
                    { role: "user", content: message }
                ]
            })
        });

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content || "Tchoulo: Je n'ai pas compris.";

        res.json({ answer });

    } catch (err) {
        console.error(err);
        res.status(500).json({ answer: "⚠️ Tchoulo: Le serveur a rencontré une erreur." });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));