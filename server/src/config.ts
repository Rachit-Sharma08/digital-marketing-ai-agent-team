// Server configuration. Everything overridable by env for tests/dev; safe defaults (loopback, read-only).
import { isIP } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isOn } from './envFlags.ts';

export { isOn };

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer in [${min}, ${max}]`);
  return value;
}

/** Bind address (AKG_HOST): 127.0.0.1 unless set. An IP literal or `localhost`; anything beyond loopback needs a token. */
export function parseBindHost(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return '127.0.0.1';
  if (value !== 'localhost' && isIP(value) === 0) throw new Error(`AKG_HOST: "${value}" must be an IP address (e.g. 0.0.0.0) or localhost`);
  return value;
}

export function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '::1' || (isIP(host) === 4 && host.startsWith('127.'));
}


export const HOST = parseBindHost(process.env.AKG_HOST);
/** Read-only unless AKG_ALLOW_WRITES=1: chat, task creation and any future write are refused. */
export const ALLOW_WRITES = isOn(process.env.AKG_ALLOW_WRITES);
export const PORT = intEnv('AKG_PORT', 4318, 1024, 65535);
export const HERMES_HOME = process.env.HERMES_HOME ?? path.join(os.homedir(), '.hermes');
export const HERMES_BIN = process.env.AKG_HERMES_BIN ?? path.join(os.homedir(), '.local', 'bin', 'hermes');
export const HERMES_STATUS_URL = process.env.AKG_STATUS_URL ?? 'http://127.0.0.1:9119/api/status';
export const POLL_INTERVAL_MS = intEnv('AKG_POLL_MS', 5000, 1000, 60_000);
export const CHAT_TIMEOUT_MS = 180_000;
export const KANBAN_TIMEOUT_MS = 30_000;
export const CRON_RUN_TIMEOUT_MS = 30 * 60_000; // `hermes cron run` runs the whole job (HERMES_CRON_TIMEOUT defaults to 600 s idle)
export const MESSAGES_LIMIT = 50;

/** A local directory setting: `~/` expanded; empty or unset = ~/.agents-ka-ghar/<fallback>. */
function localDirFrom(raw: string | undefined, home: string, fallback: string): string {
  const value = raw?.trim();
  const posixStyle = home.startsWith('/') || value?.startsWith('/');
  const api = posixStyle ? path.posix : path;
  if (!value) return api.join(home, '.agents-ka-ghar', fallback);
  const expanded = value === '~' || value.startsWith('~/') ? api.join(home, value.slice(1)) : value;
  return posixStyle ? path.posix.normalize(expanded) : path.resolve(expanded);
}

/** Local photos of the staff (never in the repo): AKG_PORTRAITS_DIR, default ~/.agents-ka-ghar/portraits. */
export function portraitsDirFrom(raw: string | undefined, home: string): string {
  return localDirFrom(raw, home, 'portraits');
}

/** Bot headshots, <profile>.jpg or .png (never in the repo): AKG_HEADSHOTS_DIR, default ~/.agents-ka-ghar/headshots. */
export function headshotsDirFrom(raw: string | undefined, home: string): string {
  return localDirFrom(raw, home, 'headshots');
}

export const PORTRAITS_DIR = portraitsDirFrom(process.env.AKG_PORTRAITS_DIR, os.homedir());
export const HEADSHOT_DIR = headshotsDirFrom(process.env.AKG_HEADSHOTS_DIR, os.homedir());

/** The append-only audit log of approval decisions: AKG_AUDIT_LOG, `~/` expanded, default ~/.agents-ka-ghar/audit.log. */
export function auditLogFrom(raw: string | undefined, home: string): string {
  const value = raw?.trim();
  const posixStyle = home.startsWith('/') || value?.startsWith('/');
  const api = posixStyle ? path.posix : path;
  if (!value) return api.join(home, '.agents-ka-ghar', 'audit.log');
  const expanded = value === '~' || value.startsWith('~/') ? api.join(home, value.slice(1)) : value;
  return posixStyle ? path.posix.normalize(expanded) : path.resolve(expanded);
}

export const AUDIT_LOG = auditLogFrom(process.env.AKG_AUDIT_LOG, os.homedir());
export const SERVE_WEB = process.env.AKG_SERVE_WEB === '1'; // `npm run start`: also serve the built web app at /
export const WEB_DIST = path.resolve(process.env.AKG_WEB_DIST ?? fileURLToPath(new URL('../../web/dist', import.meta.url)));

const VITE_DEV_PORT = 5173;

/**
 * Origins the app is published at besides localhost, e.g. a `tailscale serve` URL
 * (AKG_PUBLIC_ORIGINS="https://box.tailnet.ts.net:4318"). Bare https origins only; the server
 * itself still binds 127.0.0.1, so these are reachable only through that proxy.
 */
export function parsePublicOrigins(raw: string | undefined): ReadonlyArray<string> {
  const entries = (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return entries.map((entry) => {
    let url: URL;
    try {
      url = new URL(entry);
    } catch {
      throw new Error(`AKG_PUBLIC_ORIGINS: "${entry}" is not a URL`);
    }
    if (url.protocol !== 'https:' || url.origin !== entry || url.username || url.password) {
      throw new Error(`AKG_PUBLIC_ORIGINS: "${entry}" must be a bare https origin like https://host.ts.net:4318`);
    }
    return url.origin;
  });
}

export const PUBLIC_ORIGINS = parsePublicOrigins(process.env.AKG_PUBLIC_ORIGINS);

/** Origins allowed to POST: the Vite dev server, the server's own origin (the built app) and any public origins. */
export function allowedOrigins(port: number, publicOrigins: ReadonlyArray<string> = []): ReadonlySet<string> {
  const local = [VITE_DEV_PORT, port].flatMap((p) => [`http://127.0.0.1:${p}`, `http://localhost:${p}`]);
  return new Set([...local, ...publicOrigins]);
}

/** Host names allowed in the Host header besides 127.0.0.1 / localhost: those of the public origins. */
export function allowedHosts(publicOrigins: ReadonlyArray<string>): ReadonlySet<string> {
  return new Set(publicOrigins.map((o) => new URL(o).hostname));
}

export const ALLOWED_ORIGINS: ReadonlySet<string> = allowedOrigins(PORT, PUBLIC_ORIGINS);
export const ALLOWED_HOSTS: ReadonlySet<string> = allowedHosts(PUBLIC_ORIGINS);

export const MIN_TOKEN_LENGTH = 16;

/** `remote`: reachable beyond this machine's loopback (a wider bind or a published origin). `token`: null = no sign-in. */
export type AccessConfig = { readonly remote: boolean; readonly token: string | null };

/**
 * Remote access (AKG_HOST beyond loopback, or AKG_PUBLIC_ORIGINS) requires AKG_ACCESS_TOKEN; a token set on a
 * local server is used too. Errors never include the token itself. `demoOnly`: the server runs only the scripted demo
 * day (AKG_SOURCE=demo: fictional data, writes in memory, no Hermes, photos or files), the same thing the public
 * static demo shows, so it may be reached without a token (Docker's demo needs no setup); a token set still applies.
 */
export function resolveAccess(opts: { host: string; publicOrigins: ReadonlyArray<string>; token: string | undefined; demoOnly?: boolean }): AccessConfig {
  const remote = !isLoopbackHost(opts.host) || opts.publicOrigins.length > 0;
  const token = opts.token?.trim() ? opts.token.trim() : null;
  if (remote && !token && !opts.demoOnly) {
    const why = isLoopbackHost(opts.host) ? 'AKG_PUBLIC_ORIGINS publishes the server' : `AKG_HOST=${opts.host} makes the server reachable from other machines`;
    throw new Error(`${why}; set AKG_ACCESS_TOKEN (at least ${MIN_TOKEN_LENGTH} characters, e.g. \`openssl rand -hex 24\`)`);
  }
  if (token && token.length < MIN_TOKEN_LENGTH) throw new Error(`AKG_ACCESS_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters`);
  return { remote, token };
}
