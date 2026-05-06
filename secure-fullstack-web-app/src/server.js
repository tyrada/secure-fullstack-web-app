const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const adminKey = process.env.ADMIN_KEY || 'change-this-demo-key';

const db = new Database(path.join(__dirname, '..', 'data.sqlite'));
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    request_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(helmet());
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateSubmission(body) {
  const name = String(body.name || '').trim();
  const email = normalizeEmail(body.email);
  const requestType = String(body.request_type || '').trim();
  const message = String(body.message || '').trim();

  const allowedTypes = new Set(['support', 'security-review', 'implementation-help']);

  if (name.length < 2 || name.length > 80) return { error: 'Name must be between 2 and 80 characters.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Email must be valid.' };
  if (!allowedTypes.has(requestType)) return { error: 'Request type is invalid.' };
  if (message.length < 5 || message.length > 500) return { error: 'Message must be between 5 and 500 characters.' };

  return { name, email, requestType, message };
}

app.get('/', (req, res) => {
  res.send(`
    <h1>Secure Customer Request App</h1>
    <p>This demo shows validation, SQLite persistence, basic admin access control, and secure headers.</p>
    <form method="POST" action="/submit">
      <label>Name<br><input name="name" required></label><br><br>
      <label>Email<br><input name="email" type="email" required></label><br><br>
      <label>Request Type<br>
        <select name="request_type" required>
          <option value="support">Support</option>
          <option value="security-review">Security Review</option>
          <option value="implementation-help">Implementation Help</option>
        </select>
      </label><br><br>
      <label>Message<br><textarea name="message" required></textarea></label><br><br>
      <button type="submit">Submit</button>
    </form>
  `);
});

app.post('/submit', (req, res) => {
  const result = validateSubmission(req.body);

  if (result.error) {
    return res.status(400).send(`<h1>Validation Error</h1><p>${escapeHtml(result.error)}</p><a href="/">Try again</a>`);
  }

  db.prepare(`
    INSERT INTO submissions (name, email, request_type, message)
    VALUES (?, ?, ?, ?)
  `).run(result.name, result.email, result.requestType, result.message);

  res.status(201).send('<h1>Submission saved</h1><p>Your request was recorded successfully.</p><a href="/">Back</a>');
});

app.get('/admin', (req, res) => {
  if (req.query.key !== adminKey) {
    return res.status(403).send('<h1>Forbidden</h1><p>Admin key is missing or incorrect.</p>');
  }

  const rows = db.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all();
  const tableRows = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.created_at)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.email)}</td>
      <td>${escapeHtml(row.request_type)}</td>
      <td>${escapeHtml(row.message)}</td>
    </tr>
  `).join('');

  res.send(`
    <h1>Admin Submissions</h1>
    <table border="1" cellpadding="8">
      <thead><tr><th>Created</th><th>Name</th><th>Email</th><th>Type</th><th>Message</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `);
});

app.listen(port, () => {
  console.log(`Secure app running on port ${port}`);
});
