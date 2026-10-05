import { useGateway } from '@app/gateway-context';
import type { AuthPort } from '../ports/auth.port';

/** Sign-in is a flow, not cached data: the UI drives the port through the sign-in machine. */
export function useAuthPort(): AuthPort {
  return useGateway().auth;
}
