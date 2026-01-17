
export interface FutureTransaction {
  id: number;
  date: string;
  merchant: string;
  amount: number;
  account: string;
  status: string;
  budget: string;
  category: string;
  subCategory: string;
  planned: boolean;
  recurring: boolean;
  description: string;
}

export interface ProjectionData {
  month: string;
  value: number;
  date: string;
}

export interface NewTransactionForm {
  date: string;
  merchant: string;
  amount: string;
  account: string;
  status: string;
  budget: string;
  category: string;
  subCategory: string;
  planned: boolean;
  recurring: boolean;
  description: string;
}
