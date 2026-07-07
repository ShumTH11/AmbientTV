// Vercel serverless function - catch-all for all /api/* requests.
// The Express app (built in backend/app.js) is fully self-contained and
// handles routing, CORS, cookies and every API route. Vercel serves the
// static frontend (web/dist) and routes anything under /api to this handler.

const app = require('../backend/app');

module.exports = app;
