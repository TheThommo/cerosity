export interface ConsoleThemeTokens {
  surfaces: {
    base: string;
    raised: string;
    sunken: string;
    overlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  border: {
    default: string;
    strong: string;
  };
  brand: {
    red: string;
    blue: string;
    redMuted: string;
    blueMuted: string;
  };
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  chart: {
    primary: string;
    secondary: string;
    tertiary: string;
    quaternary: string;
  };
}

export const darkTheme: ConsoleThemeTokens = {
  surfaces: {
    base: '#0F1117',
    raised: '#1A1D2E',
    sunken: '#0A0D14',
    overlay: '#252841',
  },
  text: {
    primary: '#F8F9FA',
    secondary: '#B0B8C4',
    muted: '#6B7588',
    inverse: '#0F1117',
  },
  border: {
    default: '#2A2D3E',
    strong: '#3D4160',
  },
  brand: {
    red: '#E63946',
    blue: '#1D7FBF',
    redMuted: 'rgba(230,57,70,0.15)',
    blueMuted: 'rgba(29,127,191,0.15)',
  },
  semantic: {
    success: '#2ECC71',
    warning: '#F39C12',
    error: '#E74C3C',
    info: '#3498DB',
  },
  chart: {
    primary: '#1D7FBF',
    secondary: '#E63946',
    tertiary: '#2ECC71',
    quaternary: '#F39C12',
  },
};

export const lightTheme: ConsoleThemeTokens = {
  surfaces: {
    base: '#F4F6F8',
    raised: '#FFFFFF',
    sunken: '#E8ECF0',
    overlay: '#FFFFFF',
  },
  text: {
    primary: '#1A1D2E',
    secondary: '#4A5568',
    muted: '#718096',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#E2E8F0',
    strong: '#CBD5E0',
  },
  brand: {
    red: '#E63946',
    blue: '#1D7FBF',
    redMuted: 'rgba(230,57,70,0.1)',
    blueMuted: 'rgba(29,127,191,0.1)',
  },
  semantic: {
    success: '#27AE60',
    warning: '#E67E22',
    error: '#C0392B',
    info: '#2980B9',
  },
  chart: {
    primary: '#1D7FBF',
    secondary: '#E63946',
    tertiary: '#27AE60',
    quaternary: '#E67E22',
  },
};
