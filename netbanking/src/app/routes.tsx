import { Navigate, type RouteObject } from 'react-router';
import { CARDS_PATH, CardsPage } from '@features/cards';
import { OverviewPage } from '@features/overview';
import { PAYMENT_PATH, PaymentPage } from '@features/payments';
import { TRANSACTIONS_PATH, TransactionsPage } from '@features/transactions';
import { TRANSFER_PATH, TransferPage } from '@features/transfers';
import { AuthenticatedLayout, ProfileRoute, SignInRoute } from './route-elements';
import { PROFILE_PATH } from '@features/profile';

export const routes: RouteObject[] = [
  { path: '/sign-in', element: <SignInRoute /> },
  {
    element: <AuthenticatedLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: TRANSACTIONS_PATH, element: <TransactionsPage /> },
      { path: TRANSFER_PATH, element: <TransferPage /> },
      { path: PAYMENT_PATH, element: <PaymentPage /> },
      { path: CARDS_PATH, element: <CardsPage /> },
      { path: PROFILE_PATH, element: <ProfileRoute /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];
