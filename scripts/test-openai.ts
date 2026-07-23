import "dotenv/config";
import https from "https";

function embedViaHttps(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const body = JSON.stringify({ model: "text-embedding-3-small", input: texts });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.openai.com",
        path: "/v1/embeddings",
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 120_000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data) as {
              error?: { message: string };
              data?: { index: number; embedding: number[] }[];
            };
            if (parsed.error) reject(new Error(parsed.error.message));
            else if (!parsed.data) reject(new Error(`Unexpected response: ${data.slice(0, 200)}`));
            else
              resolve(
                parsed.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
              );
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("HTTPS request timed out"));
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log("Testing native HTTPS embedding...");
  const r = await embedViaHttps(["hello test"]);
  console.log("OK:", r[0].length);
}

main().catch((e) => console.error("FAIL:", e.message));
