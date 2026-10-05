import { useQuery } from '@tanstack/react-query';
import { useGateway } from '@app/gateway-context';
import { orThrow } from '@shared/domain';

export const profileKeys = {
  all: ['profile'] as const,
};

/** Changes only between sessions, so it is never refetched within one. */
export function useProfile({ enabled = true }: { readonly enabled?: boolean } = {}) {
  const { profile } = useGateway();
  return useQuery({
    queryKey: profileKeys.all,
    queryFn: () => orThrow(profile.getProfile()),
    staleTime: Infinity,
    enabled,
  });
}
