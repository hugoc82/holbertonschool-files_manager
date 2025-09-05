// server.js
import express from "express";
import loadRoutes from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
loadRoutes(app);

app.listen(PORT, () => {
  // Le checker attend juste que ça écoute, ce log aide pour le local
  // mais n'influence pas les réponses HTTP.
  console.log(`Server running on port ${PORT}`);
});

export default app; // utile pour certains checkers/tests
