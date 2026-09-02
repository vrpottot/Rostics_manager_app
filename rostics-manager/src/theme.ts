export const lightColors = {
  brand: '#E4002B',
  brandDark: '#B80022',
  brandTint: '#FDE7EC',
  heroSub: 'rgba(255,255,255,0.82)',
  ink: '#17181A',
  onInk: '#FFFFFF',
  bg: '#F5F5F6',
  card: '#FFFFFF',
  text: '#17181A',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  border: '#E7E7EA',
  subtle: '#F1F1F2',
  success: '#1BA672',
  successTint: '#E3F6EC',
  warning: '#B7791F',
  warningTint: '#FEF0D6',
  danger: '#E4002B',
};

export const darkColors: typeof lightColors = {
  brand: '#FF3B5C',
  brandDark: '#FF6B82',
  brandTint: '#3A1620',
  heroSub: 'rgba(255,255,255,0.82)',
  ink: '#F4F4F5',
  onInk: '#17181A',
  bg: '#0F1012',
  card: '#17191D',
  text: '#F4F4F5',
  textMuted: '#9CA3AF',
  textFaint: '#6B7280',
  border: '#292C33',
  subtle: '#22242A',
  success: '#34D399',
  successTint: '#12261F',
  warning: '#F6C445',
  warningTint: '#38300F',
  danger: '#FF3B5C',
};

export type Colors = typeof lightColors;

/** Цвета типов смен менеджера (одинаковы в обеих темах) */
export const shiftColors = {
  morning: '#F59E0B',
  day: '#0EA5E9',
  evening: '#7C3AED',
};

export const EMPLOYEE_COLORS = [
  '#E4002B', '#FB6514', '#0EA5E9', '#16A34A',
  '#7C3AED', '#DB2777', '#0D9488', '#CA8A04',
];

export const font = {
  display: 'Manrope_800ExtraBold',
  bold: 'Manrope_800ExtraBold',
  semibold: 'Manrope_700Bold',
  medium: 'Manrope_500Medium',
  regular: 'Manrope_500Medium',
};

export const cardShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 2,
} as const;

export const spacing = (n: number) => n * 8;
