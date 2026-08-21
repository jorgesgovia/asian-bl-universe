const axios = require("axios");
const fs = require("fs");

const INPUT = "series-links.json";

function cleanTitle(title) {
  if (!title) return null;

  title = String(title)
    .replace(/\s+/g, " ")
    .replace(/\([^)]*OFFLINE[^)]*\)/gi, "")
    .trim();

  if (!title || title.length < 2) return null;

  const lower = title.toLowerCase();

  const badExact = [
    "view",
    "edit",
    "history",
    "attach",
    "print",
    "search",
    "platform",
    "home page",
    "archive",
    "calendar",
    "support me",
    "twitter",
    "youtube",
    "viki",
    "wetv",
    "iqiyi",
    "gaga",
    "by country",
    "other",
    "attributes"
  ];

  if (badExact.includes(lower)) return null;

  if (/^\d{4}$/.test(title)) return null;

  if (
    /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i.test(title)
  ) {
    return null;
  }

  if (/\bshort\b/i.test(title)) return null;

  return title;
}

function normalizeCountry(country) {
  const map = {
    Thai: "Thailand",
    Thailand: "Thailand",
    Japan: "Japan",
    Japanese: "Japan",
    Korean: "South Korea",
    Korea: "South Korea",
    SouthKorea: "South Korea",
    "South Korea": "South Korea",
    Taiwan: "Taiwan",
    China: "China",
    "Hong Kong": "Hong Kong",
    HongKong: "Hong Kong",
    Philippines: "Philippines",
    Filipino: "Philippines",
    Vietnam: "Vietnam",
    Vietnamese: "Vietnam",
    Cambodia: "Cambodia",
    Cambodian: "Cambodia",
    Laos: "Laos",
    Myanmar: "Myanmar",
    India: "India",
    Indian: "India"
  };

  return map[country] || "Other Asia";
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleMatches(sourceTitle, imdbTitle) {

  const a = normalizeText(sourceTitle);
  const b = normalizeText(imdbTitle);

  if (!a || !b) return false;

  if (a === b) return true;

  if (b.includes(a) || a.includes(b)) {

    const shorter = a.length < b.length ? a : b;

    if (shorter.length >= 8) {
      return true;
    }
  }

  const stopWords = new Set([
    "the",
    "a",
    "an",
    "of",
    "and",
    "to",
    "in",
    "on",
    "my",
    "our",
    "your"
  ]);

  const sourceWords = a
    .split(" ")
    .filter(x => x.length >= 3 && !stopWords.has(x));

  const imdbWords = new Set(
    b
      .split(" ")
      .filter(x => x.length >= 3 && !stopWords.has(x))
  );

  if (sourceWords.length === 0) return false;

  let matched = 0;

  for (const word of sourceWords) {
    if (imdbWords.has(word)) {
      matched++;
    }
  }

  const ratio = matched / sourceWords.length;

  return (
    sourceWords.length >= 2 &&
    ratio >= 0.7
  );
}

async function imdbSearch(title) {

  try {

    const url =
      "https://v2.sg.media-imdb.com/suggestion/x/" +
      encodeURIComponent(title) +
      ".json";

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const results = response.data?.d || [];

    const series = results.filter(x =>
      x.id &&
      x.id.startsWith("tt") &&
      (
        x.qid === "tvSeries" ||
        x.qid === "tvMiniSeries"
      )
    );

    if (!series.length) return null;

    for (const candidate of series) {

      if (
        titleMatches(
          title,
          candidate.l
        )
      ) {
        return candidate;
      }
    }

    return null;

  } catch {

    return null;
  }
}

async function main() {

  console.log("");
  console.log("==========================================");
  console.log("       ASIAN BL UNIVERSE BUILDER");
  console.log("==========================================");
  console.log("");

  if (!fs.existsSync(INPUT)) {
    throw new Error(`${INPUT} no existe.`);
  }

  const source = JSON.parse(
    fs.readFileSync(INPUT, "utf8")
  );

  if (!Array.isArray(source)) {
    throw new Error(`${INPUT} no contiene un array.`);
  }

  console.log(
    "Series encontradas:",
    source.length
  );

  console.log("");

  const titles = [];
  const seenTitles = new Set();

  for (const item of source) {

    const name = cleanTitle(item.name);

    if (!name) continue;

    const key = normalizeText(name);

    if (seenTitles.has(key)) continue;

    seenTitles.add(key);

    titles.push({
      name,
      country: normalizeCountry(item.country),
      url: item.url || null
    });
  }

  console.log(
    "Títulos únicos:",
    titles.length
  );

  console.log("");

  const metas = [];
  const missing = [];
  const seenIMDb = new Set();

  for (let i = 0; i < titles.length; i++) {

    const item = titles[i];

    process.stdout.write(
      `[${i + 1}/${titles.length}] ${item.name}`
    );

    const imdb = await imdbSearch(item.name);

    if (!imdb) {

      missing.push(item);

      console.log(" → SIN COINCIDENCIA IMDb");

      continue;
    }

    if (seenIMDb.has(imdb.id)) {

      console.log(
        " → DUPLICADO IMDb"
      );

      continue;
    }

    seenIMDb.add(imdb.id);

    const meta = {
      id: imdb.id,
      type: "series",

      /*
       * Conservamos el título original
       * encontrado en World-of-BL.
       */
      name: item.name,

      imdb_id: imdb.id,

      country: item.country
    };

    if (imdb.y) {
      meta.year = Number(imdb.y);
    }

    metas.push(meta);

    console.log(
      " →",
      imdb.id,
      "(" + (imdb.l || "IMDb") + ")"
    );

    await new Promise(resolve =>
      setTimeout(resolve, 150)
    );
  }

  fs.writeFileSync(
    "catalog.json",
    JSON.stringify(
      {
        metas
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    "missing.json",
    JSON.stringify(
      missing,
      null,
      2
    )
  );

  console.log("");
  console.log("==========================================");
  console.log("              RESULTADO");
  console.log("==========================================");
  console.log("");

  console.log(
    "TÍTULOS ORIGINALES:",
    source.length
  );

  console.log(
    "TÍTULOS ÚNICOS:",
    titles.length
  );

  console.log(
    "CON IMDb:",
    metas.length
  );

  console.log(
    "SIN COINCIDENCIA:",
    missing.length
  );

  console.log("");
  console.log(
    "catalog.json creado correctamente."
  );

  console.log(
    "missing.json creado correctamente."
  );

  console.log("");
}

main().catch(error => {

  console.error("");
  console.error("==========================================");
  console.error("                 ERROR");
  console.error("==========================================");
  console.error("");

  console.error(
    error.response?.status ||
    error.message ||
    error
  );

  console.error("");

  process.exit(1);
});
