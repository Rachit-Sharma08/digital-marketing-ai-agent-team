// The map's "needs you": a raised hand with a "?" over whoever is asking, Aanya's reception phone ringing while
// anyone needs you, and Sarah's desk labelled as the approvals inbox.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEMO_OFFICE } from '@shared/fixtures/demo-approvals';
import { DEMO_SNAPSHOT } from '@shared/fixtures/demo-snapshot';
import { FURNITURE } from '@shared/office';
import { occupantsBySeat, phoneSpot, placementsFor } from './mapModel';
import { PersonFigure } from './PersonFigure';
import { ReceptionPhone } from './ReceptionPhone';
import { receptionDeskParts, receptionPhoneSpot } from './parts/referenceParts';

const occupant = (s: typeof DEMO_OFFICE, id: string) => [...occupantsBySeat(s, placementsFor(s)).values()].find((o) => o.person.id === id)!;

describe('needs you on the map', () => {
  it('finds the phone on Aanya\'s reception desk, where the desk draws it', () => {
    const desk = FURNITURE.find((f) => f.kind === 'reception-desk')!;
    const spot = receptionPhoneSpot(desk);
    const phone = receptionDeskParts(desk).find((p) => p.id.endsWith('.phone')) as unknown as { box: { x: number; y: number; z: number; w: number; d: number } };
    expect(spot.x).toBeCloseTo(phone.box.x + phone.box.w / 2, 5);
    expect(spot.y).toBeCloseTo(phone.box.y + phone.box.d / 2, 5);
    expect(spot.z).toBeGreaterThan(phone.box.z);
    expect(phoneSpot()).not.toBeNull();
  });

  it('marks who is asking, and says so in the label even when their status says something else', () => {
    expect(occupant(DEMO_OFFICE, 'aisha')).toMatchObject({ asking: true, label: 'Aisha Malik — skool — needs you' });
    expect(occupant(DEMO_OFFICE, 'sadiq')).toMatchObject({ asking: true, label: expect.stringContaining('Safina Ahmed') });
    expect(occupant(DEMO_OFFICE, 'meera')).toMatchObject({ asking: false, label: 'Meera Kaur — campaigns — working' });
    expect(occupant(DEMO_SNAPSHOT, 'aisha').asking).toBe(false);
  });

  it('labels Sarah as the HR approvals inbox, still without a bot', () => {
    expect(occupant(DEMO_OFFICE, 'sarah').label).toBe('Sarah D Souza — no bot yet — HR · Approvals, 4 waiting');
    expect(occupant(DEMO_SNAPSHOT, 'sarah').label).toBe('Sarah D Souza — no bot yet — HR · Approvals');
  });

  it('draws a raised hand and a "?" bubble over someone who is asking, and nothing otherwise', () => {
    const aisha = occupant(DEMO_OFFICE, 'aisha');
    const props = { person: aisha.person, presence: aisha.presence, facing: 's' as const, label: aisha.label, lift: -15, walking: false, onOpen: () => {} };
    const asking = renderToStaticMarkup(<svg><PersonFigure {...props} asking /></svg>);
    expect(asking).toContain('class="raised-hand"');
    expect(asking).toContain('data-asking="true"');
    expect(asking).toMatch(/<text[^>]*>\?<\/text>/);
    expect(renderToStaticMarkup(<svg><PersonFigure {...props} asking={false} /></svg>)).not.toContain('raised-hand');
  });

  it('rings the phone while anyone needs you, quietly otherwise', () => {
    const ringing = renderToStaticMarkup(<svg><ReceptionPhone x={10} y={20} k={1} count={3} /></svg>);
    expect(ringing).toContain('reception-phone is-ringing');
    expect(ringing).toContain('>3<');
    const quiet = renderToStaticMarkup(<svg><ReceptionPhone x={10} y={20} k={1} count={0} /></svg>);
    expect(quiet).not.toContain('is-ringing');
    expect(quiet).not.toContain('ring-arc');
  });
});
