import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGateway } from '@app/gateway-context';
import { orThrow, type DomainError } from '@shared/domain';
import type { Card, CardId } from '../domain/card';

export const cardKeys = {
  all: ['cards'] as const,
};

export function useCards() {
  const { cards } = useGateway();
  return useQuery({
    queryKey: cardKeys.all,
    queryFn: () => orThrow(cards.listCards()),
    staleTime: 30_000,
  });
}

type BlockVariables = { readonly id: CardId; readonly blocked: boolean };

/** Blocks or unblocks; the list updates as soon as the bank confirms. */
export function useSetCardBlocked() {
  const { cards } = useGateway();
  const queryClient = useQueryClient();
  return useMutation<void, DomainError, BlockVariables>({
    mutationFn: ({ id, blocked }) => orThrow(cards.setBlocked(id, blocked)),
    onSuccess: (_, { id, blocked }) => {
      queryClient.setQueryData<readonly Card[]>(cardKeys.all, (current) =>
        current?.map((card) => (card.id === id ? { ...card, blocked } : card)),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cardKeys.all }),
  });
}
