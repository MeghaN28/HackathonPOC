import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY/GOOGLE_API_KEY is not configured" });
  }

  try {
    const { text, max_sentences = 5 } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing 'text' in request body" });
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    const model = new ChatGoogleGenerativeAI({ model: modelName, apiKey: geminiApiKey, temperature: 0.3 });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are a professional podcast scriptwriter. Create a natural, engaging podcast-style summary of the provided content. Write in a conversational tone as if you're speaking directly to listeners. Use complete sentences and natural transitions between ideas. DO NOT use bullet points, asterisks, markdown, or any special formatting. Keep it concise (about ${max_sentences} key points) but flowing like spoken narration. Make it sound human and engaging.`,
      ],
      ["human", "{input}"]
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const summary = await chain.invoke({ input: text });

    return res.status(200).json({ summary: String(summary || "").trim() });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("/api/summarize error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


