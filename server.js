import express from 'express';
import routes from './routes/index.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use('/', routes);

app.listen(port, () => {
  // Garder cette ligne exactement comme ceci pour matcher la sortie du checker
  console.log(`Server running on port ${port}`);
});

export default app;

