import type { PortResult } from '@shared/domain';
import type { Card, CardId } from '../domain/card';

export interface CardsPort {
  listCards(): PortResult<readonly Card[]>;
  /** Blocks (or unblocks) a card at once. */
  setBlocked(id: CardId, blocked: boolean): PortResult<void>;
}
