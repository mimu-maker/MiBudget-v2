export type RecurringInterval = 'Annually' | 'Bi-annually' | 'Quarterly' | 'Monthly' | 'N/A';

export interface FutureTransaction {
  id: string | number;
  date: string;
  source: string;
  amount: number;
  // account: string; // Removed as per request
  // budget: string; // Removed as per request
  category: string;
  stream: string; // Renamed from subCategory
  planned: boolean;
  recurring: RecurringInterval;
  description: string;
  actual_amount?: number;
  is_matched?: boolean;
  budget_year?: number;
  overrides?: Record<string, { amount?: number; description?: string }>;
  scenario_id?: string | null;
}

export interface ProjectionData {
  month: string;
  value: number;
  date: string;
  income?: number;
  feeder?: number;
  expense?: number;
  slush?: number;
  cumulativeBalance?: number;
  breakdown?: {
    incomeBreakdown: Record<string, number>;
    feederBreakdown: Record<string, number>;
    expenseBreakdown: Record<string, number>;
    slushBreakdown: Record<string, number>;
  };
}

export interface NewTransactionForm {
  date: string;
  source: string;
  amount: string;
  // account: string; // Removed as per request
  // budget: string; // Removed as per request
  category: string;
  stream: string; // Renamed from subCategory
  planned: boolean;
  recurring: RecurringInterval;
  description: string;
  scenario_id?: string | null;
}
