import type { SavingsGoal } from '../types/finance.ts';

export const DEMO_GOALS: SavingsGoal[] = [
  {
    id: 'goal_laptop',
    title: 'New Laptop Goal',
    targetAmount: 60000,
    currentAmount: 24000,
    deadlineDate: '2026-12-31',
    category: 'Electronics',
    icon: 'laptop',
    isCompleted: false,
    monthlyContribution: 8000,
  },
  {
    id: 'goal_emergency',
    title: '6-Month Emergency Fund',
    targetAmount: 100000,
    currentAmount: 45000,
    deadlineDate: '2027-03-31',
    category: 'Safety',
    icon: 'shield',
    isCompleted: false,
    monthlyContribution: 10000,
  },
  {
    id: 'goal_travel',
    title: 'Goa Year-End Trip',
    targetAmount: 25000,
    currentAmount: 15000,
    deadlineDate: '2026-12-15',
    category: 'Travel',
    icon: 'compass',
    isCompleted: false,
    monthlyContribution: 5000,
  },
];

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  savedAmount: number;
  icon: string;
  isUnlocked: boolean;
  unlockedDate?: string;
}

export const DEMO_BADGES: BadgeItem[] = [
  {
    id: 'badge_level4',
    title: 'Level 4 Saver',
    description: 'Saved ₹10,000 consistently over 2 months',
    savedAmount: 10000,
    icon: 'fox_trophy',
    isUnlocked: true,
    unlockedDate: '15 Oct',
  },
  {
    id: 'badge_coffee',
    title: '10 Cups Saved',
    description: 'Skipped gourmet coffee 10 times',
    savedAmount: 2500,
    icon: 'coffee',
    isUnlocked: true,
    unlockedDate: '22 Oct',
  },
  {
    id: 'badge_grocery',
    title: 'Grocery Guru',
    description: 'Stayed 15% under grocery budget',
    savedAmount: 4200,
    icon: 'piggy_bank',
    isUnlocked: true,
    unlockedDate: '28 Oct',
  },
  {
    id: 'badge_streak',
    title: 'Budget Master',
    description: 'Maintained safe spend limit for 30 days',
    savedAmount: 15000,
    icon: 'award',
    isUnlocked: false,
  },
];

export interface SavingsMission {
  id: string;
  title: string;
  subtitle: string;
  targetSaving: number;
  icon: string;
  category: string;
  expiresInDays: number;
}

export const CURRENT_MISSION: SavingsMission = {
  id: 'mission_coffee_week',
  title: "Today's Mission",
  subtitle: 'Save ₹500 on dining & takeout this week',
  targetSaving: 500,
  icon: 'coffee',
  category: 'Food',
  expiresInDays: 4,
};
