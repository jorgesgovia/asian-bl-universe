const express = require("express");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 7070;

const data = JSON.parse(
  fs.readFileSync("./catalog.json", "utf8")
);

const metas = Array.isArray(data) ? data : (data.metas || []);

function getByCountry(country) {

  return metas
    .filter(
      x =>
        String(x.country || "")
          .toLowerCase() ===
        country.toLowerCase()
    );
}

app.get("/manifest.json", (req, res) => {

  res.json({
    id: "org.asianbl.universe",
    version: "1.0.0",
    name: "Asian BL Universe",
    description:
      "Complete Asian BL Universe",
    resources: [
      "catalog",
      "meta"
    ],
    types: [
      "series"
    ],
    catalogs: [
      {
        type: "series",
        id: "asian-bl",
        name: "🌏 Asian BL Universe"
      },
      {
        type: "series",
        id: "thai-bl",
        name: "🇹🇭 Thai BL"
      },
      {
        type: "series",
        id: "japanese-bl",
        name: "🇯🇵 Japanese BL"
      },
      {
        type: "series",
        id: "korean-bl",
        name: "🇰🇷 Korean BL"
      },
      {
        type: "series",
        id: "taiwanese-bl",
        name: "🇹🇼 Taiwanese BL"
      },
      {
        type: "series",
        id: "chinese-bl",
        name: "🇨🇳 Chinese BL / Danmei"
      },
      {
        type: "series",
        id: "hong-kong-bl",
        name: "🇭🇰 Hong Kong BL"
      },
      {
        type: "series",
        id: "filipino-bl",
        name: "🇵🇭 Filipino BL"
      },
      {
        type: "series",
        id: "vietnamese-bl",
        name: "🇻🇳 Vietnamese BL"
      },
      {
        type: "series",
        id: "cambodian-bl",
        name: "🇰🇭 Cambodian BL"
      },
      {
        type: "series",
        id: "laos-bl",
        name: "🇱🇦 Laos BL"
      },
      {
        type: "series",
        id: "myanmar-bl",
        name: "🇲🇲 Myanmar BL"
      },
      {
        type: "series",
        id: "indian-bl",
        name: "🇮🇳 Indian BL"
      }
    ]
  });
});

app.get(
  "/catalog/series/asian-bl.json",
  (req, res) => {

    res.json({
      metas
    });
  }
);

const countryRoutes = {
  "thai-bl": "Thailand",
  "japanese-bl": "Japan",
  "korean-bl": "South Korea",
  "taiwanese-bl": "Taiwan",
  "chinese-bl": "China",
  "hong-kong-bl": "Hong Kong",
  "filipino-bl": "Philippines",
  "vietnamese-bl": "Vietnam",
  "cambodian-bl": "Cambodia",
  "laos-bl": "Laos",
  "myanmar-bl": "Myanmar",
  "indian-bl": "India"
};

for (
  const [route, country]
  of Object.entries(countryRoutes)
) {

  app.get(
    `/catalog/series/${route}.json`,
    (req, res) => {

      res.json({
        metas: getByCountry(country)
      });

    }
  );
}

app.get(
  "/meta/series/:id.json",
  (req, res) => {

    const item = metas.find(
      x =>
        x.id === req.params.id ||
        x.imdb_id === req.params.id
    );

    if (!item) {

      return res.status(404).json({
        err: "Meta not found"
      });
    }

    res.json({
      meta: {
        id: item.id,
        type: "series",
        name: item.name,
        year: item.year,
        imdb_id: item.imdb_id,
        country: item.country
      }
    });
  }
);

app.get("/", (req, res) => {

  res.json({
    addon: "Asian BL Universe",
    total: metas.length,
    status: "online"
  });
});

app.listen(PORT, () => {

  console.log(
    "Asian BL Universe running on port " +
    PORT
  );

});
