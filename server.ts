import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy-loaded Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required to execute AI tasks.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// RESTful API endpoints for historical/literary text processing
app.post("/api/ai/punctuate", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required and must be a string." });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `你是一个精通中国古籍、文献学与训诂学的助手。
请对输入的古籍文本进行智能句读并润色。
具体要求：
1. 分析文本并在适当的断句处添加现代标点符号。
2. 将文本拆分为一个无标点的句子数组（即“句读”分句），用于在传统垂直排版中在其右侧添加句读红圈。
3. 提供对文本的一些字词或背景概要解释（作为简要导读）。

输入文本：
"${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            punctuatedText: {
              type: Type.STRING,
              description: "添加了完整现代标点符号的古籍文本"
            },
            sentences: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "不带标点的单句数组，每句为一节古籍原本文字，用于前端点红圈句读"
            },
            intro: {
              type: Type.STRING,
              description: "简短的书籍导读或大意概要解说，用于向读者介绍"
            }
          },
          required: ["punctuatedText", "sentences", "intro"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Received empty response from Gemini.");
    }
    
    // Clean up potential markdown formatting from Gemini
    const cleanText = resultText.replace(/^```json/g, "").replace(/```$/g, "").trim();

    try {
      res.json(JSON.parse(cleanText));
    } catch (e) {
      console.error("JSON parse error:", e, "Raw output:", resultText);
      throw new Error("模型返回了无法解析的格式：" + resultText.substring(0, 50));
    }
  } catch (err: any) {
    console.error("Punctuation error:", err);
    res.status(500).json({ error: err.message || "Failed to punctuate content." });
  }
});

app.post("/api/ai/translate", async (req: Request, res: Response) => {
  try {
    const { text, direction } = req.body; // direction can be 'modernToClassical' or 'classicalToModern'
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required and must be a string." });
      return;
    }

    const isToClassical = direction === "modernToClassical";
    const ai = getGeminiClient();
    const prompt = isToClassical
      ? `你是一位国学大师、古风文豪。
请将下面输入的白话文翻译为纯正优质、典雅洗练的文言文。
你可以模仿《史记》、《战国策》或唐宋散文的笔法，字句锤炼，言简意赅。

原文白话文：
"${text}"`
      : `你是一个精通中国古代汉语的学者。
请将下面这段古籍文言文翻译为优雅、流畅、保持原意的现代白话文。

文言文原文：
"${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: {
              type: Type.STRING,
              description: "译文主体内容"
            },
            stylisticNote: {
              type: Type.STRING,
              description: "一两句话，简述在翻译或辞藻提炼上的用词考量（例如：运用的典故、句式特点等）"
            }
          },
          required: ["translatedText", "stylisticNote"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Received empty response from Gemini.");
    }

    // Clean up potential markdown formatting from Gemini
    const cleanText = resultText.replace(/^```json/g, "").replace(/```$/g, "").trim();

    try {
      res.json(JSON.parse(cleanText));
    } catch (e) {
      console.error("JSON parse error:", e, "Raw output:", resultText);
      throw new Error("模型返回了无法解析的格式：" + resultText.substring(0, 50));
    }
  } catch (err: any) {
    console.error("Translation error:", err);
    res.status(500).json({ error: err.message || "Failed to translate content." });
  }
});

app.post("/api/ai/annotate", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required and must be a string." });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `你是不等同世俗、见解深刻的古代经史子集批注家（如裴松之、朱熹、脂砚斋等）。
请针对输入的古籍正文，为其智能生成“双行小字夹注（古籍中嵌在正文行间，两排小字用于阐释字词、点睛升华）”。
你需要在输入文本的核心字词、句子之后，插入形如“ ((这里是批注内容)) ”的双括号格式。
不要为太多、太近的字词写注。注释要言简意赅、充满古典学养。
每段话里一般选择 2-4 处最需要注解的词词或分句点睛，将它们标记。

输入文本：
"${text}"

请输出在文章合适地方穿插了双括号注释的新文本，不要输出其他外围文本。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            annotatedText: {
              type: Type.STRING,
              description: "在正文单词或分句后穿插了 ((注解文本)) 的合体文本（注意：请不要改变正文基本文字，仅插入双括号注释）"
            },
            annotationCount: {
              type: Type.INTEGER,
              description: "生成的注释总量"
            }
          },
          required: ["annotatedText"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Received empty response from Gemini.");
    }

    // Clean up potential markdown formatting from Gemini
    const cleanText = resultText.replace(/^```json/g, "").replace(/```$/g, "").trim();

    try {
      res.json(JSON.parse(cleanText));
    } catch (e) {
      console.error("JSON parse error:", e, "Raw output:", resultText);
      throw new Error("模型返回了无法解析的格式：" + resultText.substring(0, 50));
    }
  } catch (err: any) {
    console.error("Annotation error:", err);
    res.status(500).json({ error: err.message || "Failed to annotate content." });
  }
});

// Setup Vite Dev Server / Static Files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
