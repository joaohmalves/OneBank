import type { Card, Customer, Machine, MachineMovement, Purchase } from '../types/banking.js';
export const customer: Customer = { name: 'João Henrique', agency: '0001', account: '12345-6', balance: 8450.32 };
export const cards: Card[] = [
  { id: 'black', name: 'OneBank Black', number: '**** **** **** 4821', holder: 'JOÃO HENRIQUE', expiry: '12/29', limit: 15000, availableLimit: 10719.5, color: 'black', perks: { Cashback: '2%', 'Sala VIP': 'Sim', 'Seguro viagem': 'Sim', Anuidade: 'R$ 600', Pontos: '2,5 pts/USD' } },
  { id: 'platinum', name: 'OneBank Platinum', number: '**** **** **** 1094', holder: 'JOÃO HENRIQUE', expiry: '08/28', limit: 8500, availableLimit: 8500, color: 'platinum', perks: { Cashback: '1%', 'Sala VIP': 'Não', 'Seguro viagem': 'Sim', Anuidade: 'R$ 300', Pontos: '1,8 pts/USD' } },
  { id: 'gold', name: 'OneBank Gold', number: '**** **** **** 7712', holder: 'JOÃO HENRIQUE', expiry: '04/28', limit: 4500, availableLimit: 4500, color: 'gold', perks: { Cashback: '0,5%', 'Sala VIP': 'Não', 'Seguro viagem': 'Não', Anuidade: 'R$ 120', Pontos: '1 pt/USD' } }
];
export const purchases: Purchase[] = [
  { id:'1',date:'20/08',merchant:'Amazon',category:'Compras',amount:389.9,type:'purchase',month:'Agosto 2026' }, { id:'2',date:'18/08',merchant:'Uber',category:'Transporte',amount:32.5,type:'purchase',month:'Agosto 2026' }, { id:'3',date:'17/08',merchant:'Netflix',category:'Assinaturas',amount:55.9,type:'purchase',month:'Agosto 2026' }, { id:'4',date:'15/08',merchant:'Apple Store',category:'Tecnologia',amount:299,type:'purchase',month:'Agosto 2026' }, { id:'5',date:'12/08',merchant:'Restaurante Marea',category:'Alimentação',amount:184.5,type:'purchase',month:'Agosto 2026' },
  { id:'6',date:'10/07',merchant:'Pagamento de fatura',category:'Pagamento',amount:3120,type:'payment',month:'Julho 2026' }, { id:'7',date:'08/07',merchant:'Airbnb',category:'Viagem',amount:580,type:'purchase',month:'Julho 2026' }, { id:'8',date:'01/07',merchant:'Estorno iFood',category:'Estorno',amount:68,type:'refund',month:'Julho 2026' }, { id:'9',date:'22/06',merchant:'Shell',category:'Combustível',amount:250,type:'purchase',month:'Junho 2026' }, { id:'10',date:'15/06',merchant:'Crédito de pontos',category:'Crédito',amount:75,type:'credit',month:'Junho 2026' }
];


export const machines: Machine[] = [
  {
    id: 'one-01',
    name: 'Maquininha OneBank 01',
    serial: 'OBK-4821',
    location: 'Caixa principal',
    status: 'Ativa',
    received: 4280.5,
    refunds: 180,
    transactions: 38,
    creditAmount: 3240.5,
    debitAmount: 1040,
    creditTransactions: 21,
    debitTransactions: 17,
    creditSettlement: 'Em até 30 dias',
    nextSettlement: 'Hoje, até 18h',
  },
  {
    id: 'one-02',
    name: 'Maquininha OneBank 02',
    serial: 'OBK-1094',
    location: 'Balcão',
    status: 'Ativa',
    received: 3165.9,
    refunds: 95.5,
    transactions: 27,
    creditAmount: 2385.9,
    debitAmount: 780,
    creditTransactions: 15,
    debitTransactions: 12,
    creditSettlement: 'Em até 30 dias',
    nextSettlement: 'Amanhã, até 18h',
  },
];

export const machineMovements: MachineMovement[] = [
  { id: 'm1', machineId: 'one-01', machine: 'Maquininha OneBank 01', merchant: 'Venda · Restaurante Marea', date: '03/09/2026', time: '14:02', amount: 289.9, type: 'sale', paymentType: 'credit' },
  { id: 'm2', machineId: 'one-02', machine: 'Maquininha OneBank 02', merchant: 'Venda · Loja Central', date: '03/09/2026', time: '13:47', amount: 459.9, type: 'sale', paymentType: 'debit' },
  { id: 'm3', machineId: 'one-01', machine: 'Maquininha OneBank 01', merchant: 'Venda · Restaurante Marea', date: '03/09/2026', time: '13:21', amount: 184.5, type: 'sale', paymentType: 'credit' },
  { id: 'm4', machineId: 'one-02', machine: 'Maquininha OneBank 02', merchant: 'Venda · Loja Central', date: '03/09/2026', time: '12:56', amount: 320, type: 'sale', paymentType: 'debit' },
  { id: 'm5', machineId: 'one-01', machine: 'Maquininha OneBank 01', merchant: 'Estorno · Restaurante Marea', date: '03/09/2026', time: '11:38', amount: 95, type: 'refund', paymentType: 'credit' },
  { id: 'm6', machineId: 'one-02', machine: 'Maquininha OneBank 02', merchant: 'Venda · Loja Central', date: '03/09/2026', time: '10:15', amount: 215.5, type: 'sale', paymentType: 'credit' },
];
