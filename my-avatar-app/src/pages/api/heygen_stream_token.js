export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const heygenApiKey = process.env.HEYGEN_API_KEY;
  if (!heygenApiKey) {
    return res.status(500).json({ error: "HEYGEN_API_KEY is not configured" });
  }

  try {
    const endpoints = [
      "https://api.heygen.com/v1/streaming.create_token",
      "https://api.heygen.com/v1/streaming/token.create",
      "https://api.heygen.com/v1/streaming/token",
    ];
    let lastError = null;
    for (const url of endpoints) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Api-Key": heygenApiKey,
          },
          body: JSON.stringify({}),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          lastError = { status: resp.status, data };
          continue;
        }
        const token = data?.data?.token || data?.data?.client_token || data?.token || data?.client_token;
        if (!token) {
          lastError = { status: 502, data: { error: "missing token", raw: data } };
          continue;
        }
        return res.status(200).json({ token });
      } catch (inner) {
        lastError = { status: 500, data: { message: String(inner) } };
      }
    }
    return res.status(lastError?.status || 500).json({ error: "HeyGen token error", details: lastError?.data || null });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("/api/heygen_stream_token error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


