import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import os, { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp, type App } from '../src/http/app.ts';
import { createHermesAdapter } from '../src/adapters/hermes.ts';
import { createFixtureSource, loadFixture } from '../src/hermes/fixtureSource.ts';
import { imageType } from '../src/http/images.ts';
import { readPortrait } from '../src/http/portraits.ts';
import { headshotsDirFrom, portraitsDirFrom } from '../src/config.ts';
import type { Runner } from '../src/chat/runner.ts';

const JPEG = (n: number) => Buffer.from([0xff, 0xd8, 0xff, 0xe0, n, n, n]);
const PNG = (n: number) => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, n]);

const root = mkdtempSync(path.join(tmpdir(), 'akg-portraits-'));
const home = path.join(root, 'hermes');
const headshotDir = path.join(root, 'headshots'); // AKG_HEADSHOTS_DIR
const portraitsDir = path.join(root, 'portraits');
mkdirSync(headshotDir, { recursive: true });
mkdirSync(portraitsDir, { recursive: true });
writeFileSync(path.join(headshotDir, 'campaigns.jpg'), JPEG(1)); // Meera's Hermes headshot, no portrait file
writeFileSync(path.join(headshotDir, 'chief.jpg'), JPEG(2)); // Aanya has both: the portrait wins
writeFileSync(path.join(portraitsDir, 'aanya.jpg'), JPEG(3));
writeFileSync(path.join(portraitsDir, 'aanya.png'), PNG(3));
writeFileSync(path.join(portraitsDir, 'simran.jpg'), JPEG(4));
writeFileSync(path.join(portraitsDir, 'maya.png'), PNG(5));
writeFileSync(path.join(portraitsDir, 'isabella.jpg'), JPEG(6));
writeFileSync(path.join(portraitsDir, 'diya.jpg'), 'not an image at all');
mkdirSync(path.join(portraitsDir, 'naina.jpg'));
writeFileSync(path.join(portraitsDir, 'amina.jpg'), JPEG(7));
chmodSync(path.join(portraitsDir, 'amina.jpg'), 0o000); // unreadable
writeFileSync(path.join(portraitsDir, 'secret.jpg'), JPEG(8)); // not a person on the map
writeFileSync(path.join(root, 'outside.jpg'), JPEG(9));

const runner: Runner = async () => ({ stdout: '', stderr: '', code: 0, timedOut: false });
const fixture = loadFixture();
const T = Date.parse(fixture.state.recordedAt) / 1000;

async function start(dir: string | null): Promise<{ app: App; base: string }> {
  const app = createApp({
    adapters: [createHermesAdapter({ source: createFixtureSource({ fixture }), runner, hermesBin: '/fake/hermes', now: () => T })],
    hermesHome: home, headshotDir,
    portraitsDir: dir, pollIntervalMs: 60_000, now: () => T,
  });
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  return { app, base: `http://127.0.0.1:${(app.server.address() as AddressInfo).port}` };
}

let app: App;
let base: string;
beforeAll(async () => ({ app, base } = await start(portraitsDir)));
afterAll(async () => {
  await app.close();
  chmodSync(path.join(portraitsDir, 'amina.jpg'), 0o644);
  rmSync(root, { recursive: true, force: true });
});

// amina.jpg is chmod 000. Windows does not enforce that: chmod only toggles the read-only flag, so the file stays
// readable there and the cases that depend on an unreadable file are POSIX-only.
const UNREADABLE = process.platform === 'win32' ? [] : ['amina'];

const get = (id: string) => fetch(`${base}/api/portraits/${id}`);
const bytes = async (res: Response) => Buffer.from(await res.arrayBuffer());

describe('GET /api/portraits/:personId', () => {
  it('serves a local JPEG portrait with its type, a one-day cache and nosniff', async () => {
    const res = await get('simran');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('cache-control')).toMatch(/max-age=86400/);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await bytes(res)).toEqual(JPEG(4));
  });

  it('serves a .png portrait as image/png and prefers .jpg when both exist', async () => {
    const maya = await get('maya');
    expect(maya.headers.get('content-type')).toBe('image/png');
    expect(await bytes(maya)).toEqual(PNG(5));
    expect(await bytes(await get('aanya'))).toEqual(JPEG(3));
    expect((await get('isabella')).status).toBe(200);
  });

  it("falls back to the Hermes bot headshot for a botted person without a portrait file", async () => {
    const res = await get('meera');
    expect(res.status).toBe(200);
    expect(await bytes(res)).toEqual(JPEG(1));
  });

  it('404s people with neither a portrait nor a bot headshot, and files that are not JPEG/PNG', async () => {
    for (const id of ['sunita', 'aisha', 'diya', 'naina', ...UNREADABLE]) expect((await get(id)).status, id).toBe(404);
  });

  it('only answers for people on the map: no other files, no traversal', async () => {
    const bad = ['secret', '..%2Foutside', '..', '.', 'simran.jpg', 'MEERA', '%2e%2e%2f%2e%2e%2fetc%2fpasswd', 'simran%00', '%E0%A4%A', 'simran%2F', 'hank'];
    for (const id of bad) expect((await get(id)).status, id).toBe(404);
    expect((await fetch(`${base}/api/portraits/`)).status).toBe(404);
    expect((await fetch(`${base}/api/portraits/simran/extra`)).status).toBe(404);
  });

  it('never puts the directory in a response or a log line', async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => (lines.push(String(chunk)), true));
    vi.stubEnv('AKG_QUIET', '0');
    try {
      for (const id of [...UNREADABLE, 'naina', 'diya', 'sunita', 'secret', '..%2Foutside']) {
        const text = await (await get(id)).text();
        expect(text).toBe('{"error":"No portrait"}');
      }
    } finally {
      vi.unstubAllEnvs();
      spy.mockRestore();
    }
    expect(lines.join('')).not.toContain(root);
    expect(lines.join('')).not.toContain(os.homedir());
    if (UNREADABLE.length) expect(lines.some((l) => l.includes('EACCES'))).toBe(true); // the unreadable file is reported, by code only
  });

  it('still falls back to bot headshots when no portraits directory is configured', async () => {
    const other = await start(null);
    try {
      expect((await fetch(`${other.base}/api/portraits/meera`)).status).toBe(200);
      expect((await fetch(`${other.base}/api/portraits/simran`)).status).toBe(404);
    } finally {
      await other.app.close();
    }
  });

  it('keeps /api/headshots/:profile working through the same image code', async () => {
    const res = await fetch(`${base}/api/headshots/campaigns`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('cache-control')).toMatch(/max-age=86400/);
  });
});

describe('portrait helpers', () => {
  it('tells JPEG and PNG apart by their bytes, and refuses anything else', () => {
    expect(imageType(JPEG(0))).toBe('image/jpeg');
    expect(imageType(PNG(0))).toBe('image/png');
    expect(imageType(Buffer.from('GIF89a'))).toBeNull();
    expect(imageType(Buffer.alloc(0))).toBeNull();
  });

  it('reads portraits for allow-listed ids only', async () => {
    const dirs = { portraitsDir, headshotDir };
    expect(await readPortrait('simran', dirs)).toEqual({ body: JPEG(4), contentType: 'image/jpeg' });
    expect(await readPortrait('../outside', dirs)).toBeNull();
    expect(await readPortrait('secret', dirs)).toBeNull();
  });

  it('defaults the portraits directory to ~/.agents-ka-ghar/portraits and expands ~ in AKG_PORTRAITS_DIR', () => {
    // A POSIX home (and a POSIX override) keeps POSIX separators, whatever the host platform.
    expect(portraitsDirFrom(undefined, '/h')).toBe(path.posix.join('/h', '.agents-ka-ghar', 'portraits'));
    expect(portraitsDirFrom('~/pics', '/h')).toBe(path.posix.join('/h', 'pics'));
    expect(portraitsDirFrom('/abs/pics', '/h')).toBe('/abs/pics');
    expect(portraitsDirFrom('', '/h')).toBe(path.posix.join('/h', '.agents-ka-ghar', 'portraits'));
  });

  it('defaults the headshots directory to ~/.agents-ka-ghar/headshots and expands ~ in AKG_HEADSHOTS_DIR', () => {
    expect(headshotsDirFrom(undefined, '/h')).toBe(path.posix.join('/h', '.agents-ka-ghar', 'headshots'));
    expect(headshotsDirFrom('~/bots', '/h')).toBe(path.posix.join('/h', 'bots'));
    expect(headshotsDirFrom('/abs/bots', '/h')).toBe('/abs/bots');
  });
});
