// The Hermes bots of the example roster (docs/ARCHITECTURE.md): which profile keys exist, what each does, and the team member
// each sits as by default (DEFAULT_SEATS; ~/.agents-ka-ghar/config.yaml `seats:` can move them). Every Hermes
// whitelist (chat, headshots, tasks) is derived from this list.

export type RosterEntry = {
  readonly profile: string; // Hermes profile key, e.g. 'campaigns'
  readonly personId: string; // Person.id, e.g. 'meera'
  readonly role: string; // what the bot does, shown in the UI
};

export const ROSTER: ReadonlyArray<RosterEntry> = Object.freeze([
  { profile: 'chief', personId: 'aanya', role: 'Chief of staff: questions & handoffs' },
  { profile: 'cmo', personId: 'zara', role: 'Council: marketing (CMO)' },
  { profile: 'campaigns', personId: 'meera', role: 'Campaigns & outreach' },
  { profile: 'cfo', personId: 'fatima', role: 'Council: finance (CFO)' },
  { profile: 'teacher', personId: 'neha', role: 'Teacher' },
  { profile: 'social', personId: 'priya', role: 'Content manager' },
  { profile: 'skool', personId: 'aisha', role: 'Skool community' },
  { profile: 'ai-strategist', personId: 'tara', role: 'Council: AI strategy' },
  { profile: 'strategist', personId: 'sophia', role: 'Council: strategy' },
  { profile: 'tech', personId: 'sadiq', role: 'CTO: leads Ops and R&D' },
  { profile: 'general', personId: 'maya', role: 'General assistant' },
  { profile: 'health', personId: 'isabella', role: 'Personal health' },
].map((e) => Object.freeze(e)));

const BY_PROFILE: ReadonlyMap<string, RosterEntry> = new Map(ROSTER.map((e) => [e.profile, e]));
const BY_PERSON: ReadonlyMap<string, RosterEntry> = new Map(ROSTER.map((e) => [e.personId, e]));

/** The built-in seating: each Hermes bot at its team member's desk (config `seats:` overrides it). */
export const DEFAULT_SEATS: Readonly<Record<string, { readonly adapter: 'hermes'; readonly agent: string }>> = Object.freeze(
  Object.fromEntries(ROSTER.map((e) => [e.personId, Object.freeze({ adapter: 'hermes' as const, agent: e.profile })])),
);

export const BOT_PROFILES: ReadonlyArray<string> = Object.freeze(ROSTER.map((e) => e.profile));

export function isBotProfile(value: unknown): value is string {
  return typeof value === 'string' && BY_PROFILE.has(value);
}

export function rosterEntry(profile: string): RosterEntry | undefined {
  return BY_PROFILE.get(profile);
}

export function personForProfile(profile: string | null | undefined): string | undefined {
  return profile ? BY_PROFILE.get(profile)?.personId : undefined;
}

export function profileForPerson(personId: string | null | undefined): string | undefined {
  return personId ? BY_PERSON.get(personId)?.profile : undefined;
}
