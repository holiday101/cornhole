const express = require('express');

const authRoutes = require('./routes/auth');
const { router: contactsRoutes } = require('./routes/contacts');
const coursesRoutes = require('./routes/courses');
const gamesRoutes = require('./routes/games');

const app = express();
app.use(express.json());

app.use(authRoutes);
app.use(contactsRoutes);
app.use(coursesRoutes);
app.use(gamesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 4001);
app.listen(port, () => {
  console.log(`cornhole-golf-api listening on port ${port}`);
});
