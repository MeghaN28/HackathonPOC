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
      "https://api.heygen.com/v1/streaming/token",
    ];
    let lastError = null;
    
    console.log("[heygen_stream_token] Attempting to create token...");
    
    for (const url of endpoints) {
      try {
        console.log("[heygen_stream_token] Trying endpoint:", url);
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
        console.log("[heygen_stream_token] Response status:", resp.status, "Data:", JSON.stringify(data).substring(0, 200));
        
        if (!resp.ok) {
          lastError = { status: resp.status, data, url };
          continue;
        }
        const token = data?.data?.token || data?.data?.access_token || data?.token || data?.access_token;
        if (!token) {
          console.log("[heygen_stream_token] No token found in response");
          lastError = { status: 502, data: { error: "missing token", raw: data }, url };
          continue;
        }
        console.log("[heygen_stream_token] Token obtained successfully");
        return res.status(200).json({ token });
      } catch (inner) {
        console.error("[heygen_stream_token] Fetch error:", inner);
        lastError = { status: 500, data: { message: String(inner) }, url };
      }
    }
    console.error("[heygen_stream_token] All endpoints failed:", lastError);
    return res.status(lastError?.status || 500).json({ error: "HeyGen token error", details: lastError?.data || null, attempted_url: lastError?.url });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("/api/heygen_stream_token error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


