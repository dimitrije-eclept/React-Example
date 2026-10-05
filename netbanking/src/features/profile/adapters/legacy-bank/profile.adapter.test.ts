import { describe, expect, it } from 'vitest';
import { createTestHttp, legacyBankHandlers, server } from '@shared/test';
import { createLegacyBankProfile } from './profile.adapter';

describe('legacy-bank profile adapter', () => {
  it('unwraps USER and converts lastLogin from epoch seconds (MESS-57..60)', async () => {
    server.use(...legacyBankHandlers);
    const result = await createLegacyBankProfile(createTestHttp()).getProfile();
    expect(result._unsafeUnwrap()).toEqual({
      firstName: 'Marko',
      lastName: 'Petrović',
      email: 'marko.petrovic@example.rs',
      phone: '+381641234567',
      signedInAt: new Date(1_791_186_828_000),
    });
  });
});
