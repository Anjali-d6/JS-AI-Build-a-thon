// server.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AzureOpenAI } from "openai";
import { isUnexpected } from "@azure-rest/ai-inference";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

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

// File system and PDF settings
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const pdfPath = path.join(projectRoot, 'data/employee_handbook.pdf'); // Change this path if needed

// PDF Loading and Chunking
let pdfText = null;
let pdfChunks = [];
const CHUNK_SIZE = 800;

async function loadPDF() {
  if (pdfText) return pdfText;
  if (!fs.existsSync(pdfPath)) return "PDF not found.";
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  pdfText = data.text;

  let currentChunk = "";
  const words = pdfText.split(/\s+/);
  for (const word of words) {
    if ((currentChunk + " " + word).length <= CHUNK_SIZE) {
      currentChunk += (currentChunk ? " " : "") + word;
    } else {
      pdfChunks.push(currentChunk);
      currentChunk = word;
    }
  }
  if (currentChunk) pdfChunks.push(currentChunk);
  return pdfText;
}

function retrieveRelevantContent(query) {
  const queryTerms = query.toLowerCase().split(/\s+/)
    .filter(term => term.length > 3)
    .map(term => term.replace(/[.,?!;:()"']/g, ""));

  if (queryTerms.length === 0) return [];

  const scoredChunks = pdfChunks.map(chunk => {
    const chunkLower = chunk.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      const regex = new RegExp(term, 'gi');
      const matches = chunkLower.match(regex);
      if (matches) score += matches.length;
    }
    return { chunk, score };
  });

  return scoredChunks
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.chunk);
}

// Chat endpoint with RAG option
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  const useRAG = req.body.useRAG === undefined ? true : req.body.useRAG;

  let messages = [];
  let sources = [];

  if (useRAG) {
    await loadPDF();
    sources = retrieveRelevantContent(userMessage);
    if (sources.length > 0) {
      messages.push({
        role: "system",
        content: `You are a helpful assistant answering questions about the company based on its employee handbook.
Use ONLY the following information from the handbook to answer the user's question.
If you can't find relevant information in the provided context, say so clearly.
--- EMPLOYEE HANDBOOK EXCERPTS ---
${sources.join('')}
--- END OF EXCERPTS ---`
      });
    } else {
      messages.push({
        role: "system",
        content: "You are a helpful assistant. No relevant information was found in the employee handbook for this question."
      });
    }
  } else {
    messages.push({
      role: "system",
      content: "You are a helpful assistant."
    });
  }

  messages.push({ role: "user", content: userMessage });

  try {
    const response = await client.chat.completions.create({
      messages,
      model: deployment,
      max_tokens: 4096,
      temperature: 1,
      top_p: 1,
    });


    res.json({
      reply: response.choices[0].message.content,
      sources: useRAG ? sources : []
    });
  } catch (err) {
    console.error("Azure OpenAI error:", err);
    res.status(500).json({ error: "Model call failed", message: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI API server running on port ${PORT}`);
});
