const palette = {
  light: '#F2F3F4', // Cool light gray
  mediumLight: '#DDC8BF', // Soft blush
  medium: '#DDBB95', // Warm beige
  dark: '#B4A38F', // Taupe
  white: '#FFFFFF',
  offWhite: '#F6F1EE', // Main app background
  black: '#433A35', // Deep warm brown
  gray: '#8B8480', // Neutral text gray
  lightGray: '#ECE5E1', // Border/background gray
  error: '#E25C69',
  success: '#2FB27E',
  gold: '#C78B4D',
  shimmerBase: '#ECE5E1',
  shimmerHighlight: '#F6F1EE',
};

export const Colors = {
  light: palette.light,
  mediumLight: palette.mediumLight,
  medium: palette.medium,
  dark: palette.dark,
  white: palette.white,
  lightGray: palette.lightGray,
  gray: palette.gray,

  primary: palette.dark,
  secondary: palette.medium,
  background: palette.offWhite,
  card: palette.white,
  text: palette.black,
  textSecondary: palette.gray,
  border: palette.lightGray,
  error: palette.error,
  success: palette.success,

  tabIconDefault: palette.gray,
  tabIconSelected: palette.dark,
  tabBarBackground: palette.white,

  // Specific UI elements
  buttonBackground: palette.dark,
  buttonText: palette.white,
  inputBackground: '#FFFDFC',
  inputBorder: palette.lightGray,
  headerBackground: palette.offWhite,
  headerTint: palette.black,

  // Extended palette
  gold: palette.gold,
  shimmerBase: palette.shimmerBase,
  shimmerHighlight: palette.shimmerHighlight,
};

export const Gradients = {
  warmGlow: ['#DDBB95', '#B4A38F'] as const,
  golden: ['#C78B4D', '#DDBB95'] as const,
  sunset: ['#DDBB95', '#DDC8BF', '#F2F3F4'] as const,
  celebration: ['#DDBB95', '#C78B4D', '#B4A38F', '#E25C69', '#2FB27E'] as const,
};

export const Shadows = {
  card: {
    shadowColor: '#8f5c74',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  cardHover: {
    shadowColor: '#8f5c74',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  glass: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 16,
    elevation: 3,
  },
  fab: {
    shadowColor: '#8f5c74',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
};
