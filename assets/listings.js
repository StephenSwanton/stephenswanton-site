(function () {
  const FALLBACK_DISCLAIMER = "IDX information is provided exclusively for consumers' personal, non-commercial use and may not be used for any purpose other than to identify prospective properties consumers may be interested in purchasing. Information is deemed reliable but is not guaranteed. Listing data provided by the St. Croix Board of REALTORS® Multiple Listing Service.";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n, rental) => n == null ? "" : "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 }) + (rental ? "/mo" : "");
  const facts = (l) => {
    const out = [];
    if (l.beds) out.push(l.beds + " bd");
    if (l.baths) out.push(+l.baths + " ba");
    if (l.sqft) out.push(Number(l.sqft).toLocaleString() + " sq ft");
    if (l.acres && (!l.beds || l.type === "C1")) out.push(+l.acres + " acres");
    if (!out.length && l.typeLabel) out.push(l.typeLabel);
    return out.join(" · ");
  };
  const fmtDate = (d) => d ? new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/St_Thomas" }) : "";

  function cardHTML(l) {
    const pending = /pending/i.test(l.status || "");
    return `<a class="card" href="/listing?id=${encodeURIComponent(l.key)}">
      <div class="ph">${l.photo ? `<img src="${esc(l.photo)}" alt="${esc(l.address)}" loading="lazy">` : ""}
        ${pending ? `<span class="badge pending">Pending</span>` : ""}
        ${l.mine ? `<span class="badge mine">Stephen's listing</span>` : ""}</div>
      <div class="body">
        <div class="price">${money(l.price, l.rental)}</div>
        <div class="lfacts">${esc(facts(l))}${l.typeLabel && facts(l) !== l.typeLabel ? " · " + esc(l.typeLabel) : ""}</div>
        <div class="addr">${esc(l.address)}</div>
        <div class="courtesy">Listing courtesy of ${esc(l.office || "the listing brokerage")} · MLS ${esc(l.mls)}</div>
      </div></a>`;
  }
  const skeletons = (n) => Array.from({ length: n }, () => `<div class="card skeleton"><div class="ph"></div><div class="body"><div class="price">&nbsp;</div></div></div>`).join("");

  function disclaimerHTML(data, updated) {
    return `${data.idxLogo ? `<img src="${esc(data.idxLogo)}" alt="MLS IDX logo">` : ""}
      <p>${esc(data.disclaimer || FALLBACK_DISCLAIMER)}</p>
      ${updated ? `<p>Listing information last updated ${esc(fmtDate(updated))}.</p>` : ""}`;
  }
  async function get(url) {
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || "Listings are temporarily unavailable.");
    return j;
  }
  const latest = (list) => list.reduce((m, l) => (l.updated && (!m || l.updated > m) ? l.updated : m), null);

  // Featured strip (homepage and search page)
  async function featured(el, limit) {
    el.innerHTML = skeletons(Math.min(limit, 3));
    try {
      const d = await get("/api/listings?mode=featured");
      const list = d.results.slice(0, limit);
      el.innerHTML = list.length ? list.map(cardHTML).join("") : `<div class="empty">New listings coming soon.</div>`;
      const disc = document.querySelector("[data-featured-disclaimer]");
      if (disc) disc.innerHTML = disclaimerHTML(d, latest(list));
    } catch (e) { el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  // Search page
  function search() {
    const grid = document.getElementById("results"), count = document.getElementById("count"), more = document.getElementById("more");
    const form = document.getElementById("filters"), disc = document.getElementById("disclaimer");
    const tabs = document.querySelectorAll(".tabs button");
    let mode = location.hash === "#rentals" ? "rent" : "sale", page = 1, all = [];
    const params = () => {
      const p = new URLSearchParams({ mode, page });
      for (const [k, v] of new FormData(form)) if (v) p.set(k, v);
      return p;
    };
    const syncUI = () => {
      tabs.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === mode)));
      form.querySelector("[name=type]").closest("label").hidden = mode === "rent";
      form.querySelector("[name=beds]").closest("label").hidden = false;
      document.getElementById("featured-block").hidden = mode === "rent";
    };
    async function load(reset) {
      if (reset) { page = 1; all = []; grid.innerHTML = skeletons(6); more.hidden = true; }
      try {
        const d = await get("/api/listings?" + params());
        all = all.concat(d.results);
        grid.innerHTML = all.length ? all.map(cardHTML).join("") : `<div class="empty">No St. Croix listings match those filters. Try widening the price range, or call Stephen at (340) 277-4771.</div>`;
        count.textContent = d.total ? `${d.total.toLocaleString()} ${mode === "rent" ? "rentals" : "properties"} on St. Croix` : "";
        more.hidden = page >= d.pages;
        disc.innerHTML = disclaimerHTML(d, latest(all));
      } catch (e) { grid.innerHTML = `<div class="empty">${esc(e.message)}</div>`; count.textContent = ""; }
    }
    tabs.forEach((b) => b.addEventListener("click", () => { mode = b.dataset.mode; history.replaceState(null, "", mode === "rent" ? "#rentals" : "#"); syncUI(); load(true); }));
    form.addEventListener("change", () => load(true));
    more.querySelector("button").addEventListener("click", () => { page++; load(false); });
    window.addEventListener("hashchange", () => { mode = location.hash === "#rentals" ? "rent" : "sale"; syncUI(); load(true); });
    syncUI(); load(true);
  }

  // Detail page
  async function detail() {
    const root = document.getElementById("listing");
    const id = new URLSearchParams(location.search).get("id");
    try {
      const l = await get("/api/listing?id=" + encodeURIComponent(id || ""));
      document.title = `${l.address} | Stephen Swanton, St. Croix Real Estate`;
      const pending = /pending/i.test(l.status || "");
      const spec = [
        ["Price", money(l.price, l.rental)], ["Bedrooms", l.beds], ["Bathrooms", l.baths && +l.baths],
        ["Living area", l.sqft && Number(l.sqft).toLocaleString() + " sq ft"], ["Lot", l.acres && +l.acres + " acres"],
        ["Type", l.typeLabel], ["Year built", l.yearBuilt], ["Status", l.status], ["MLS #", l.mls],
      ].filter(([, v]) => v);
      const subject = encodeURIComponent(`Inquiry: ${l.address} (MLS ${l.mls})`);
      root.innerHTML = `
        <div class="gallery">
          <div class="main">${l.photos[0] ? `<img id="gimg" src="${esc(l.photos[0].src)}" alt="${esc(l.address)}">` : ""}
            ${l.photos.length > 1 ? `<button class="nav prev" aria-label="Previous photo">&#8249;</button><button class="nav next" aria-label="Next photo">&#8250;</button><span class="pos" id="gpos">1 / ${l.photos.length}</span>` : ""}
            ${pending ? `<span class="badge pending">Pending</span>` : ""}${l.mine ? `<span class="badge mine">Stephen's listing</span>` : ""}</div>
          ${l.photos.length > 1 ? `<div class="thumbs">${l.photos.map((p, i) => `<button data-i="${i}" ${i ? "" : 'aria-current="true"'} aria-label="Photo ${i + 1}"><img src="${esc(p.thumb || p.src)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
        </div>
        <div class="detail">
          <div>
            <div class="eyebrow">${esc(l.typeLabel || "")}${l.subdivision ? " · " + esc(l.subdivision) : ""}</div>
            <h1>${esc(l.address)}</h1>
            <div class="price">${money(l.price, l.rental)}</div>
            <div class="spec">${spec.map(([k, v]) => `<div>${esc(k)}<strong>${esc(v)}</strong></div>`).join("")}</div>
            ${l.remarks ? `<h2 style="font-size:1.3rem;color:var(--cb-blue);margin-bottom:8px">About this property</h2><p class="remarks">${esc(l.remarks)}</p>` : ""}
            ${l.tours.length ? `<p style="margin-top:16px"><a href="${esc(l.tours[0])}" target="_blank" rel="noopener">View virtual tour</a></p>` : ""}
            <p class="courtesy" style="margin-top:22px;font-size:.85rem">Listing courtesy of ${esc(l.office || "the listing brokerage")}.</p>
          </div>
          <aside><div class="ask">
            <h3>${l.mine ? "Ask Stephen about his listing" : "Interested in this property?"}</h3>
            <p>Stephen can answer questions, pull the full disclosure package and set up a showing.</p>
            <a class="btn btn-primary" href="tel:+13402774771">Call or text (340) 277-4771</a>
            <a class="btn btn-outline" href="mailto:Stephen@ColdwellBankerVI.com?subject=${subject}">Email Stephen</a>
            <a class="btn btn-outline" href="/buy">Start a buyer inquiry</a>
          </div></aside>
        </div>
        <div class="disclaimer">${disclaimerHTML(l, l.updated)}</div>`;
      if (l.photos.length > 1) {
        let i = 0;
        const img = document.getElementById("gimg"), pos = document.getElementById("gpos"), thumbs = root.querySelectorAll(".thumbs button");
        const show = (n) => { i = (n + l.photos.length) % l.photos.length; img.src = l.photos[i].src; pos.textContent = `${i + 1} / ${l.photos.length}`; thumbs.forEach((t, k) => t.setAttribute("aria-current", String(k === i))); thumbs[i].scrollIntoView({ block: "nearest", inline: "nearest" }); };
        root.querySelector(".prev").onclick = () => show(i - 1);
        root.querySelector(".next").onclick = () => show(i + 1);
        thumbs.forEach((t) => (t.onclick = () => show(+t.dataset.i)));
        document.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") show(i - 1); if (e.key === "ArrowRight") show(i + 1); });
      }
    } catch (e) {
      root.innerHTML = `<div class="empty">This listing is no longer available. <a href="/listings">Search current St. Croix listings</a>.</div>`;
    }
  }

  window.SSListings = { featured, search, detail };
})();
