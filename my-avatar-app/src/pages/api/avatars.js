export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const heygenApiKey = process.env.HEYGEN_API_KEY;
  if (!heygenApiKey) {
    return res.status(500).json({ error: "HEYGEN_API_KEY is not configured" });
  }

  const url = "https://api.heygen.com/v2/avatars?page=1&page_size=3";

  try {
    console.log("[avatars] Fetching from HeyGen API:", url);
    const resp = await fetch(url, { headers: { "X-Api-Key": heygenApiKey, Accept: "application/json" } });
    const data = await resp.json().catch(() => ({}));
    console.log("[avatars] HeyGen response status:", resp.status, "Data:", JSON.stringify(data).substring(0, 200));
    if (!resp.ok) {
      console.error("[avatars] HeyGen API error:", resp.status, data);
      return res.status(resp.status).json({ error: "HeyGen avatars list error", details: data });
    }
    const raw = Array.isArray(data?.data?.avatars)
      ? data.data.avatars
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.avatars)
      ? data.avatars
      : Array.isArray(data)
      ? data
      : [];
    const simplified = raw.map((a) => {
      const id = a?.avatar_id || a?.id || a?.avatarId || a?.uuid || "";
      const name = a?.avatar_name || a?.name || a?.pose_name || a?.display_name || id;
      return { avatar_id: String(id), name: String(name) };
    });
    console.log("[avatars] Returning", simplified.length, "avatars:", JSON.stringify(simplified));
    return res.status(200).json({ data: simplified.slice(0, 3) });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("/api/avatars error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


