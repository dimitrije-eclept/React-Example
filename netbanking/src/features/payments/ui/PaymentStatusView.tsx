import { useTranslation } from 'react-i18next';
import { useAccountName, type Account } from '@features/accounts';
import type { DomainError } from '@shared/domain';
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  ClockIcon,
  formatMoney,
  intlLocale,
  RetryIcon,
  Timeline,
  type ChipTone,
  type TimelineItem,
} from '@shared/ui';
import type { PaymentChallenge, PaymentOrder } from '../domain/payment';
import type { PaymentOutcome } from '../machines/payment.machine';

type PaymentStatusViewProps = {
  readonly order: PaymentOrder;
  readonly payer?: Account;
  readonly challenge: PaymentChallenge;
  readonly preparedAt?: Date;
  readonly authorizedAt?: Date;
  /** Missing while the bank is still processing. */
  readonly outcome?: PaymentOutcome;
  /** Still processing, but automatic status checks have stopped. */
  readonly stalled?: boolean;
  /** The last status check failed; it is retried automatically. */
  readonly pollError?: DomainError;
  readonly overviewHref: string;
  /** Where the customer can see whether the payment went through. */
  readonly historyHref?: string;
  readonly onNewPayment: () => void;
  readonly onCheckAgain: () => void;
};

export function PaymentStatusView({
  order,
  payer,
  challenge,
  preparedAt,
  authorizedAt,
  outcome,
  stalled = false,
  pollError,
  overviewHref,
  historyHref,
  onNewPayment,
  onCheckAgain,
}: PaymentStatusViewProps) {
  const { t, i18n } = useTranslation();
  const accountName = useAccountName();
  const when = (date: Date | undefined) =>
    date &&
    new Intl.DateTimeFormat(intlLocale(i18n.language), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  const values = {
    amount: formatMoney(order.amount),
    recipient: order.recipientName,
    account: payer ? accountName(payer) : order.from,
  };

  const kind = outcome?.kind ?? 'processing';
  const funds = outcome?.kind === 'rejected' && outcome.reason === 'insufficient_funds';
  const headlines: Record<typeof kind, { chip: ChipTone; title: string; text: string }> = {
    processing: stalled
      ? {
          chip: 'pending',
          title: t('payments.status.stalledTitle'),
          text: t('payments.status.stalledText', values),
        }
      : {
          chip: 'pending',
          title: t('payments.status.processingTitle'),
          text: t('payments.status.processingText', values),
        },
    executed: {
      chip: 'positive',
      title: t('payments.status.executedTitle'),
      text: t('payments.status.executedText', values),
    },
    rejected: funds
      ? {
          chip: 'negative',
          title: t('payments.status.fundsTitle'),
          text: t('payments.status.fundsText', values),
        }
      : {
          chip: 'negative',
          title: t('payments.status.rejectedTitle'),
          text: t('payments.status.rejectedText'),
        },
    cancelled: {
      chip: 'muted',
      title: t('payments.status.cancelledTitle'),
      text: t('payments.status.cancelledText'),
    },
    not_found: {
      chip: 'muted',
      title: t('payments.status.notFoundTitle'),
      text: t('payments.status.notFoundText'),
    },
  };
  const headline = headlines[kind];

  const timeline: TimelineItem[] | null =
    kind === 'processing' || kind === 'executed'
      ? [
          { title: t('payments.status.created'), detail: when(preparedAt), state: 'done' },
          {
            title: t('payments.status.confirmed'),
            detail: [when(authorizedAt), t('payments.status.reserved')].filter(Boolean).join(' · '),
            state: 'done',
          },
          {
            title: t('payments.status.bankProcessing'),
            detail:
              kind === 'processing'
                ? t(stalled ? 'payments.status.noAutoUpdate' : 'payments.status.autoUpdate')
                : undefined,
            state: kind === 'processing' ? 'current' : 'done',
          },
          {
            title: t('payments.status.executed'),
            detail: outcome?.kind === 'executed' ? when(outcome.at) : undefined,
            state: kind === 'executed' ? 'done' : 'next',
          },
        ]
      : null;

  return (
    <Card as="section" className="flex max-w-[760px] flex-col gap-6 p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Only the headline is live: a status change is announced, not the whole card. */}
        <div className="flex flex-col gap-1.5" aria-live="polite" aria-atomic="true">
          <Chip tone={headline.chip} className="h-[26px] self-start px-2.5 text-[13px]">
            {kind === 'processing' && <ClockIcon className="size-[15px]" />}
            {t(`payments.status.chip.${kind}`)}
          </Chip>
          <h1
            tabIndex={-1}
            data-step-heading
            className="text-[30px] font-semibold tracking-tight outline-none"
          >
            {headline.title}
          </h1>
          <p className="text-muted">{headline.text}</p>
        </div>
        <div className="md:text-right">
          <p className="text-[13px] text-muted">{t('payments.status.reference')}</p>
          <p className="font-mono text-[13px]">{challenge.paymentId}</p>
        </div>
      </div>

      {timeline && <Timeline items={timeline} />}

      {kind === 'processing' && (
        <div className="flex flex-col gap-1 rounded-[10px] bg-band px-4 py-3.5 text-[13px]">
          <p>
            <strong>{values.account}:</strong>{' '}
            {t('payments.status.availableLowered', { amount: values.amount })}
          </p>
          <p className="text-muted">{t('payments.status.bookedLater')}</p>
        </div>
      )}

      {pollError && kind === 'processing' && !stalled && (
        <p role="status" className="text-[13px] text-warning-ink">
          {t('payments.status.pollError')}
        </p>
      )}

      <div className="flex flex-wrap gap-2.5">
        {stalled && kind === 'processing' && (
          <Button onClick={onCheckAgain}>
            <RetryIcon />
            {t('payments.status.checkAgain')}
          </Button>
        )}
        {kind === 'not_found' && historyHref ? (
          <ButtonLink to={historyHref}>{t('payments.status.viewHistory')}</ButtonLink>
        ) : (
          <ButtonLink to={overviewHref} variant={stalled ? 'secondary' : 'primary'}>
            {t('payments.status.backToOverview')}
          </ButtonLink>
        )}
        <Button variant="secondary" onClick={onNewPayment}>
          {t('payments.status.newPayment')}
        </Button>
      </div>
    </Card>
  );
}
