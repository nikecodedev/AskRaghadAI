import { NextResponse } from "next/server";
import { countryToRegion } from "@/lib/region/geo";

function firstForwardedIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "";
  }
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("true-client-ip") ||
    ""
  );
}

function headerCountry(headers: Headers): string | null {
  // Vercel, Cloudflare, and some Hostinger / CDN setups
  const candidates = [
    headers.get("x-vercel-ip-country"),
    headers.get("cf-ipcountry"),
    headers.get("x-country-code"),
    headers.get("cloudfront-viewer-country"),
  ];
  for (const value of candidates) {
    if (value && value !== "XX" && /^[A-Za-z]{2}$/.test(value)) {
      return value.toUpperCase();
    }
  }
  return null;
}

async function lookupIpCountry(ip: string): Promise<string | null> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return null;
  }

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country_code/`, {
      headers: { Accept: "text/plain" },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const code = (await res.text()).trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(code) && code !== "XX") return code;
    }
  } catch {
    // fall through
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as { countryCode?: string };
      const code = data.countryCode?.toUpperCase();
      if (code && /^[A-Z]{2}$/.test(code)) return code;
    }
  } catch {
    // fall through
  }

  return null;
}

export async function GET(request: Request) {
  const headers = request.headers;

  const fromHeader = headerCountry(headers);
  if (fromHeader) {
    return NextResponse.json({
      country: fromHeader,
      region: countryToRegion(fromHeader),
      source: "header",
    });
  }

  const ip = firstForwardedIp(headers);
  const fromIp = await lookupIpCountry(ip);
  if (fromIp) {
    return NextResponse.json({
      country: fromIp,
      region: countryToRegion(fromIp),
      source: "ip",
    });
  }

  return NextResponse.json({
    country: null,
    region: "ksa" as const,
    source: "default",
  });
}
