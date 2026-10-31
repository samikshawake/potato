import type { TransactionCategory } from '../types/finance.ts';
import { THEME } from './theme.ts';

export interface CategoryMeta {
  name: TransactionCategory;
  color: string;
  iconName: string;
  isEssential: boolean;
}

export const CATEGORIES_META: Record<TransactionCategory, CategoryMeta> = {
  Food: {
    name: 'Food',
    color: THEME.colors.category.Food,
    iconName: 'utensils',
    isEssential: true,
  },
  Rent: {
    name: 'Rent',
    color: THEME.colors.category.Rent,
    iconName: 'home',
    isEssential: true,
  },
  Shopping: {
    name: 'Shopping',
    color: THEME.colors.category.Shopping,
    iconName: 'shopping-bag',
    isEssential: false,
  },
  Travel: {
    name: 'Travel',
    color: THEME.colors.category.Travel,
    iconName: 'navigation',
    isEssential: false,
  },
  Bills: {
    name: 'Bills',
    color: THEME.colors.category.Bills,
    iconName: 'zap',
    isEssential: true,
  },
  Entertainment: {
    name: 'Entertainment',
    color: THEME.colors.category.Entertainment,
    iconName: 'film',
    isEssential: false,
  },
  Salary: {
    name: 'Salary',
    color: THEME.colors.category.Salary,
    iconName: 'briefcase',
    isEssential: true,
  },
  Investments: {
    name: 'Investments',
    color: THEME.colors.category.Investments,
    iconName: 'trending-up',
    isEssential: true,
  },
  Healthcare: {
    name: 'Healthcare',
    color: THEME.colors.category.Healthcare,
    iconName: 'activity',
    isEssential: true,
  },
  Other: {
    name: 'Other',
    color: THEME.colors.category.Other,
    iconName: 'more-horizontal',
    isEssential: false,
  },
};
