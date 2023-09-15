import "dotenv/config";
import { firefox } from "@playwright/test";

updateIcon();

async function updateIcon() {
  const browser = await firefox.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ height: 1024, width: 1024 });
  await page.goto("https://gcpdot.com/gcp.html");
  await page.waitForTimeout(2000);

  const dotDataUrl = await page.evaluate(() => {
    const dot = document.getElementsByTagName("canvas")[0];
    return dot.toDataURL();
  });

  await browser.close();

  if (typeof dotDataUrl !== "string") {
    console.error(new Error("Unexpected dot data type!"));
    process.exit();
  }

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD}`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      },
      body: JSON.stringify({
        icon: dotDataUrl,
      }),
    }
  );

  console.log("\n");
  console.log(
    new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
  console.log(`HTTP ${res.status} ${res.statusText}`);

  let resJson = {};

  try {
    resJson = await res.json();
  } catch {}

  if (
    res.status >= 200 &&
    res.status <= 299 &&
    parseInt(res.headers.get("x-ratelimit-remaining"), 10) > 0
  ) {
    console.log("Request succeeded");
    setTimeout(updateIcon, 1000 * 180);
  } else if (res.status >= 200 && res.status <= 299) {
    const retryAfterParsed = parseInt(
      res.headers.get("x-ratelimit-reset-after"),
      10
    );
    const waitForSeconds =
      !isNaN(retryAfterParsed) && retryAfterParsed > 0 ? retryAfterParsed : 60;

    console.log("Request succeeded");
    console.log(
      `No remaining requests in bucket. Waiting ${waitForSeconds} seconds (${(
        waitForSeconds / 60
      ).toFixed(1)} minutes)`
    );
    setTimeout(updateIcon, 1000 * waitForSeconds);
  } else if (res.status === 429) {
    const retryAfterParsed = parseInt(resJson.retry_after, 10);
    const waitForSeconds =
      !isNaN(retryAfterParsed) && retryAfterParsed > 0 ? retryAfterParsed : 60;

    if (resJson.code) console.log(`Status ${resJson.code}`);
    if (resJson.message) console.log(resJson.message);

    console.log(
      `Will retry after ${waitForSeconds} seconds (${(
        waitForSeconds / 60
      ).toFixed(1)} minutes)`
    );

    setTimeout(updateIcon, waitForSeconds * 1000);
  } else {
    console.error(new Error("Unknown response from API. Shutting down..."));
    process.exit();
  }
}
