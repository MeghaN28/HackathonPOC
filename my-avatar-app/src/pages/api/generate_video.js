export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const heygenApiKey = process.env.HEYGEN_API_KEY;
  const defaultAvatarId = process.env.HEYGEN_AVATAR_ID;
  const defaultVoiceId = process.env.HEYGEN_VOICE_ID;
  if (!heygenApiKey) {
    return res.status(500).json({ error: "HEYGEN_API_KEY is not configured" });
  }

  try {
    const { text, avatar_id: bodyAvatarId, voice_id: bodyVoiceId } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing 'text' in request body" });
    }
    const avatarId = bodyAvatarId || defaultAvatarId;
    const voiceId = bodyVoiceId || defaultVoiceId;
    if (!avatarId || !voiceId) {
      return res.status(400).json({ error: "avatar_id and voice_id must be provided (in body or env)" });
    }

    const limitedText = String(text).trim().slice(0, 800);

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
        dimension: { width: 720, height: 1280 },
      }),
    });
    const data = await heygenResp.json().catch(() => ({}));
    if (!heygenResp.ok) {
      return res.status(heygenResp.status).json({ error: "HeyGen API error", details: data });
    }
    const videoId = data?.data?.video_id || data?.video_id;
    if (!videoId) {
      return res.status(502).json({ error: "Missing video_id in HeyGen response", details: data });
    }
    return res.status(200).json({ video_id: videoId });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("/api/generate_video error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


