export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const heygenApiKey = process.env.HEYGEN_API_KEY;
  if (!heygenApiKey) {
    return res.status(500).json({ error: "HEYGEN_API_KEY is not configured" });
  }

  try {
    const url = "https://api.heygen.com/v1/streaming/avatar.list";
    const resp = await fetch(url, {
      headers: {
        "X-Api-Key": heygenApiKey,
        Accept: "application/json",
      },
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(resp.status).json({ error: "HeyGen list error", details: data });
    }
    return res.status(200).json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("/api/streaming_avatars error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


