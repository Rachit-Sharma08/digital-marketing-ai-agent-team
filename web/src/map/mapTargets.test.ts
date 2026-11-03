import { describe, expect, it } from 'vitest';
import { DEMO_SNAPSHOT } from '@shared/fixtures/demo-snapshot';
import { SEATS } from '@shared/office';
import { project } from '../iso/projection';
import { areaFrame, mapTargets, personFocusPoint } from './mapTargets';
import { placementsFor, signsFor } from './mapModel';

const placements = placementsFor(DEMO_SNAPSHOT);
const signs = signsFor(DEMO_SNAPSHOT);

describe('map targets for keyboard navigation', () => {
  it('lists every person, every room sign you can open and Fatima\'s ledger', () => {
    const targets = mapTargets(DEMO_SNAPSHOT, placements, signs, new Set());
    expect(targets.filter((t) => t.key.startsWith('person:'))).toHaveLength(23);
    expect(targets.filter((t) => t.key.startsWith('area:')).map((t) => t.key).sort()).toEqual(
      ['area:annex', 'area:breakroom', 'area:bullpen', 'area:conference', 'area:ledger', 'area:reception', 'area:warehouse'],
    );
  });

  it('leaves out people hidden by a fleet filter', () => {
    const targets = mapTargets(DEMO_SNAPSHOT, placements, signs, new Set(['simran', 'aanya']));
    expect(targets.map((t) => t.key)).not.toContain('person:simran');
    expect(targets.filter((t) => t.key.startsWith('person:'))).toHaveLength(21);
  });
});

describe('camera targets', () => {
  it('a person\'s focus point sits just above their seat, wherever they are drawn', () => {
    const zara = placements.find((p) => p.personId === 'zara')!;
    expect(zara.seatId).toMatch(/^seat\.conf\./);
    const seat = SEATS.find((s) => s.id === zara.seatId)!;
    const base = project(seat);
    const pt = personFocusPoint(placements, 'zara')!;
    expect(Math.abs(pt.x - base.x)).toBeLessThan(5);
    expect(pt.y).toBeLessThan(base.y);
    expect(base.y - pt.y).toBeLessThan(60);
    expect(personFocusPoint(placements, 'nobody')).toBeNull();
  });

  it('frames an area by its floor (and bays) on screen', () => {
    const b = areaFrame('conference')!;
    expect(b.maxX).toBeGreaterThan(b.minX);
    expect(b.maxY).toBeGreaterThan(b.minY);
    expect(areaFrame('nowhere')).toBeNull();
  });
});
