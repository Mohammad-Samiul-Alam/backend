import { CronJob } from "cron";
import https from "https";
import http from "http";

const job = new CronJob("*/14 * * * *", function () {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    console.error("API_URL is not defined in environment variables");
    return;
  }

  const client = apiUrl.startsWith("https") ? https : http;

  client
    .get(apiUrl, (res) => {
      res.on("data", () => {});
      res.on("end", () => {
        if (res.statusCode === 200) {
          console.log("GET request sent successfully");
        } else {
          console.log("GET request failed", res.statusCode);
        }
      });
    })
    .on("error", (e) => console.error("Error while sending request", e));
});

export default job;