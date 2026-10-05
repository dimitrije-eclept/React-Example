import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMachine } from '@xstate/react';
import { useTranslation } from 'react-i18next';
import { fromPromise } from 'xstate';
import { useAccounts } from '@features/accounts';
import { transactionsHref } from '@features/transactions';
import { Card, QueryErrorAlert, Skeleton, StepIndicator } from '@shared/ui';
import { paymentMachine, pollDelayMs } from '../machines/payment.machine';
import { usePaymentsPort, useRefreshBalances } from '../queries/payments';
import { PaymentConfirm } from './PaymentConfirm';
import { PaymentDetailsForm } from './PaymentDetailsForm';
import { PaymentStatusView } from './PaymentStatusView';

type PaymentPageProps = {
  /** Where "Cancel" and "Back to overview" lead. */
  readonly homeHref?: string;
  /** First status polling interval (it backs off from there); shorter in tests. */
  readonly pollIntervalMs?: number;
};

/** Domestic payment in three steps: details → confirm with SMS code → status. */
export function PaymentPage({ homeHref = '/', pollIntervalMs }: PaymentPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const port = usePaymentsPort();
  const refreshBalances = useRefreshBalances();
  const accounts = useAccounts();
  const container = useRef<HTMLDivElement>(null);

  const [machine] = useState(() =>
    paymentMachine.provide({
      actors: {
        preparePayment: fromPromise(({ input }) => port.preparePayment(input)),
        authorizePayment: fromPromise(({ input }) => port.authorizePayment(input.id, input.code)),
        getPaymentStatus: fromPromise(({ input }) => port.getPaymentStatus(input)),
      },
      ...(pollIntervalMs === undefined
        ? {}
        : {
            delays: {
              pollInterval: ({ context }) => pollDelayMs(context.statusChecks ?? 0, pollIntervalMs),
            },
          }),
    }),
  );
  const [snapshot, send] = useMachine(machine);
  const { context } = snapshot;

  const step =
    snapshot.matches('editing') || snapshot.matches('preparing')
      ? 0
      : snapshot.matches('awaitingCode') || snapshot.matches('authorizing')
        ? 1
        : 2;

  // A new step replaces the content: move focus to its heading so screen readers follow, unless
  // the step already focused its main field (the code input on the confirm step).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (container.current?.contains(document.activeElement)) return;
    container.current?.querySelector<HTMLElement>('[data-step-heading]')?.focus();
  }, [step]);

  // Authorising reserves funds; finishing books or releases them.
  const finished = snapshot.matches('finished');
  useEffect(() => {
    if (step === 2) refreshBalances();
  }, [step, finished, refreshBalances]);

  // No answer to the code: the bank may have authorised it and reserved the funds anyway.
  const { codeError } = context;
  useEffect(() => {
    if (codeError?.kind === 'unavailable' || codeError?.kind === 'unknown') refreshBalances();
  }, [codeError, refreshBalances]);

  const payer = accounts.data?.find((account) => account.number === context.order?.from);

  return (
    <div ref={container} className="flex flex-col gap-6">
      <StepIndicator
        label={t('payments.steps.label')}
        current={step}
        steps={[
          t('payments.steps.details'),
          t('payments.steps.confirm'),
          t('payments.steps.status'),
        ]}
      />

      {/* Keyed by step: each new step enters with a short fade. */}
      <div key={step} className="flex animate-enter flex-col gap-6">
        {step === 0 && accounts.error && (
          <QueryErrorAlert
            error={accounts.error}
            retrying={accounts.isFetching}
            onRetry={() => void accounts.refetch()}
            staleSince={accounts.data ? new Date(accounts.dataUpdatedAt) : undefined}
          />
        )}
        {step === 0 && accounts.isPending && (
          <Card className="flex max-w-[760px] flex-col gap-5 p-6" aria-busy="true">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </Card>
        )}
        {step === 0 && accounts.data && (
          <PaymentDetailsForm
            accounts={accounts.data}
            order={context.order}
            pending={snapshot.matches('preparing')}
            error={context.prepareError}
            onReview={(order) => send({ type: 'REVIEW', order })}
            cancelHref={homeHref}
          />
        )}

        {step === 1 && context.order && context.challenge && (
          <PaymentConfirm
            order={context.order}
            payer={payer}
            challenge={context.challenge}
            pending={snapshot.matches('authorizing')}
            error={context.codeError}
            onSubmitCode={(code) => send({ type: 'SUBMIT_CODE', code })}
            onEdit={() => send({ type: 'EDIT' })}
            onCancel={() => void navigate(homeHref, { viewTransition: true })}
          />
        )}

        {step === 2 && context.order && context.challenge && (
          <PaymentStatusView
            order={context.order}
            payer={payer}
            challenge={context.challenge}
            preparedAt={context.preparedAt}
            authorizedAt={context.authorizedAt}
            outcome={context.outcome}
            stalled={snapshot.matches('stalled')}
            pollError={context.pollError}
            onCheckAgain={() => send({ type: 'CHECK_STATUS' })}
            overviewHref={homeHref}
            historyHref={transactionsHref(context.order.from)}
            onNewPayment={() => send({ type: 'NEW_PAYMENT' })}
          />
        )}
      </div>
    </div>
  );
}
