export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const videoId = req.query.video_id;
  const heygenApiKey = process.env.HEYGEN_API_KEY;
  if (!videoId) {
    return res.status(400).json({ error: "Missing video_id" });
  }
  if (!heygenApiKey) {
    return res.status(500).json({ error: "HEYGEN_API_KEY is not configured" });
  }

  try {
    const url = `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(
      String(videoId)
    )}`;
    const resp = await fetch(url, {
      headers: {
        "X-Api-Key": heygenApiKey,
        "Cache-Control": "no-cache",
      },
    });
    // Force no-store on our response to avoid 304s
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(resp.status).json({ error: "HeyGen status error", details: data });
    }
    return res.status(200).json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("/api/video_status error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


