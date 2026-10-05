// Public API of the profile feature. Other features and app/ import only from here.
export type { Profile } from './domain/profile';
export type { ProfilePort } from './ports/profile.port';
export { createLegacyBankProfile } from './adapters/legacy-bank/profile.adapter';
export { profileKeys, useProfile } from './queries/profile';
export { PROFILE_PATH } from './ui/links';
export { ProfilePage } from './ui/ProfilePage';
