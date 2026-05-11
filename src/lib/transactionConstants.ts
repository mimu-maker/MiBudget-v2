export const SETTLED_STATUSES = ['Complete', 'Excluded', 'Pending Reconciliation', 'Reconciled'] as const;

export type SettledStatus = typeof SETTLED_STATUSES[number];

export const isSettled = (tx: { status?: string | null }, duplicateIds?: Set<string>): boolean =>
  SETTLED_STATUSES.includes(tx.status as SettledStatus) || (duplicateIds?.has((tx as any).id) ?? false);
