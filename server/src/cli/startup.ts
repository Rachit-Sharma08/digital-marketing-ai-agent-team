// What the CLI checks and prints around starting the server. Pure apart from the injected `exists`.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { isOff, isOn } from '../envFlags.ts';
import { DEMO_TITLE } from '../../../shared/demo/time.ts';
import type { Env } from './env.ts';

export type WebBuildState = 'ready' | 'build' | 'missing';

/** `ready`: the package ships web/dist. `build`: a source checkout with dev dependencies, so build once. */
export function webBuildState(root: string, exists: (p: string) => boolean = existsSync): WebBuildState {
  const joinRoot = root.startsWith('/') ? path.posix.join : path.join;
  if (exists(joinRoot(root, 'web', 'dist', 'index.html'))) return 'ready';
  const checkout = exists(joinRoot(root, 'web', 'src', 'main.tsx')) && exists(joinRoot(root, 'node_modules', 'vite', 'package.json'));
  return checkout ? 'build' : 'missing';
}

const tildify = (p: string, home: string) => {
  const separator = home.startsWith('/') ? '/' : path.sep;
  return p === home || p.startsWith(`${home}${separator}`) ? `~${p.slice(home.length)}` : p;
};

/** The lines printed once the server answers. Never includes the access token. */
export function banner(env: Env, url: string, home: string): string {
  const hermes = tildify(env.HERMES_HOME?.trim() || path.join(home, '.hermes'), home);
  const demo = env.AKG_SOURCE === 'demo';
  const data = demo ? `the demo day, "${DEMO_TITLE}" (fictional; nothing is read from Hermes)`
    : env.AKG_SOURCE === 'fixture' ? 'recorded sample (nothing is read from Hermes)' : `live, from ${hermes} (read only)`;
  const writes = demo ? (isOff(env.AKG_ALLOW_WRITES) ? 'off (read-only)' : 'on, in memory only: the demo bots answer with canned lines')
    : isOn(env.AKG_ALLOW_WRITES)
      ? 'on: chat and task creation reach your bots'
      : 'off (read-only). Restart with --allow-writes to chat with bots and create tasks';
  const signIn = env.AKG_ACCESS_TOKEN?.trim() ? ['  Sign-in: required (the access token in AKG_ACCESS_TOKEN)'] : [];
  return [
    '',
    `  Agents Ka Ghar is open at ${url}`,
    `  Data:    ${data}`,
    `  Writes:  ${writes}`,
    ...signIn,
    '  Stop:    Ctrl+C',
    '',
  ].join('\n');
}
