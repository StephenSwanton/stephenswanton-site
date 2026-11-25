import { spark, system, card, json, photoUrl } from "../lib/spark.mjs";

export default async (req) => {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^\d{10,32}$/.test(id)) return json({ error: "Not found" }, 404);
  try {
    const d = await spark(`/listings/${id}`, { _expand: "Photos,VirtualTours" });
    const r = d.Results?.[0];
    const f = r?.StandardFields;
    if (!f || f.City !== "St. Croix") return json({ error: "Not found" }, 404);
    const sys = await system();
    const clean = (v) => (typeof v === "string" && /^\*+$/.test(v) ? "" : v);
    return json({
      ...card(r),
      remarks: clean(f.PublicRemarks) || "",
      yearBuilt: clean(f.YearBuilt) || null,
      daysOnMarket: f.DaysOnMarket ?? null,
      lat: f.Latitude ?? null,
      lng: f.Longitude ?? null,
      tours: (f.VirtualTours || []).map((t) => t.Uri).filter(Boolean),
      photos: (f.Photos || []).map((p) => ({ src: photoUrl(p, "large"), thumb: photoUrl(p, "card"), caption: p.Caption || "" })).filter((p) => p.src),
      disclaimer: sys.disclaimer,
      idxLogo: sys.logo,
    }, 200, 900);
  } catch (e) {
    console.error(e);
    return json({ error: "This listing is temporarily unavailable." }, 502);
  }
};

export const config = { path: "/api/listing" };
