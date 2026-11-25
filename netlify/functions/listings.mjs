import { spark, system, card, json, AGENT_ID, RENTAL_TYPES } from "../lib/spark.mjs";

const SELECT = [
  "ListingId", "UnparsedAddress", "SubdivisionName", "ListPrice", "MlsStatus", "PropertyType",
  "PropertyTypeLabel", "BedsTotal", "BathsTotal", "BuildingAreaTotal", "LotSizeAcres",
  "ListOfficeName", "ListAgentId", "CoListAgentId", "ListingUpdateTimestamp", "ModificationTimestamp",
  "PhotosCount",
].join(",");

const SORTS = { newest: "-OnMarketDate", "price-asc": "+ListPrice", "price-desc": "-ListPrice" };
const num = (v) => (v && /^\d+(\.\d+)?$/.test(v) ? Number(v) : null);

export default async (req) => {
  const u = new URL(req.url).searchParams;
  const mode = ["featured", "sale", "rent"].includes(u.get("mode")) ? u.get("mode") : "sale";
  const page = Math.min(Math.max(num(u.get("page")) || 1, 1), 50);
  const limit = mode === "featured" ? 25 : 24;

  const clauses = ["City Eq 'St. Croix'"];
  if (mode === "featured") {
    clauses.push("MlsStatus Eq 'Active'");
    clauses.push(`(ListAgentId Eq '${AGENT_ID}' Or CoListAgentId Eq '${AGENT_ID}')`);
    for (const t of RENTAL_TYPES) clauses.push(`PropertyType Ne '${t}'`);
  } else {
    clauses.push("(MlsStatus Eq 'Active' Or MlsStatus Eq 'Pending')");
    if (mode === "rent") clauses.push(`(${RENTAL_TYPES.map((t) => `PropertyType Eq '${t}'`).join(" Or ")})`);
    else {
      const type = u.get("type");
      if (type && /^[A-Z][0-9]?$/.test(type) && !RENTAL_TYPES.includes(type)) clauses.push(`PropertyType Eq '${type}'`);
      else for (const t of RENTAL_TYPES) clauses.push(`PropertyType Ne '${t}'`);
    }
    const min = num(u.get("min")), max = num(u.get("max")), beds = num(u.get("beds"));
    if (min) clauses.push(`ListPrice Ge ${min}`);
    if (max) clauses.push(`ListPrice Le ${max}`);
    if (beds) clauses.push(`BedsTotal Ge ${beds}`);
  }

  try {
    const d = await spark("/listings", {
      _filter: clauses.join(" And "),
      _select: SELECT,
      _expand: "PrimaryPhoto",
      _orderby: mode === "featured" ? "-ListPrice" : SORTS[u.get("sort")] || SORTS.newest,
      _limit: String(limit),
      _page: String(page),
      _pagination: "1",
    });
    let results = (d.Results || []).map(card);
    if (mode === "featured") {
      const seen = new Set();
      results = results.filter((r) => { const k = (r.address || "").toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    }
    const sys = await system();
    return json({
      results,
      total: d.Pagination?.TotalRows ?? results.length,
      page,
      pages: d.Pagination?.TotalPages ?? 1,
      disclaimer: sys.disclaimer,
      idxLogo: sys.logo,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Listings are temporarily unavailable." }, 502);
  }
};

export const config = { path: "/api/listings" };
