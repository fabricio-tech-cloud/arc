export type SupplementCatalogEntry = {
  id: string;
  name: string;
  dose: string;
  effect: string;
  nutrition: string;
  category: string;
  imageFile: string;
};

export function supplementImageSrc(imageFile: string) {
  return `/supplements/${encodeURIComponent(imageFile)}`;
}

/** Static product catalog — images live in `public/supplements/`. */
export const SUPPLEMENT_CATALOG: SupplementCatalogEntry[] = [
  {
    id: "creatine-monohydrate",
    name: "Creatine Monohydrate Powder",
    dose: "5 g",
    effect: "Mehr Kraft & Leistung bei hochintensiven Sätzen, bessere Wiederholungsqualität.",
    nutrition: "pro Portion: 5 g Creatine Monohydrat · 0 kcal · 0 g Protein/Fett/KH",
    category: "Leistung",
    imageFile: "Creatine Monohydrate Powder.webp",
  },
  {
    id: "creapure",
    name: "Creapure",
    dose: "5 g",
    effect: "Hochreines Creatin (Creapure®) für Kraft, Sprintleistung und Muskelvolumen.",
    nutrition: "pro Portion: 5 g Creatine Monohydrat (Creapure®) · 0 kcal",
    category: "Leistung",
    imageFile: "creapure.webp",
  },
  {
    id: "pure-whey-protein",
    name: "Pure Whey Protein",
    dose: "25–30 g",
    effect: "Schnelle Proteinzufuhr nach dem Training — Aufbau und Recovery.",
    nutrition: "pro 30 g: ~23 g Protein · ~2 g KH · ~1,5 g Fett · ~110 kcal",
    category: "Protein",
    imageFile: "Pure Whey Protein.webp",
  },
  {
    id: "pure-whey-isolate",
    name: "Pure Whey Isolate",
    dose: "25–30 g",
    effect: "Sehr proteinreich, wenig Laktose/Fett — ideal post-workout oder diätnah.",
    nutrition: "pro 30 g: ~27 g Protein · ~1 g KH · ~0,5 g Fett · ~110 kcal",
    category: "Protein",
    imageFile: "Pure Whey Isolate.webp",
  },
  {
    id: "micellar-casein",
    name: "Micellar Casein",
    dose: "30–40 g",
    effect: "Langsame Proteinabgabe — gut abends oder bei längeren Pausen ohne Essen.",
    nutrition: "pro 35 g: ~26 g Protein · ~3 g KH · ~1 g Fett · ~125 kcal",
    category: "Protein",
    imageFile: "Micellar Casein.webp",
  },
  {
    id: "eaa",
    name: "Essential Amino Acids (EAA)",
    dose: "10–15 g",
    effect: "Alle essenziellen Aminosäuren — Muskelschutz bei Defizit oder Intra-Workout.",
    nutrition: "pro Portion: ~10–15 g EAAs · 0–10 kcal · kein Fett/KH",
    category: "Aminosäuren",
    imageFile: "Essentiall Amino Acids EAA.webp",
  },
  {
    id: "glutamine-peptide",
    name: "Glutamine Peptide",
    dose: "5–10 g",
    effect: "Unterstützt Recovery und Darmbarriere, besonders bei hartem Training.",
    nutrition: "pro Portion: 5–10 g L-Glutamin (Peptid) · 0 kcal",
    category: "Aminosäuren",
    imageFile: "Glutamine Peptide.webp",
  },
  {
    id: "omega-3",
    name: "Super Strength Omega 3",
    dose: "1–2 Kapseln",
    effect: "EPA/DHA für Entzündungsregulation, Gelenke und Herz-Kreislauf.",
    nutrition: "pro Kapsel: typ. 1000 mg Fischöl · hoher EPA + DHA-Anteil",
    category: "Fette",
    imageFile: "Super Strength Omega 3.webp",
  },
  {
    id: "multivitamin",
    name: "Complete Multivitamin Complex",
    dose: "1 Tablette",
    effect: "Grundversorgung mit Vitaminen & Mineralstoffen bei kalorienarmer Phase.",
    nutrition: "Deckungsgrad variiert je Nährstoff (oft 100 % NRV für Kernvitamine)",
    category: "Vitamine",
    imageFile: "Complete Multivitamin Complex.webp",
  },
  {
    id: "vitamin-d3",
    name: "Vitamin D3",
    dose: "2000–4000 IU",
    effect: "Knochen, Immunsystem, Testosteron-Support — besonders im Winter wichtig.",
    nutrition: "pro Softgel/Kapsel: typ. 1000–4000 IU Cholecalciferol (D3)",
    category: "Vitamine",
    imageFile: "Vitamin D3.webp",
  },
  {
    id: "vitamin-c",
    name: "Vitamin C",
    dose: "500–1000 mg",
    effect: "Antioxidans, Immunsupport und Kollagenbildung (Haut, Sehnen, Bindegewebe).",
    nutrition: "pro Portion: 500–1000 mg Ascorbinsäure · 0 kcal",
    category: "Vitamine",
    imageFile: "Vitamin C.webp",
  },
  {
    id: "optizinc",
    name: "OptiZinc",
    dose: "15–30 mg",
    effect: "Zink für Testosteron, Immunfunktion und Wundheilung — gut mit Essen nehmen.",
    nutrition: "pro Kapsel: typ. 15–30 mg elementares Zink (OptiZinc® / Monomethionin)",
    category: "Mineralien",
    imageFile: "Optizinc.webp",
  },
];

export function findCatalogByName(name: string) {
  const key = name.trim().toLowerCase();
  return SUPPLEMENT_CATALOG.find((s) => s.name.toLowerCase() === key) ?? null;
}

export function findCatalogById(id: string) {
  return SUPPLEMENT_CATALOG.find((s) => s.id === id) ?? null;
}

function normalizeQuery(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Simple edit distance for short typo tolerance. */
function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cur =
        a[i] === b[j] ? row[j]! : 1 + Math.min(row[j]!, row[j + 1]!, prev);
      row[j] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length]!;
}

function scoreCatalogMatch(entry: SupplementCatalogEntry, query: string) {
  const q = normalizeQuery(query);
  if (!q) return 0;
  const name = normalizeQuery(entry.name);
  const hay = normalizeQuery(`${entry.name} ${entry.category} ${entry.effect}`);
  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  if (name.includes(q) || hay.includes(q)) return 75;

  const qTokens = q.split(" ").filter(Boolean);
  const nameTokens = name.split(" ").filter(Boolean);
  let tokenHits = 0;
  for (const qt of qTokens) {
    const hit = nameTokens.some((nt) => {
      if (nt.startsWith(qt) || nt.includes(qt)) return true;
      const maxDist = qt.length <= 4 ? 1 : 2;
      return levenshtein(qt, nt) <= maxDist;
    });
    if (hit) tokenHits += 1;
  }
  if (tokenHits === qTokens.length) return 60 + tokenHits;
  if (tokenHits > 0) return 30 + tokenHits * 5;
  return 0;
}

/** Autocomplete / typo-tolerant suggestions from the catalog. */
export function suggestCatalog(query: string, limit = 6) {
  const q = query.trim();
  if (!q) return SUPPLEMENT_CATALOG.slice(0, limit);
  return SUPPLEMENT_CATALOG.map((entry) => ({
    entry,
    score: scoreCatalogMatch(entry, q),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .slice(0, limit)
    .map((x) => x.entry);
}

/** ISO weekday: 1 = Monday … 7 = Sunday */
export const WEEKDAYS = [
  { value: 1, label: "Mo" },
  { value: 2, label: "Di" },
  { value: 3, label: "Mi" },
  { value: 4, label: "Do" },
  { value: 5, label: "Fr" },
  { value: 6, label: "Sa" },
  { value: 7, label: "So" },
] as const;

export function todayIsoWeekday() {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

export function formatDays(days: number[]) {
  const set = new Set(days);
  return WEEKDAYS.filter((d) => set.has(d.value))
    .map((d) => d.label)
    .join(" ");
}

/** Dose units shown in the Planung unit picker (right side). */
export const DOSE_UNITS = [
  "mg",
  "g",
  "kg",
  "µg",
  "ml",
  "l",
  "IU",
  "Kapseln",
  "Tablette",
  "Tabletten",
  "Scoop",
  "Tropfen",
  "Messlöffel",
] as const;

export type DoseUnit = (typeof DOSE_UNITS)[number];

export function parseDose(value: string | null | undefined): { amount: string; unit: DoseUnit } {
  const raw = (value ?? "").trim();
  if (!raw) return { amount: "", unit: "g" };

  const sorted = [...DOSE_UNITS].sort((a, b) => b.length - a.length);
  for (const unit of sorted) {
    const re = new RegExp(`^(.*?)\\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const m = raw.match(re);
    if (m) {
      return {
        amount: (m[1] ?? "").trim(),
        unit: unit as DoseUnit,
      };
    }
  }

  const parts = raw.split(/\s+/);
  if (parts.length >= 2) {
    return { amount: parts.slice(0, -1).join(" "), unit: "g" };
  }
  return { amount: raw, unit: "g" };
}

export function formatDose(amount: string, unit: string) {
  const a = amount.trim();
  if (!a) return "";
  return `${a} ${unit}`.trim();
}
