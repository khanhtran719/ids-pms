import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const workDirectory = resolve(workspaceRoot, '.ai-work');
const sessionsDirectory = resolve(workDirectory, 'sessions');
const currentSessionPath = resolve(workDirectory, 'current-session');
const lastSessionPath = resolve(workDirectory, 'last-session');
const timeZone = process.env.AI_LOG_TIMEZONE ?? 'Asia/Ho_Chi_Minh';

function parseArguments(values) {
  const result = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) continue;

    const separatorIndex = value.indexOf('=');
    if (separatorIndex >= 0) {
      result[value.slice(2, separatorIndex)] = value.slice(separatorIndex + 1);
      continue;
    }

    const key = value.slice(2);
    const nextValue = values[index + 1];
    if (nextValue && !nextValue.startsWith('--')) {
      result[key] = nextValue;
      index += 1;
    } else {
      result[key] = 'true';
    }
  }

  return result;
}

function getZonedDateParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
}

function getTimestamp() {
  const parts = getZonedDateParts();
  return {
    filename: `${parts.year}-${parts.month}-${parts.day}-${parts.hour}${parts.minute}${parts.second}`,
    readable: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${timeZone}`,
  };
}

function sanitizeInline(value, fallback) {
  const normalized = String(value ?? fallback)
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ')
    .trim();
  return normalized || fallback;
}

function createSlug(value) {
  return (
    sanitizeInline(value, 'session')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'session'
  );
}

function readActiveSession() {
  if (!existsSync(currentSessionPath)) return null;
  const relativePath = readFileSync(currentSessionPath, 'utf8').trim();
  return relativePath ? resolve(workspaceRoot, relativePath) : null;
}

function relativeToWorkspace(absolutePath) {
  return absolutePath.slice(workspaceRoot.length + 1);
}

function appendSessionEntry(sessionPath, content) {
  appendFileSync(sessionPath, `\n${content.trim()}\n`, 'utf8');
}

function startSession(options) {
  mkdirSync(sessionsDirectory, { recursive: true });
  const activeSession = readActiveSession();

  if (activeSession && options.force !== 'true') {
    throw new Error(
      `A session is already active: ${relativeToWorkspace(activeSession)}. End it first or use --force.`,
    );
  }

  if (activeSession && existsSync(activeSession)) {
    const timestamp = getTimestamp();
    appendSessionEntry(
      activeSession,
      `## Session result\n\n- Ended: ${timestamp.readable}\n- Status: superseded\n- Summary: Replaced by a new AI session using --force.`,
    );
    writeFileSync(
      lastSessionPath,
      `${relativeToWorkspace(activeSession)}\n`,
      'utf8',
    );
  }

  const timestamp = getTimestamp();
  const task = sanitizeInline(options.task, 'Unspecified task');
  const agent = sanitizeInline(options.agent, 'Unspecified AI agent');
  const filename = `${timestamp.filename}-${createSlug(task)}.md`;
  const sessionPath = resolve(sessionsDirectory, filename);
  const relativePath = relativeToWorkspace(sessionPath);

  writeFileSync(
    sessionPath,
    `# AI Session Log\n\n- Started: ${timestamp.readable}\n- Agent: ${agent}\n- Task: ${task}\n- Workspace: ${workspaceRoot}\n\n## Timeline\n`,
    'utf8',
  );
  writeFileSync(currentSessionPath, `${relativePath}\n`, 'utf8');
  process.stdout.write(`${relativePath}\n`);
}

function noteSession(options) {
  const sessionPath = readActiveSession();
  if (!sessionPath || !existsSync(sessionPath)) {
    throw new Error(
      'No active AI session. Run npm run ai:session:start first.',
    );
  }

  const timestamp = getTimestamp();
  const type = sanitizeInline(options.type, 'note');
  const message = sanitizeInline(options.message, 'No message provided');
  const files = sanitizeInline(options.files, 'none');
  appendSessionEntry(
    sessionPath,
    `### ${timestamp.readable} — ${type}\n\n${message}\n\n- Files: ${files}`,
  );
  process.stdout.write(`${relativeToWorkspace(sessionPath)}\n`);
}

function endSession(options) {
  const sessionPath = readActiveSession();
  if (!sessionPath || !existsSync(sessionPath)) {
    throw new Error('No active AI session to end.');
  }

  const timestamp = getTimestamp();
  const status = sanitizeInline(options.status, 'completed');
  const summary = sanitizeInline(options.summary, 'No summary provided');
  const validation = sanitizeInline(options.validation, 'Not recorded');
  appendSessionEntry(
    sessionPath,
    `## Session result\n\n- Ended: ${timestamp.readable}\n- Status: ${status}\n- Summary: ${summary}\n- Validation: ${validation}`,
  );
  writeFileSync(
    lastSessionPath,
    `${relativeToWorkspace(sessionPath)}\n`,
    'utf8',
  );
  unlinkSync(currentSessionPath);
  process.stdout.write(`${relativeToWorkspace(sessionPath)}\n`);
}

const [command, ...argumentValues] = process.argv.slice(2);
const options = parseArguments(argumentValues);

try {
  if (command === 'start') startSession(options);
  else if (command === 'note') noteSession(options);
  else if (command === 'end') endSession(options);
  else {
    throw new Error('Usage: session-log.mjs <start|note|end> [--key=value]');
  }
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
