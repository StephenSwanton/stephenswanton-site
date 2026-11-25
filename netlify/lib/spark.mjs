// Server-side helper for the Spark API (Flexmls IDX feed).
// The access token lives only in the Netlify environment variable SPARK_ACCESS_TOKEN.

const BASES = [
  process.env.SPARK_API_BASE,
  "https://sparkapi.com/v1",
  "https://replication.sparkapi.com/v1",
].filter(Boolean);

export const AGENT_ID = process.env.SPARK_AGENT_ID || "20190326190452234227000000"; // Stephen Swanton
export const RENTAL_TYPES = ["S", "T"];

let workingBase = null;
let systemCache = null;

export async function spark(path, params = {}) {
  const token = process.env.SPARK_ACCESS_TOKEN;
  if (!token) throw new Error("SPARK_ACCESS_TOKEN is not set");
  const qs = new URLSearchParams(params).toString();
  const bases = workingBase ? [workingBase] : BASES;
  let lastErr;
  for (const base of bases) {
    const res = await fetch(`${base}${path}${qs ? "?" + qs : ""}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-SparkApi-User-Agent": "StephenSwantonRealtor/1.0",
        Accept: "application/json",
      },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.D?.Success !== false) {
      workingBase = base;
      return body.D;
    }
    lastErr = new Error(`Spark ${res.status} at ${base}: ${body?.D?.Message || res.statusText}`);
  }
  throw lastErr;
}

// Finds the MLS-provided IDX disclaimer and logo, wherever the system resource puts them.
export async function system() {
  if (systemCache) return systemCache;
  const out = { disclaimer: "", logo: "", mlsName: "" };
  try {
    const d = await spark("/system");
    const walk = (o) => {
      if (!o || typeof o !== "object") return;
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === "string") {
          if (/disclaimer/i.test(k) && v.length > out.disclaimer.length) out.disclaimer = v;
          if (/^idxlogo$/i.test(k) && !out.logo) out.logo = v;
          if (k === "Name" && !out.mlsName) out.mlsName = v;
        } else walk(v);
      }
    };
    walk(d?.Results?.[0]);
  } catch {}
  systemCache = out;
  return out;
}

export function photoUrl(p, size = "large") {
  if (!p) return "";
  const order = size === "large"
    ? ["Uri1600", "Uri1280", "Uri1024", "UriLarge", "Uri800", "Uri640", "Uri300"]
    : ["Uri800", "Uri1024", "Uri640", "UriLarge", "Uri300"];
  for (const k of order) if (p[k]) return p[k];
  return "";
}

export function card(r) {
  const f = r.StandardFields || {};
  const photo = (f.Photos || []).find((p) => p.Primary) || (f.Photos || [])[0];
  return {
    key: r.Id,
    mls: f.ListingId,
    address: f.UnparsedAddress,
    subdivision: f.SubdivisionName && f.SubdivisionName !== "********" ? f.SubdivisionName : "",
    price: f.ListPrice,
    status: f.MlsStatus,
    type: f.PropertyType,
    typeLabel: f.PropertyTypeLabel,
    beds: f.BedsTotal ?? null,
    baths: f.BathsTotal ?? null,
    sqft: f.BuildingAreaTotal ?? null,
    acres: f.LotSizeAcres ?? null,
    office: f.ListOfficeName,
    updated: f.ListingUpdateTimestamp || f.ModificationTimestamp,
    mine: f.ListAgentId === AGENT_ID || f.CoListAgentId === AGENT_ID,
    rental: RENTAL_TYPES.includes(f.PropertyType),
    photo: photoUrl(photo, "card"),
    photoCount: f.PhotosCount ?? (f.Photos || []).length,
  };
}

export function json(data, status = 200, maxAge = 600) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=120",
      "Netlify-CDN-Cache-Control": status === 200 ? `public, s-maxage=${maxAge}, stale-while-revalidate=3600` : "no-store",
    },
  });
}
