// Turns CLI flags into the server's environment (flags win over env), and works out the URL to open. Pure.
import path from 'node:path';
import type { CliOptions } from './args.ts';

export type Env = Readonly<Record<string, string | undefined>>;

const DEFAULT_PORT = '4318';
const WILDCARD_OR_LOOPBACK = new Set(['', '0.0.0.0', '::', '127.0.0.1', '::1', 'localhost']);

export function expandHome(value: string, home: string): string {
  if (value === '~') return home;
  return value.startsWith('~/') ? (home.startsWith('/') ? path.posix.join(home, value.slice(2)) : path.join(home, value.slice(2))) : value;
}

export function serverEnv(options: CliOptions, base: Env, ctx: { home: string; webDist: string }): Env {
  const resolveDir = (dir: string) => {
    const expanded = expandHome(dir, ctx.home);
    return expanded.startsWith('/') ? path.posix.normalize(expanded) : path.resolve(expanded);
  };
  return {
    ...base,
    AKG_SERVE_WEB: '1',
    AKG_WEB_DIST: ctx.webDist,
    ...(options.port === undefined ? {} : { AKG_PORT: String(options.port) }),
    ...(options.hermesHome === undefined ? {} : { HERMES_HOME: resolveDir(options.hermesHome) }),
    ...(options.portraits === undefined ? {} : { AKG_PORTRAITS_DIR: resolveDir(options.portraits) }),
    ...(options.demo ? { AKG_SOURCE: 'demo' } : {}),
    ...(options.speed === undefined ? {} : { AKG_DEMO_SPEED: String(options.speed) }),
    ...(options.allowWrites ? { AKG_ALLOW_WRITES: '1' } : {}),
  };
}

/** Where a browser on this machine finds the office: loopback for local and wildcard binds. */
export function browserUrl(env: Env): string {
  const host = (env.AKG_HOST ?? '').trim();
  const shown = WILDCARD_OR_LOOPBACK.has(host) ? '127.0.0.1' : host.includes(':') ? `[${host}]` : host;
  return `http://${shown}:${env.AKG_PORT?.trim() || DEFAULT_PORT}/`;
}

/** The platform's "open this URL" program, run without a shell. */
export function openCommand(platform: NodeJS.Platform, url: string): { file: string; args: string[] } | null {
  if (platform === 'darwin') return { file: 'open', args: [url] };
  if (platform === 'win32') return { file: 'cmd', args: ['/c', 'start', '""', url] };
  if (platform === 'linux' || platform === 'freebsd' || platform === 'openbsd') return { file: 'xdg-open', args: [url] };
  return null;
}
