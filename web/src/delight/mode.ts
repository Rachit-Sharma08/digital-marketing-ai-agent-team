// The delight layer's switches, from the viewer's settings and the URL. Sarah mode (Settings, or ?sarah=1) turns off
// every joke, ambient life, sound and easter egg: a plain dashboard with the same information. Sounds also need the
// chime setting (off by default); reduced motion (system or Settings) keeps the jokes but stills them.

export type DelightMode = {
  sarah: boolean; // HR-approved: nothing silly on screen
  jokes: boolean; // chili spills, trophies, Naina's thought bubble, the ceremony's names and Team Lead
  ambient: boolean; // day and night through the windows, Meera's bobblehead
  eggs: boolean; // easter eggs
  sounds: boolean; // any sound at all
  motion: boolean; // animations
  trips: boolean; // idle bots get up for coffee (needs ambient life and motion)
};

export type DelightInput = { tobyPref: boolean; search: string; chime: boolean; reduceMotion: boolean };

const ON = new Set(['1', 'true', 'on', 'yes']);

export const tobyFromUrl = (search: string): boolean => ON.has((new URLSearchParams(search).get('sarah') ?? '').toLowerCase());

export function delightMode({ tobyPref, search, chime, reduceMotion }: DelightInput): DelightMode {
  const sarah = tobyPref || tobyFromUrl(search);
  const motion = !reduceMotion;
  return { sarah, jokes: !sarah, ambient: !sarah, eggs: !sarah, sounds: chime && !sarah, motion, trips: !sarah && motion };
}
