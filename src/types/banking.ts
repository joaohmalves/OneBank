export type CardId = 'black' | 'platinum' | 'gold';
export interface Card { id: CardId; name: string; number: string; holder: string; expiry: string; limit: number; availableLimit: number; color: string; perks: Record<string, string>; }
export interface Purchase { id: string; date: string; merchant: string; category: string; amount: number; type: 'purchase' | 'payment' | 'refund' | 'credit'; month: string; }
export interface Customer { name: string; agency: string; account: string; balance: number; }

export type MachineStatus = 'Ativa' | 'Em manutenção';
export type MachineMovementType = 'sale' | 'refund';
export type MachinePaymentType = 'credit' | 'debit';

export interface Machine {
  id: string;
  name: string;
  serial: string;
  location: string;
  status: MachineStatus;
  received: number;
  refunds: number;
  transactions: number;
  creditAmount: number;
  debitAmount: number;
  creditTransactions: number;
  debitTransactions: number;
  creditSettlement: string;
  nextSettlement: string;
}

export interface MachineMovement {
  id: string;
  machineId: string;
  machine: string;
  merchant: string;
  date: string;
  time: string;
  amount: number;
  type: MachineMovementType;
  paymentType: MachinePaymentType;
}
