export const THEME = {
  titleBg: '#4472C4',
  titleText: '#FFFFFF',
  headerBg: '#D9E2F3',
  headerText: '#000000',
  sectionHeaderBg: '#B4C6E7',
  sectionHeaderText: '#000000',
  dateCellBg: '#E8F4FF',
  border: '#C9D5E3',
} as const;

export type Theme = typeof THEME;
