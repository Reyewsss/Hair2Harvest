// Local / long-running server entry. On Vercel, api/index.js serves the app instead.
import app from "./app.js";
import { connectDB } from "./config/db.js";

const port = Number(process.env.PORT) || 5000;
connectDB()
  .then(() => app.listen(port, () => console.log(`API listening on http://localhost:${port}`)))
  .catch((error) => {
    console.error("Could not start:", error.message);
    process.exit(1);
  });
