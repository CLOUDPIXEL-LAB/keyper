export const THEME_STORAGE_KEY = 'theme';

export const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Light',
    description: 'Clean white workspace',
    swatchClass: 'theme-swatch-light',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Pure black vault',
    swatchClass: 'theme-swatch-dark',
  },
  {
    value: 'system',
    label: 'System',
    description: 'Match this device',
    swatchClass: 'theme-swatch-system',
  },
  {
    value: 'theme-charcoal',
    label: 'Charcoal',
    description: 'Softer dark contrast',
    swatchClass: 'theme-swatch-charcoal',
  },
  {
    value: 'theme-light-gray',
    label: 'Light Gray',
    description: 'Neutral low-glare light',
    swatchClass: 'theme-swatch-light-gray',
  },
  {
    value: 'theme-warm-light',
    label: 'Warm Light',
    description: 'Soft warm workspace',
    swatchClass: 'theme-swatch-warm-light',
  },
  {
    value: 'theme-blue',
    label: 'Blue',
    description: 'Cool blue focus',
    swatchClass: 'theme-swatch-blue',
  },
] as const;

export const THEME_VALUES = THEME_OPTIONS
  .filter((theme) => theme.value !== 'system')
  .map((theme) => theme.value);
