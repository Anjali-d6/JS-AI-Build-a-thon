import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AzureOpenAI } from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Azure OpenAI Config
const endpoint = process.env.AZURE_INFERENCE_SDK_ENDPOINT;
const apiKey = process.env.AZURE_INFERENCE_SDK_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const apiVersion = "2024-04-01-preview";

const client = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  const messages = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: userMessage },
  ];

  try {
    const response = await client.chat.completions.create({
      messages,
      model: deployment,
      max_tokens: 4096,
      temperature: 1,
      top_p: 1,
    });

    const reply = response.choices?.[0]?.message?.content || "No response from model.";
    res.json({ reply });
  } catch (err) {
    console.error("Azure OpenAI error:", err);
    res.status(500).json({ error: "Model call failed" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI API server running on port ${PORT}`);
});
