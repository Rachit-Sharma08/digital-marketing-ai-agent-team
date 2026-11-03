import { describe, expect, it } from 'vitest';
import { shortName } from './names';

describe('shortName', () => {
  it('is the first name', () => {
    expect(shortName('Meera Kaur')).toBe('Meera');
    expect(shortName('Sadiq')).toBe('Sadiq');
    expect(shortName('J.A.R.V.I.S.')).toBe('J.A.R.V.I.S.');
  });

  it('keeps a title with the name it belongs to', () => {
    expect(shortName('Isabella D Costa')).toBe('Isabella');
    expect(shortName('Dr. Kapoor')).toBe('Dr. Kapoor');
  });
});
