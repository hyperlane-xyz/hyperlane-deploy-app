import { useStore } from '../features/store';

export function useCardNav() {
  return useStore((s) => ({ page: s.cardPage, direction: s.direction, setPage: s.setCardPage }));
}
