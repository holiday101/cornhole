const express = require('express');

const authRoutes = require('./routes/auth');
const { router: contactsRoutes } = require('./routes/contacts');
const coursesRoutes = require('./routes/courses');
const gamesRoutes = require('./routes/games');

const app = express();

// The API runs behind nginx on the EC2 box (membergolfonline.com/cornhole/api
// proxies to this process), so Express needs to trust the first hop's
// X-Forwarded-For to see the real client IP. Without this, express-rate-limit
// would bucket every request under nginx's own IP.
app.set('trust proxy', 1);

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
