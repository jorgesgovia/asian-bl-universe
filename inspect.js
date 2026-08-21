
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

async function main() {

  const urls = [
    "https://www.world-of-bl.com/index.php/Main/Shows",
    "https://www.world-of-bl.com/index.php/Main/Shows-Country"
  ];

  for (const url of urls) {

    console.log("\n==========================================");
    console.log(url);
    console.log("==========================================\n");

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    const $ = cheerio.load(response.data);

    console.log("TITLE:", $("title").text());
    console.log("TABLES:", $("table").length);
    console.log("ROWS:", $("tr").length);
    console.log("LINKS:", $("a").length);
    console.log("");

    $("table").each((i, table) => {

      console.log("------------------------------------------");
      console.log("TABLE", i + 1);
      console.log("------------------------------------------");

      $(table).find("tr").slice(0, 8).each((j, row) => {

        const text = $(row)
          .text()
          .replace(/\s+/g, " ")
          .trim();

        console.log("ROW:", text);

        $(row).find("a").each((k, a) => {

          console.log(
            " LINK:",
            $(a).text().trim(),
            "=>",
            $(a).attr("href")
          );

        });
      });
    });

    fs.writeFileSync(
      "world-of-bl-" +
      (url.includes("Shows-Country") ? "country" : "shows") +
      ".html",
      response.data
    );

    console.log("");
    console.log("HTML GUARDADO.");
  }
}

main().catch(err => {
  console.error(err.response?.status || err.message);
});
