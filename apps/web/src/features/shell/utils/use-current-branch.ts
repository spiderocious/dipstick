import { useBranches, type BranchWire } from '@dipstick/api';
import { useParams } from 'react-router-dom';

// Resolves the "current branch" for branch-scoped nav. Prefers the :branchId in the URL;
// otherwise falls back to the first visible branch (so a global screen can still target one).
export function useCurrentBranch(): {
  branchId: string;
  branches: BranchWire[];
  isLoading: boolean;
} {
  const params = useParams<{ branchId?: string }>();
  const { data, isLoading } = useBranches();
  const branches = data ?? [];
  const urlId = params.branchId ?? '';
  const fallback = branches[0]?.id ?? '';
  return { branchId: urlId !== '' ? urlId : fallback, branches, isLoading };
}
