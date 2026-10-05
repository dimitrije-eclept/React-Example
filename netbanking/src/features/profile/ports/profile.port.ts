import type { PortResult } from '@shared/domain';
import type { Profile } from '../domain/profile';

export interface ProfilePort {
  getProfile(): PortResult<Profile>;
}
