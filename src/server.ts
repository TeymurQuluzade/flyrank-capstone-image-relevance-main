import app from "./app";
import { config } from "./config";
import { closePool } from "./config/database";

const server = app.listen(config.app.port, () => {
  console.log(`Server running on ${config.app.host}:${config.app.port}`);
});

const shutdown = async () => {
  console.log("Shutting down gracefully...");
  server.close(async () => {
    await closePool();
    console.log("Server stopped.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
