import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import * as fs from "fs";
import sharp from "sharp";
import "dotenv/config";

const token = process.env.GITHUB_TOKEN;
const endpoint = "https://models.github.ai/inference";
const model = "meta/Llama-4-Maverick-17B-128E-Instruct-FP8";

if (!token) {
  throw new Error("GITHUB_TOKEN environment variable is not set.");
}

export async function main() {
  const imagePath = "js.jpg";
  let resizedBuffer;

  try {
    resizedBuffer = await sharp(imagePath)
      .resize({ width: 200 })        // Resize to smaller width
      .jpeg({ quality: 30 })         // Compress image
      .greyscale()                   // Convert to grayscale (optional)
      .toBuffer();
  } catch (err) {
    console.error("Error processing image:", err);
    return;
  }

  const imageBase64 = resizedBuffer.toString("base64");

  const client = ModelClient(
    endpoint,
    new AzureKeyCredential(token)
  );

  const response = await client.path("/chat/completions").post({
    body: {
      messages: [
        { role: "system", content: "" },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Write HTML and CSS code for a web page based on the following hand-drawn sketch."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.8,
      top_p: 0.1,
      max_tokens: 512,
      model: model
    }
  });

  if (isUnexpected(response)) {
    throw response.body.error;
  }

  console.log(response.body.choices[0].message.content);
}

main().catch((err) => {
  console.error("The script encountered an error:", err);
});
