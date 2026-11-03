import { describe, expect, it } from 'vitest';
import { formatPortraitReport, portraitReport } from '../src/portraitCheck.ts';

const PEOPLE = [
  { id: 'meera', name: 'Meera Kaur', bot: true },
  { id: 'simran', name: 'Simran Gill', bot: false },
  { id: 'maya', name: 'Maya', bot: true },
  { id: 'sunita', name: 'Sunita Verma', bot: false },
];

describe('portraitReport', () => {
  it('sorts people into have / lack a local portrait and lists stray files', () => {
    const report = portraitReport(PEOPLE, ['simran.jpg', 'maya.png', 'hank.jpg', 'SOURCES.md', 'raw', 'Meera.JPG']);
    expect(report.have).toEqual([{ id: 'simran', name: 'Simran Gill', file: 'simran.jpg' }, { id: 'maya', name: 'Maya', file: 'maya.png' }]);
    expect(report.missing).toEqual([{ id: 'meera', name: 'Meera Kaur', fallback: 'bot headshot' }, { id: 'sunita', name: 'Sunita Verma', fallback: 'drawn' }]);
    expect(report.ignored).toEqual(['Meera.JPG', 'hank.jpg']);
  });

  it('prefers .jpg like the server does', () => {
    expect(portraitReport(PEOPLE, ['simran.png', 'simran.jpg']).have[0]).toMatchObject({ id: 'simran', file: 'simran.jpg' });
  });

  it('formats a readable summary', () => {
    const text = formatPortraitReport(portraitReport(PEOPLE, ['simran.jpg']), '~/.agents-ka-ghar/portraits');
    expect(text).toContain('~/.agents-ka-ghar/portraits');
    expect(text).toMatch(/Have a portrait \(1\)/);
    expect(text).toMatch(/No portrait \(3\)/);
    expect(text).toMatch(/sunita\s+Sunita Verma\s+drawn character/);
    expect(text).toMatch(/meera\s+Meera Kaur\s+bot headshot/);
  });
});
