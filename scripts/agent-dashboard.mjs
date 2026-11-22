#!/usr/bin/env node
// Live agent dashboard: shows every agent working in this project, what it is
// doing right now, and what it is thinking.
//
// Sources (all local, read-only):
//   - Claude Code sessions   ~/.claude/projects/<project>/<session>.jsonl
//   - Claude Code subagents  ~/.claude/projects/<project>/<session>/subagents/*.jsonl
//   - Ruflo agents and tasks .claude-flow/agents/store.json, .claude-flow/tasks/store.json
//
// Usage: node scripts/agent-dashboard.mjs [--port 4400] [--host 127.0.0.1] [--all]
//   --all  include Claude Code sessions from every project, not just this repo

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const PORT = Number(flag('port', process.env.PORT || 4400));
const HOST = String(flag('host', '127.0.0.1'));
const ALL_PROJECTS = flag('all', false) === true;
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLAUDE_PROJECTS = path.join(os.homedir(), '.claude', 'projects');
const FLOW_DIR = path.join(REPO, '.claude-flow');

const ACTIVE_MS = 45_000; // a transcript written in the last 45s counts as live
const RECENT_MS = 6 * 60 * 60_000; // hide sessions idle for more than 6h
const TAIL_BYTES = 768 * 1024; // only parse the end of big transcripts
const TIMELINE_LEN = 14;

// ---------- helpers ----------

const readJson = (file) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
};

const list = (dir) => {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
};

function readTailLines(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    const lines = buf.toString('utf8').split('\n');
    if (start > 0) lines.shift(); // first line is probably cut in half
    const out = [];
    for (const l of lines) {
      if (!l.trim()) continue;
      try { out.push(JSON.parse(l)); } catch { /* partial write */ }
    }
    return out;
  } finally {
    fs.closeSync(fd);
  }
}

const clip = (s, n = 600) => {
  s = String(s ?? '').replace(/\s+\n/g, '\n').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

function describeTool(name, input = {}) {
  const i = input || {};
  const pick =
    i.description || i.command || i.file_path || i.path || i.pattern ||
    i.url || i.query || i.prompt || i.subject || i.skill || '';
  let detail = typeof pick === 'string' ? pick : JSON.stringify(pick);
  if (name === 'Agent' || name === 'Task') detail = `${i.subagent_type || 'agent'}: ${i.description || ''}`;
  if (name === 'TodoWrite' && Array.isArray(i.todos)) {
    const cur = i.todos.find((t) => t.status === 'in_progress');
    detail = cur ? cur.activeForm || cur.content : `${i.todos.length} todos`;
  }
  return { tool: name, detail: clip(detail, 220) };
}

const resultText = (c) => {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((x) => (x.type === 'text' ? x.text : `[${x.type}]`)).join(' ');
  return '';
};

// ---------- Claude Code transcripts ----------

function parseTranscript(file, { kind, sessionId, meta = {} }) {
  const stat = fs.statSync(file);
  const entries = readTailLines(file);

  let title = meta.description || '';
  let model = '';
  let cwd = '';
  let branch = '';
  let lastPrompt = '';
  let lastThinking = null;
  let lastText = null;
  let lastToolUse = null;
  const pendingTools = new Map();
  const timeline = [];
  let tokensOut = 0;

  for (const e of entries) {
    if (e.type === 'ai-title' && e.aiTitle) title = title || e.aiTitle;
    if (e.type === 'summary' && e.summary) title = title || e.summary;
    if (e.cwd) cwd = e.cwd;
    if (e.gitBranch) branch = e.gitBranch;
    const ts = e.timestamp;
    const msg = e.message;
    if (!msg) continue;

    if (e.type === 'user') {
      if (typeof msg.content === 'string') {
        if (!e.isMeta && !msg.content.startsWith('<')) {
          lastPrompt = msg.content;
          timeline.push({ ts, kind: 'prompt', text: clip(msg.content, 240) });
        }
      } else if (Array.isArray(msg.content)) {
        for (const c of msg.content) {
          if (c.type === 'tool_result') {
            const t = pendingTools.get(c.tool_use_id);
            pendingTools.delete(c.tool_use_id);
            timeline.push({
              ts, kind: c.is_error ? 'error' : 'result',
              text: clip(`${t ? t.tool + ' → ' : ''}${resultText(c.content)}`, 200),
            });
          } else if (c.type === 'text' && !c.text.startsWith('<')) {
            lastPrompt = c.text;
            timeline.push({ ts, kind: 'prompt', text: clip(c.text, 240) });
          }
        }
      }
    }

    if (e.type === 'assistant' && Array.isArray(msg.content)) {
      if (msg.model && msg.model !== '<synthetic>') model = msg.model;
      tokensOut += msg.usage?.output_tokens || 0;
      for (const c of msg.content) {
        if (c.type === 'thinking' && c.thinking?.trim()) {
          lastThinking = { ts, text: c.thinking };
          timeline.push({ ts, kind: 'thinking', text: clip(c.thinking, 240) });
        } else if (c.type === 'text' && c.text?.trim()) {
          lastText = { ts, text: c.text };
          timeline.push({ ts, kind: 'say', text: clip(c.text, 240) });
        } else if (c.type === 'tool_use') {
          const d = describeTool(c.name, c.input);
          lastToolUse = { ts, ...d };
          pendingTools.set(c.id, d);
          timeline.push({ ts, kind: 'tool', text: `${d.tool}: ${d.detail}` });
        }
      }
    }
  }

  const age = Date.now() - stat.mtimeMs;
  const running = [...pendingTools.values()];
  let status = 'idle';
  if (age < ACTIVE_MS) status = running.length ? 'working' : 'thinking';
  else if (running.length) status = 'waiting'; // a tool call never got its result (blocked on a prompt or still running)

  const doing = running.length
    ? running.map((t) => `${t.tool}: ${t.detail}`).join('\n')
    : status === 'idle'
      ? (lastToolUse ? `Last did ${lastToolUse.tool}: ${lastToolUse.detail}` : 'Nothing yet')
      : 'Composing a response';

  // Thinking: the latest reasoning text when the transcript stores it, else the
  // agent's latest message to the user (its stated plan), marked as such.
  const thought =
    lastThinking && (!lastText || lastThinking.ts >= lastText.ts)
      ? { source: 'reasoning', ...lastThinking }
      : lastText
        ? { source: 'message', ...lastText }
        : null;

  return {
    id: `${kind}:${sessionId}:${path.basename(file, '.jsonl')}`,
    kind,
    name: meta.agentType || (kind === 'session' ? 'Claude Code' : 'subagent'),
    title: clip(title || lastPrompt || path.basename(file, '.jsonl'), 120),
    model,
    cwd,
    branch,
    status,
    updatedAt: stat.mtime.toISOString(),
    task: clip(meta.prompt || lastPrompt, 400),
    doing,
    thinking: thought ? { source: thought.source, ts: thought.ts, text: clip(thought.text, 1500) } : null,
    stats: { tokensOut, events: entries.length },
    timeline: timeline.slice(-TIMELINE_LEN).reverse(),
    parent: kind === 'subagent' ? sessionId : null,
  };
}

const encodeProject = (p) => p.replace(/[^a-zA-Z0-9]/g, '-');

function claudeAgents() {
  const projects = ALL_PROJECTS
    ? list(CLAUDE_PROJECTS).filter((d) => d.isDirectory()).map((d) => path.join(CLAUDE_PROJECTS, d.name))
    : [path.join(CLAUDE_PROJECTS, encodeProject(REPO))];
  const agents = [];

  for (const proj of projects) {
    for (const f of list(proj)) {
      if (f.isFile() && f.name.endsWith('.jsonl')) {
        const file = path.join(proj, f.name);
        try {
          if (Date.now() - fs.statSync(file).mtimeMs > RECENT_MS) continue;
          agents.push(parseTranscript(file, { kind: 'session', sessionId: f.name.replace(/\.jsonl$/, '') }));
        } catch { /* unreadable, skip */ }
        continue;
      }
      if (!f.isDirectory()) continue;
      const sessionId = f.name;
      const subDir = path.join(proj, sessionId, 'subagents');
      for (const s of list(subDir)) {
        if (!s.isFile() || !s.name.endsWith('.jsonl')) continue;
        const sf = path.join(subDir, s.name);
        try {
          if (Date.now() - fs.statSync(sf).mtimeMs > RECENT_MS) continue;
          const meta = readJson(sf.replace(/\.jsonl$/, '.meta.json')) || {};
          agents.push(parseTranscript(sf, { kind: 'subagent', sessionId, meta }));
        } catch { /* skip */ }
      }
    }
  }
  return agents;
}

// ---------- Ruflo ----------

const values = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);

function rufloAgents() {
  const store = readJson(path.join(FLOW_DIR, 'agents', 'store.json'));
  const tasksStore = readJson(path.join(FLOW_DIR, 'tasks', 'store.json'));
  const tasks = values(tasksStore?.tasks ?? tasksStore);
  const byId = new Map(tasks.map((t) => [t.taskId || t.id, t]));
  let mtime = null;
  try { mtime = fs.statSync(path.join(FLOW_DIR, 'agents', 'store.json')).mtime.toISOString(); } catch {}

  return values(store?.agents).map((a) => {
    const assigned = tasks.filter((t) => (t.assignedTo || []).includes(a.agentId));
    const current = byId.get(a.currentTask) || assigned.find((t) => t.status === 'in_progress');
    const recent = assigned
      .slice()
      .sort((x, y) => String(y.updatedAt || y.createdAt).localeCompare(String(x.updatedAt || x.createdAt)))
      .slice(0, TIMELINE_LEN);
    const stopped = ['terminated', 'stopped', 'error', 'failed'].includes(a.status);
    const status = stopped ? 'stopped' : current ? (current.status === 'pending' ? 'waiting' : 'working') : 'idle';
    return {
      id: `ruflo:${a.agentId}`,
      kind: 'ruflo',
      name: a.agentType || 'agent',
      title: a.name || a.agentId,
      model: a.model || '',
      status,
      updatedAt: a.lastActivity || a.updatedAt || mtime || a.createdAt,
      task: current?.description || '',
      doing: current
        ? `${current.status === 'pending' ? 'queued' : `${current.progress ?? 0}%`} · ${current.type || 'task'} · ${current.description || current.taskId}`
        : `Ruflo status: ${a.status}${a.taskCount ? ` · ${a.taskCount} tasks done` : ''}`,
      thinking: null,
      thinkingNote: 'Ruflo does not record reasoning for its agents; only their tasks.',
      stats: { health: a.health, taskCount: a.taskCount },
      timeline: recent.map((t) => ({
        ts: t.updatedAt || t.createdAt,
        kind: t.status === 'failed' ? 'error' : t.status === 'completed' ? 'result' : 'tool',
        text: `[${t.status}] ${t.description || t.taskId}`,
      })),
    };
  });
}

function snapshot() {
  const order = { working: 0, thinking: 1, waiting: 2, idle: 3, stopped: 4 };
  const agents = [...claudeAgents(), ...rufloAgents()].sort(
    (a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || String(b.updatedAt).localeCompare(String(a.updatedAt)),
  );
  const swarm = readJson(path.join(FLOW_DIR, 'metrics', 'swarm-activity.json'));
  return { generatedAt: new Date().toISOString(), repo: REPO, allProjects: ALL_PROJECTS, swarm: swarm?.swarm || null, agents };
}

// ---------- server ----------

const PAGE = fs.readFileSync(path.join(REPO, 'scripts', 'agent-dashboard.html'), 'utf8');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/agents') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    return res.end(JSON.stringify(snapshot()));
  }
  if (url.pathname === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    let last = '';
    const push = () => {
      const s = snapshot();
      const body = JSON.stringify(s.agents) + JSON.stringify(s.swarm);
      if (body === last) return res.write(': ping\n\n');
      last = body;
      res.write(`data: ${JSON.stringify(s)}\n\n`);
    };
    push();
    const t = setInterval(push, 1500);
    req.on('close', () => clearInterval(t));
    return;
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(PAGE);
  }
  res.writeHead(404).end('not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Agent dashboard: http://${HOST}:${PORT}  (${ALL_PROJECTS ? 'all projects' : REPO})`);
});
