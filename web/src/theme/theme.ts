// The two lighting modes: Nightshift (the default dim office) and Studio (the warm daytime look).
// Stored per browser; the boot script in index.html paints the saved mode before React loads.
export type Light = 'night' | 'studio';

export const LIGHT_KEY = 'akg.light.v1';

export function storedLight(): Light {
  try {
    return localStorage.getItem(LIGHT_KEY) === 'studio' ? 'studio' : 'night';
  } catch {
    return 'night';
  }
}

export function applyLight(light: Light): void {
  document.documentElement.dataset.light = light;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light === 'night' ? '#0a0d11' : '#1c1b18');
  try { localStorage.setItem(LIGHT_KEY, light); } catch { /* private mode: the mode still applies for this page */ }
}
