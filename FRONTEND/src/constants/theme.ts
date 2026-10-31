export const THEME = {
  colors: {
    // Brand Purples
    primary: '#7654E8',
    primaryLight: '#8F71F7',
    primaryDark: '#5D3BC7',
    secondary: '#B58AF5',
    lavenderLight: '#F0EAFE',
    lavenderPill: '#EBE4FD',
    
    // Backgrounds
    background: '#F7F6FC',
    backgroundAlt: '#F2F0FA',
    card: '#FFFFFF',
    cardMuted: '#FAFAFD',
    
    // Text
    textPrimary: '#171725',
    textSecondary: '#77758A',
    textMuted: '#9B99AC',
    textWhite: '#FFFFFF',

    // Status & Semantic
    success: '#37B879',
    successLight: '#E8F8F0',
    warning: '#F4A340',
    warningLight: '#FEF6EC',
    danger: '#E85D75',
    dangerLight: '#FDEDF0',
    info: '#4D96FF',
    infoLight: '#EBF4FF',

    // Category Colors (matching reference image donut & charts)
    category: {
      Food: '#37B879',        // Mint green
      Rent: '#7654E8',        // Rich purple
      Shopping: '#F4A340',    // Amber / Orange
      Travel: '#B58AF5',      // Lavender
      Bills: '#4D96FF',       // Sky blue
      Entertainment: '#FF6492',// Coral rose
      Investments: '#10B981', // Emerald
      Healthcare: '#06B6D4',  // Cyan
      Salary: '#22C55E',      // Green
      Other: '#9CA3AF',       // Neutral gray
    },

    // UI Accents
    border: '#ECEAF3',
    borderLight: '#F3F2F8',
    divider: '#F0EEF7',
    iconBackground: '#F4F2FC',
    badgeGold: '#F59E0B',
    badgeGoldLight: '#FEF3C7',
  },

  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      md: 17,
      lg: 20,
      xl: 24,
      xxl: 28,
      xxxl: 34,
    },
    lineHeights: {
      xs: 15,
      sm: 18,
      base: 22,
      md: 24,
      lg: 28,
      xl: 32,
      xxl: 36,
      xxxl: 42,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },

  borderRadius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 26,
    full: 9999,
  },

  shadows: {
    soft: {
      shadowColor: '#7654E8',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 2,
    },
    card: {
      shadowColor: '#3B2A75',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 18,
      elevation: 3,
    },
    hover: {
      shadowColor: '#7654E8',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
    },
  },
};

/**
 * Format any number to Indian Rupee notation (e.g. ₹1,25,000.00 or ₹48,320)
 */
export const formatINR = (amount: number, showDecimals: boolean = false): string => {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  
  // Format using Indian numbering system
  const parts = absVal.toFixed(showDecimals ? 2 : 0).split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const formatted = showDecimals ? `${formattedInt}.${parts[1]}` : formattedInt;

  return `${isNegative ? '−' : ''}₹${formatted}`;
};
