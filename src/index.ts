import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { healthRouter } from "./routes/health.routes";
import { tatumWebhookRouter } from "./routes/tatum-webhook.routes";
import { buyRouter } from "./routes/buy.routes";

const app = express();

app.use(cors());

app.use(
  "/webhook",
  express.raw({ type: "application/json" }),
  tatumWebhookRouter
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/health", healthRouter);
app.use(buyRouter);
app.use("/api", apiRouter);

app.listen(env.port, () => {
  console.log(`Server listening on port ${env.port} (${env.nodeEnv})`);
});
