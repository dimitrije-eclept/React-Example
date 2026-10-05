import type { Http } from '@shared/api';
import { networkError, parsePayload, toDomainError } from '@shared/adapters';
import { err } from '@shared/domain';
import type { ProfilePort } from '../../ports/profile.port';
import { toProfile } from './mappers';
import { profileEnvelopeSchema } from './schemas';

export function createLegacyBankProfile(http: Http): ProfilePort {
  return {
    async getProfile() {
      const sent = await http.send({ method: 'GET', path: '/usr/profile' });
      if (sent.isErr()) return err(networkError());
      if (sent.value.status !== 200) return err(toDomainError(sent.value));
      return parsePayload(profileEnvelopeSchema, sent.value.body, 'GET /usr/profile').map(
        toProfile,
      );
    },
  };
}
