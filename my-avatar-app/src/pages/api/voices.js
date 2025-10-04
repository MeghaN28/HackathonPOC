export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const heygenApiKey = process.env.HEYGEN_API_KEY;
  if (!heygenApiKey) {
    return res.status(500).json({ error: "HEYGEN_API_KEY is not configured" });
  }

  const url = "https://api.heygen.com/v2/voices?page=1&page_size=2";

  try {
    console.log("[voices] Fetching from HeyGen API:", url);
    const resp = await fetch(url, { headers: { "X-Api-Key": heygenApiKey, Accept: "application/json" } });
    const data = await resp.json().catch(() => ({}));
    console.log("[voices] HeyGen response status:", resp.status, "Data:", JSON.stringify(data).substring(0, 200));
    if (!resp.ok) {
      console.error("[voices] HeyGen API error:", resp.status, data);
      return res.status(resp.status).json({ error: "HeyGen voices list error", details: data });
    }
    const raw = Array.isArray(data?.data?.voices)
      ? data.data.voices
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.voices)
      ? data.voices
      : Array.isArray(data)
      ? data
      : [];
    const simplified = raw.map((v) => {
      const id = v?.voice_id || v?.id || v?.voiceId || v?.uuid || "";
      const name = v?.name || v?.display_name || id;
      return { voice_id: String(id), name: String(name) };
    });
    console.log("[voices] Returning", simplified.length, "voices:", JSON.stringify(simplified));
    return res.status(200).json({ data: simplified.slice(0, 2) });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("/api/voices error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


