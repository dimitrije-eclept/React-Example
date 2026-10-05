import type { Profile } from '../../domain/profile';
import type { ProfileEnvelope } from './schemas';

export function toProfile({ USER: user }: ProfileEnvelope): Profile {
  return {
    firstName: user.FirstName,
    lastName: user.LastName,
    email: user.eMail,
    phone: user.Phone,
    // MESS-60: updated at every sign-in, so this is the current session, not the previous one.
    signedInAt: new Date(Number(user.lastLogin) * 1000),
  };
}
