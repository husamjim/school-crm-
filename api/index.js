// ============================================================
// GMIS CRM - Vercel Serverless API (Standalone, no native deps)
// ============================================================
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'gmis_secret_jwt_key_2026';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── In-Memory Database ───────────────────────────────────────
const DB = {
  users: [
    {
      id: '1',
      name: 'المدير العام',
      email: 'admin@gmis.edu',
      password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password = "password"
      role: 'admin',
      status: 'active',
      permissions: null,
      assigned_whatsapp: null,
      needs_password_change: 0,
      created_at: new Date().toISOString()
    }
  ],
  leads: [],
  visits: [],
  messages: [],
  story_reactions: [],
  auto_replies: [],
  knowledge_base: []
};

// Generate a real hash for 123456 at startup
try {
  const adminUser = DB.users.find(u => u.email === 'admin@gmis.edu');
  if (adminUser) {
    adminUser.password = bcrypt.hashSync('123456', 10);
  }
} catch (e) {}

// ─── Rate Limiting ────────────────────────────────────────────
const rateLimitMap = new Map();
function rateLimit(max = 30, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const rec = rateLimitMap.get(ip) || { count: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
    rec.count++;
    rateLimitMap.set(ip, rec);
    if (rec.count > max) return res.status(429).json({ error: 'Too many requests' });
    next();
  };
}

// ─── Auth Middleware ──────────────────────────────────────────
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── AUTH ROUTES ──────────────────────────────────────────────
app.post('/api/auth/login', rateLimit(30), (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = DB.users.find(u => u.email === email.trim().toLowerCase() || u.email === email.trim());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = bcrypt.compareSync(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        assigned_whatsapp: user.assigned_whatsapp,
        needs_password_change: user.needs_password_change
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-password', auth, (req, res) => {
  const { userId, newPassword } = req.body || {};
  const u = DB.users.find(x => x.id === userId);
  if (!u) return res.status(404).json({ error: 'User not found' });
  u.password = bcrypt.hashSync(newPassword, 10);
  u.needs_password_change = 0;
  res.json({ success: true });
});

// ─── USERS ────────────────────────────────────────────────────
app.get('/api/users', auth, (req, res) => {
  res.json(DB.users.map(({ password, ...u }) => u));
});

app.post('/api/users', auth, (req, res) => {
  try {
    const u = { ...req.body, id: Date.now().toString(), password: bcrypt.hashSync(req.body.password || '123456', 10), needs_password_change: 1, created_at: new Date().toISOString() };
    DB.users.push(u);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', auth, (req, res) => {
  DB.users = DB.users.filter(u => u.id !== req.params.id);
  res.json({ success: true });
});

app.post('/api/users/:id/status', auth, (req, res) => {
  const u = DB.users.find(x => x.id === req.params.id);
  if (u) u.status = req.body.status;
  res.json({ success: true });
});

app.post('/api/users/:id/permissions', auth, (req, res) => {
  const u = DB.users.find(x => x.id === req.params.id);
  if (u) { u.permissions = req.body.permissions; u.assigned_whatsapp = req.body.assigned_whatsapp || null; }
  res.json({ success: true });
});

// ─── LEADS ────────────────────────────────────────────────────
app.get('/api/leads', auth, (req, res) => {
  let leads = [...DB.leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(leads);
});

app.post('/api/leads', auth, (req, res) => {
  const lead = { ...req.body, id: req.body.id || Date.now().toString(), created_at: new Date().toISOString() };
  DB.leads.unshift(lead);
  res.json({ success: true });
});

app.put('/api/leads/:id', auth, (req, res) => {
  const idx = DB.leads.findIndex(l => l.id === req.params.id);
  if (idx >= 0) DB.leads[idx] = { ...DB.leads[idx], ...req.body };
  res.json({ success: true });
});

app.delete('/api/leads/:id', auth, (req, res) => {
  DB.leads = DB.leads.filter(l => l.id !== req.params.id);
  res.json({ success: true });
});

app.post('/api/leads/:id/status', auth, (req, res) => {
  const l = DB.leads.find(x => x.id === req.params.id);
  if (l) l.status = req.body.status;
  res.json({ success: true });
});

app.post('/api/leads/:id/assign', auth, (req, res) => {
  const l = DB.leads.find(x => x.id === req.params.id);
  if (l) l.assigned_to = req.body.assigned_to;
  res.json({ success: true });
});

app.get('/api/leads/assigned', auth, (req, res) => {
  const { userId } = req.query;
  res.json(DB.leads.filter(l => l.assigned_to === userId));
});

// ─── STATS ────────────────────────────────────────────────────
app.get('/api/stats', auth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  res.json({
    totalLeads: DB.leads.length,
    newToday: DB.leads.filter(l => l.created_at?.startsWith(today)).length,
    activeCampaigns: 0,
    totalSent: DB.messages.length,
    upcomingVisits: DB.visits.filter(v => v.date >= today).length
  });
});

app.get('/api/stats/detailed', auth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const hotStatuses = ['following', 'interested', 'Hot', 'مهتم'];
  const weeklyFlow = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    weeklyFlow.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      leads: DB.leads.filter(l => l.created_at?.startsWith(ds)).length,
      conv: DB.leads.filter(l => l.created_at?.startsWith(ds) && l.status === 'registered').length
    });
  }
  res.json({
    totalLeads: DB.leads.length,
    newToday: DB.leads.filter(l => l.created_at?.startsWith(today)).length,
    hotLeads: DB.leads.filter(l => hotStatuses.includes(l.status)).length,
    upcomingVisits: DB.visits.filter(v => v.date >= today).length,
    totalSent: DB.messages.length,
    gradeDistribution: [],
    channelDistribution: [],
    scheduledLeadsCount: 0,
    registeredLeadsCount: DB.leads.filter(l => l.status === 'registered').length,
    engagedLeadsCount: 0,
    weeklyFlow,
    recentLeads: DB.leads.slice(0, 5),
    funnel: {
      newLeads: DB.leads.filter(l => l.status === 'new').length,
      followingLeads: DB.leads.filter(l => l.status === 'following').length,
      interestedLeads: DB.leads.filter(l => l.status === 'interested').length,
      registeredLeads: DB.leads.filter(l => l.status === 'registered').length,
      coldLeads: DB.leads.filter(l => l.status === 'cold').length
    },
    nationalityDistribution: [],
    addressDistribution: []
  });
});

// ─── MESSAGES ─────────────────────────────────────────────────
app.get('/api/messages', auth, (req, res) => res.json(DB.messages));
app.post('/api/messages', auth, (req, res) => {
  if (!DB.messages.find(m => m.id === req.body.id)) {
    DB.messages.push({ ...req.body, created_at: new Date().toISOString() });
  }
  res.json({ success: true });
});

// ─── VISITS ───────────────────────────────────────────────────
app.get('/api/visits', auth, (req, res) => res.json([...DB.visits].sort((a, b) => a.date?.localeCompare(b.date))));
app.post('/api/visits', auth, (req, res) => {
  DB.visits.push({ ...req.body, id: req.body.id || Date.now().toString(), created_at: new Date().toISOString() });
  res.json({ success: true });
});
app.post('/api/visits/:id/status', auth, (req, res) => {
  const v = DB.visits.find(x => x.id === req.params.id);
  if (v) v.status = req.body.status;
  res.json({ success: true });
});
app.delete('/api/visits/:id', auth, (req, res) => {
  DB.visits = DB.visits.filter(x => x.id !== req.params.id);
  res.json({ success: true });
});

// ─── SETTINGS ─────────────────────────────────────────────────
const channelSettings = {};
app.get('/api/settings/:channel', (req, res) => {
  const ch = req.params.channel;
  if (ch === 'ai') return res.json(channelSettings.ai || { autoReply: false });
  res.json({ connected: false, accounts: [] });
});
app.post('/api/settings/:channel', auth, (req, res) => {
  channelSettings[req.params.channel] = req.body;
  res.json({ success: true });
});

// ─── AUTO REPLIES ─────────────────────────────────────────────
app.get('/api/auto-replies', auth, (req, res) => res.json(DB.auto_replies));
app.post('/api/auto-replies', auth, (req, res) => {
  DB.auto_replies.push({ ...req.body, id: Date.now().toString(), created_at: new Date().toISOString() });
  res.json({ success: true });
});
app.delete('/api/auto-replies/:id', auth, (req, res) => {
  DB.auto_replies = DB.auto_replies.filter(x => x.id !== req.params.id);
  res.json({ success: true });
});

// ─── KNOWLEDGE BASE ───────────────────────────────────────────
app.get('/api/knowledge', auth, (req, res) => res.json(DB.knowledge_base));
app.post('/api/knowledge', auth, (req, res) => {
  DB.knowledge_base.unshift({ ...req.body, id: Date.now().toString(), created_at: new Date().toISOString() });
  res.json({ success: true });
});
app.patch('/api/knowledge/:id/status', auth, (req, res) => {
  const k = DB.knowledge_base.find(x => x.id === req.params.id);
  if (k) k.status = req.body.status;
  res.json({ success: true });
});
app.delete('/api/knowledge/:id', auth, (req, res) => {
  DB.knowledge_base = DB.knowledge_base.filter(x => x.id !== req.params.id);
  res.json({ success: true });
});

// ─── WEBHOOK (Facebook/Instagram placeholder) ─────────────────
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === (process.env.VERIFY_TOKEN || 'gmis_verify')) {
    return res.send(challenge);
  }
  res.sendStatus(403);
});
app.post('/webhook', (req, res) => res.sendStatus(200));

// ─── CATCH ALL ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

export default app;
