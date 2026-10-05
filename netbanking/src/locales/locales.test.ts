import { describe, expect, it } from 'vitest';
import en from './en.json';
import sr from './sr.json';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Flattened keys with plural suffixes removed (languages have different plural forms). */
function keys(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keys(value, `${prefix}${key}.`)
      : [`${prefix}${key.replace(PLURAL_SUFFIX, '')}`],
  );
}

describe('locales', () => {
  it('sr and en define the same keys', () => {
    expect([...new Set(keys(sr))].sort()).toEqual([...new Set(keys(en))].sort());
  });
});
