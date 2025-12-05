// Centralized theme configuration for HASHD

export const theme = {
  colors: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    secondary: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef',
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a',
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
    }
  },
  
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },
  
  borderRadius: {
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  },
  
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      base: '1rem',    // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem',   // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }
  },
  
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    }
  }
} as const;

// CSS-in-JS style helpers
export const styles = {
  // Glassmorphism effect
  glass: {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: theme.shadows.glass,
  },
  
  // Gradient backgrounds
  gradients: {
    primary: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    secondary: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)',
    dark: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
  },
  
  // Button variants
  button: {
    primary: {
      base: `
        inline-flex items-center justify-center px-4 py-2 
        bg-primary-600 text-white font-medium rounded-lg
        hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-150
      `,
      large: `
        inline-flex items-center justify-center px-6 py-3 
        bg-primary-600 text-white font-semibold rounded-xl text-lg
        hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-150
      `
    },
    secondary: {
      base: `
        inline-flex items-center justify-center px-4 py-2 
        bg-white text-primary-600 font-medium rounded-lg border border-primary-200
        hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-150
      `
    },
    ghost: {
      base: `
        inline-flex items-center justify-center px-4 py-2 
        text-neutral-600 font-medium rounded-lg
        hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-150
      `
    }
  },
  
  // Card variants
  card: {
    base: `
      bg-white rounded-xl shadow-md border border-neutral-200
      transition-shadow duration-150 hover:shadow-lg
    `,
    glass: `
      bg-white/25 backdrop-blur-md rounded-xl border border-white/20
      shadow-glass transition-all duration-150 hover:shadow-xl
    `
  },
  
  // Input styles
  input: {
    base: `
      w-full px-3 py-2 border border-neutral-300 rounded-lg
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
      disabled:bg-neutral-100 disabled:cursor-not-allowed
      transition-colors duration-150
    `
  }
};

// Utility functions for theme usage
export const getColor = (colorPath: string): string => {
  const keys = colorPath.split('.');
  let current: any = theme.colors;
  
  for (const key of keys) {
    current = current[key];
    if (!current) return '';
  }
  
  return current;
};

export const getSpacing = (size: keyof typeof theme.spacing): string => {
  return theme.spacing[size];
};

export const getFontSize = (size: keyof typeof theme.typography.fontSize): string => {
  return theme.typography.fontSize[size];
};
