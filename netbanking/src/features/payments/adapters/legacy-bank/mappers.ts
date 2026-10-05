import type { PaymentId, PaymentState, PaymentStatus } from '../../domain/payment';
import type { StatusResponse } from './schemas';

// MESS-7: short state codes.
const STATES: Readonly<Record<StatusResponse['state'], PaymentState>> = {
  INIT: 'awaiting_authorization',
  PEND: 'processing',
  EXEC: 'executed',
  REJ: 'rejected',
  CANC: 'cancelled',
};

const BANK_ZONE = 'Europe/Belgrade';

/** Offset of `zone` from UTC at `instant`, in ms (e.g. +2 h in summer for Belgrade). */
function zoneOffsetMs(instant: number, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
  return asUtc - instant;
}

/** MESS-8, MESS-52: "02.10.2026 14:33" is Belgrade wall-clock time without a zone. */
export function fromBelgradeDateTime(text: string): Date {
  const [date, time] = text.split(' ');
  const [day, month, year] = date!.split('.').map(Number);
  const [hour, minute] = time!.split(':').map(Number);
  const wallClockAsUtc = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  // Two passes settle the offset also right after a DST change.
  const first = wallClockAsUtc - zoneOffsetMs(wallClockAsUtc, BANK_ZONE);
  return new Date(wallClockAsUtc - zoneOffsetMs(first, BANK_ZONE));
}

export function toPaymentStatus(response: StatusResponse): PaymentStatus {
  return {
    id: response.paymentRef as PaymentId,
    state: STATES[response.state],
    changedAt: fromBelgradeDateTime(response.stateDt),
  };
}

/** Domain field names for the bank's 422 `fld` values (MESS-3). */
export const ORDER_FIELDS: Readonly<Record<string, string>> = {
  debtorAcc: 'from',
  currency: 'from',
  creditorIban: 'recipientIban',
  creditorName: 'recipientName',
  amount: 'amount',
  purposeCode: 'purposeCode',
  reference: 'reference',
  description: 'description',
};
