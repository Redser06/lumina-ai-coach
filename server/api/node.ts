import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? "0");
const app = createApp();

serve({ fetch: app.fetch, hostname: "127.0.0.1", port }, (info) => {
  console.log(`LISTENING ${info.port}`);
});
