import { describe, expect, it } from 'vitest';
import { passwordStrength } from './AccountDialogs';

describe('passwordStrength', () => {
  it.each([
    ['', 'Weak'], ['abc', 'Weak'], ['abcdef', 'Weak'], ['abcdef1', 'Fair'], ['Abcdef1', 'Good'], ['Abcdefghij1!', 'Strong'],
  ])('%s → %s', (pw, label) => expect(passwordStrength(pw).label).toBe(label));
});
