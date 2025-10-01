import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, avatar_id: bodyAvatarId, voice_id: bodyVoiceId } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' in request body" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const heygenApiKey = process.env.HEYGEN_API_KEY;

    if (!geminiApiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY/GOOGLE_API_KEY is not configured" });
    }
    if (!heygenApiKey) {
      return res.status(500).json({ error: "HEYGEN_API_KEY is not configured" });
    }

    const avatarId = bodyAvatarId || process.env.HEYGEN_AVATAR_ID;
    const voiceId = bodyVoiceId || process.env.HEYGEN_VOICE_ID;
    if (!avatarId || !voiceId) {
      return res.status(400).json({ error: "avatar_id and voice_id must be provided (in body or env)" });
    }

    // Prefer a currently supported alias; allow env override
    const primaryModelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    let model = new ChatGoogleGenerativeAI({
      model: primaryModelName,
      apiKey: geminiApiKey,
      temperature: 0.7,
    });

    let replyText;
    try {
      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          [
            "You are a friendly expert barista named Sunny working at a modern cafe.",
            "Your goals:",
            "- Greet warmly and keep responses concise (1-4 sentences).",
            "- Ask 1 clarifying question if the order or preferences are ambiguous.",
            "- Recommend drinks with short reasons (taste, caffeine level, temperature, sweetness).",
            "- Offer size, milk (dairy/oat/almond/soy), sweetness level, and decaf options when relevant.",
            "- Never mention that you are an AI or large language model.",
            "",
            "Menu examples (not exhaustive):",
            "- Espresso, Americano, Cappuccino, Latte, Flat White, Mocha, Macchiato",
            "- Cold Brew, Iced Latte, Iced Americano, Iced Matcha Latte",
            "- Teas: English Breakfast, Earl Grey, Green, Chai",
            "- Non-coffee: Matcha Latte, Hot Chocolate",
            "Syrups: Vanilla, Caramel, Hazelnut. Default size: Medium.",
          ].join(" \n"),
        ],
        ["human", "I want something iced and strong."],
        [
          "assistant",
          "How about an Iced Americano for a bold, low-calorie iced option? Medium okay, or would you like a larger size?",
        ],
        ["human", "I prefer something creamy and not too sweet."],
        [
          "assistant",
          "A Flat White is smooth and creamy with balanced espresso—would you like dairy or oat milk, and should I keep it unsweetened?",
        ],
        ["human", "{message}"],
      ]);

      const chain = prompt.pipe(model).pipe(new StringOutputParser());
      replyText = await chain.invoke({ message });
    } catch (err) {
      const errMsg = String(err?.message || err);
      const isNotFound = errMsg.includes("404") || errMsg.toLowerCase().includes("not found");
      if (isNotFound) {
        try {
          model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash-001",
            apiKey: geminiApiKey,
            temperature: 0.7,
          });
          const prompt = ChatPromptTemplate.fromMessages([
            [
              "system",
              [
                "You are a friendly expert barista named Sunny working at a modern cafe.",
                "Your goals:",
                "- Greet warmly and keep responses concise (1-4 sentences).",
                "- Ask 1 clarifying question if the order or preferences are ambiguous.",
                "- Recommend drinks with short reasons (taste, caffeine level, temperature, sweetness).",
                "- Offer size, milk (dairy/oat/almond/soy), sweetness level, and decaf options when relevant.",
                "- Never mention that you are an AI or large language model.",
                "",
                "Menu examples (not exhaustive):",
                "- Espresso, Americano, Cappuccino, Latte, Flat White, Mocha, Macchiato",
                "- Cold Brew, Iced Latte, Iced Americano, Iced Matcha Latte",
                "- Teas: English Breakfast, Earl Grey, Green, Chai",
                "- Non-coffee: Matcha Latte, Hot Chocolate",
                "Syrups: Vanilla, Caramel, Hazelnut. Default size: Medium.",
              ].join(" \n"),
            ],
            ["human", "I want something iced and strong."],
            [
              "assistant",
              "How about an Iced Americano for a bold, low-calorie iced option? Medium okay, or would you like a larger size?",
            ],
            ["human", "I prefer something creamy and not too sweet."],
            [
              "assistant",
              "A Flat White is smooth and creamy with balanced espresso—would you like dairy or oat milk, and should I keep it unsweetened?",
            ],
            ["human", "{message}"],
          ]);
          const chain = prompt.pipe(model).pipe(new StringOutputParser());
          replyText = await chain.invoke({ message });
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      } else {
        throw err;
      }
    }
    if (!replyText) {
      replyText = "I'm sorry, I couldn't generate a response.";
    }

    const limitedText = String(replyText).trim().slice(0, 800);

    const heygenResp = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": heygenApiKey,
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: avatarId,
              avatar_style: "normal",
            },
            voice: {
              type: "text",
              voice_id: voiceId,
              input_text: limitedText,
            },
          },
        ],
        // Use a plan-friendly resolution; fallback to 720p if needed
        dimension: {
          width: 720,
          height: 1280,
        },
      }),
    });

    const heygenData = await heygenResp.json().catch(() => ({}));
    if (!heygenResp.ok) {
      return res.status(heygenResp.status).json({
        error: "HeyGen API error",
        details: heygenData,
      });
    }

    const videoId = heygenData?.data?.video_id || heygenData?.video_id;
    if (!videoId) {
      return res.status(502).json({ error: "Missing video_id in HeyGen response", details: heygenData });
    }

    return res.status(200).json({ video_id: videoId, reply_text: replyText });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("/api/chat error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


