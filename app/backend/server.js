/**
 * Task Manager — minimal backend used as the "system under test" for the
 * Playwright E2E suite in this repo. Deliberately simple (in-memory store,
 * no real crypto) — the point of this repo is the test suite, not the app.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory "database". Reset between test runs via POST /api/test/reset.
// ---------------------------------------------------------------------------
const seedUsers = () => ([
  { id: 1, username: 'demo', password: 'demo1234' },
]);

const seedTasks = () => ([
  { id: 1, title: 'Write project README', done: true, priority: 'low', owner: 1 },
  { id: 2, title: 'Set up CI pipeline', done: false, priority: 'high', owner: 1 },
  { id: 3, title: 'Review pull request', done: false, priority: 'medium', owner: 1 },
]);

let users = seedUsers();
let tasks = seedTasks();
let nextTaskId = tasks.length + 1;
const sessions = new Map(); // token -> userId

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = sessions.get(token);
  next();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = crypto.randomBytes(16).toString('hex');
  sessions.set(token, user.id);
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.post('/api/auth/logout', authenticate, (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.slice(7);
  sessions.delete(token);
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Tasks CRUD
// ---------------------------------------------------------------------------
app.get('/api/tasks', authenticate, (req, res) => {
  const { done, priority } = req.query;
  let result = tasks.filter((t) => t.owner === req.userId);
  if (done !== undefined) {
    result = result.filter((t) => String(t.done) === done);
  }
  if (priority) {
    result = result.filter((t) => t.priority === priority);
  }
  res.json(result);
});

app.get('/api/tasks/:id', authenticate, (req, res) => {
  const task = tasks.find((t) => t.id === Number(req.params.id) && t.owner === req.userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.post('/api/tasks', authenticate, (req, res) => {
  const { title, priority = 'medium' } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const task = { id: nextTaskId++, title: title.trim(), done: false, priority, owner: req.userId };
  tasks.push(task);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', authenticate, (req, res) => {
  const task = tasks.find((t) => t.id === Number(req.params.id) && t.owner === req.userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { title, done, priority } = req.body || {};
  if (title !== undefined) task.title = title;
  if (done !== undefined) task.done = done;
  if (priority !== undefined) task.priority = priority;
  res.json(task);
});

app.delete('/api/tasks/:id', authenticate, (req, res) => {
  const idx = tasks.findIndex((t) => t.id === Number(req.params.id) && t.owner === req.userId);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  tasks.splice(idx, 1);
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Test-only helper: reset state so every spec starts from a known fixture.
// Never ship this in a real product — it's here because this repo's whole
// purpose is demonstrating a clean, isolated E2E suite.
// ---------------------------------------------------------------------------
app.post('/api/test/reset', (req, res) => {
  users = seedUsers();
  tasks = seedTasks();
  nextTaskId = tasks.length + 1;
  sessions.clear();
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Static frontend
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.listen(PORT, () => {
  console.log(`Task Manager running at http://localhost:${PORT}`);
});
