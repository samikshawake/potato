import type { PresetTransactionCategory, TransactionCategory } from '../types/finance.ts';
import { THEME } from './theme.ts';

export interface CategoryMeta {
  name: TransactionCategory;
  color: string;
  iconName: string;
  isEssential: boolean;
}

export const CUSTOM_CATEGORY_PALETTE = [
  '#7654E8',
  '#F97316',
  '#0EA5E9',
  '#EC4899',
  '#10B981',
  '#8B5CF6',
  '#EAB308',
  '#14B8A6',
];

export const DEFAULT_EXPENSE_CATEGORIES: PresetTransactionCategory[] = [
  'Food',
  'Rent',
  'Shopping',
  'Travel',
  'Bills',
  'Entertainment',
  'Healthcare',
  'Investment',
  'Investments',
  'Other',
];

export const DEFAULT_ALL_CATEGORIES: PresetTransactionCategory[] = [
  'Food',
  'Rent',
  'Shopping',
  'Travel',
  'Bills',
  'Entertainment',
  'Healthcare',
  'Investment',
  'Investments',
  'Salary',
  'Pocket Money',
  'Other',
];

export const CATEGORIES_META: Record<string, CategoryMeta> = {
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
  'Pocket Money': {
    name: 'Pocket Money',
    color: '#10B981',
    iconName: 'briefcase',
    isEssential: false,
  },
  Investment: {
    name: 'Investment',
    color: '#10B981',
    iconName: 'trending-up',
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

export function getCategoryMeta(
  category: string,
  customColors?: Record<string, string>
): CategoryMeta {
  if (CATEGORIES_META[category]) {
    return CATEGORIES_META[category];
  }
  const overrideColor = customColors?.[category];
  if (overrideColor) {
    return {
      name: category,
      color: overrideColor,
      iconName: 'tag',
      isEssential: false,
    };
  }
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return {
    name: category,
    color: CUSTOM_CATEGORY_PALETTE[hash % CUSTOM_CATEGORY_PALETTE.length],
    iconName: 'tag',
    isEssential: false,
  };
}
