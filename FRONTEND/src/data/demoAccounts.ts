import type { BankAccount } from '../types/finance.ts';

export const DEMO_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc_hdfc_01',
    name: 'Primary Salary',
    bankName: 'HDFC Bank',
    accountNumberMasked: '•••• 4312',
    balance: 38420,
    type: 'SAVINGS',
    cardBrand: 'VISA',
    color: '#7654E8',
  },
  {
    id: 'acc_sbi_02',
    name: 'Emergency Savings',
    bankName: 'SBI Bank',
    accountNumberMasked: '•••• 8821',
    balance: 9900,
    type: 'SAVINGS',
    cardBrand: 'RUPAY',
    color: '#37B879',
  },
];
