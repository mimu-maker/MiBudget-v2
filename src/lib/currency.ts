interface CurrencyFormat {
  locale: string;
  symbol: string;
  decimalPlaces: number;
  useCommas: boolean;
}

// Fixed to DKK format for simplified implementation
const DKK_FORMAT: CurrencyFormat = {
  locale: 'da-DK',
  symbol: 'kr',
  decimalPlaces: 2,
  useCommas: false // European format: 1.234,56
};

// Legacy mapping kept for potential future use
const CURRENCY_CONFIG: Record<string, CurrencyFormat> = {
  USD: { locale: 'en-US', symbol: '$', decimalPlaces: 2, useCommas: true },
  EUR: { locale: 'de-DE', symbol: '€', decimalPlaces: 2, useCommas: false },
  GBP: { locale: 'en-GB', symbol: '£', decimalPlaces: 2, useCommas: true },
  CAD: { locale: 'en-CA', symbol: 'C$', decimalPlaces: 2, useCommas: true },
  AUD: { locale: 'en-AU', symbol: 'A$', decimalPlaces: 2, useCommas: true },
  DKK: { locale: 'da-DK', symbol: 'kr', decimalPlaces: 2, useCommas: false },
  SEK: { locale: 'sv-SE', symbol: 'kr', decimalPlaces: 2, useCommas: false },
  NOK: { locale: 'nb-NO', symbol: 'kr', decimalPlaces: 2, useCommas: false },
  PLN: { locale: 'pl-PL', symbol: 'zł', decimalPlaces: 2, useCommas: false },
  CZK: { locale: 'cs-CZ', symbol: 'Kč', decimalPlaces: 2, useCommas: false },
  HUF: { locale: 'hu-HU', symbol: 'Ft', decimalPlaces: 0, useCommas: false },
  CHF: { locale: 'de-CH', symbol: 'CHF', decimalPlaces: 2, useCommas: false },
  JPY: { locale: 'ja-JP', symbol: '¥', decimalPlaces: 0, useCommas: true },
  CNY: { locale: 'zh-CN', symbol: '¥', decimalPlaces: 2, useCommas: true }
};

export const formatCurrency = (amount: number, currency: string = 'DKK'): string => {
  // Always use DKK format for simplified implementation
  const config = DKK_FORMAT;
  
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: config.decimalPlaces,
      maximumFractionDigits: config.decimalPlaces
    }).format(amount);
  } catch (error) {
    // Fallback formatting for DKK: x.xxx,xx kr
    const formattedNumber = amount.toFixed(config.decimalPlaces);
    const parts = formattedNumber.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1] || '';
    
    // European format: use periods for thousands
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    const decimalSeparator = ','; // European decimal separator
    const formattedAmount = decimalPart ? `${integerPart}${decimalSeparator}${decimalPart}` : integerPart;
    
    return `${formattedAmount} ${config.symbol}`;
  }
};

export const formatNumber = (amount: number, currency: string = 'DKK'): string => {
  // Always use DKK format for simplified implementation
  const config = DKK_FORMAT;
  
  try {
    return new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: config.decimalPlaces,
      maximumFractionDigits: config.decimalPlaces
    }).format(amount);
  } catch (error) {
    // Fallback formatting: x.xxx,xx
    const formattedNumber = amount.toFixed(config.decimalPlaces);
    const parts = formattedNumber.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1] || '';
    
    // European format: use periods for thousands
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    const decimalSeparator = ','; // European decimal separator
    return decimalPart ? `${integerPart}${decimalSeparator}${decimalPart}` : integerPart;
  }
};

export const getCurrencySymbol = (currency: string = 'DKK'): string => {
  // Always return DKK symbol for simplified implementation
  return DKK_FORMAT.symbol;
};

export const getDecimalSeparator = (currency: string = 'DKK'): string => {
  // Always return European decimal separator
  return ',';
};

export const getThousandSeparator = (currency: string = 'DKK'): string => {
  // Always return European thousands separator
  return '.';
};

export const parseCurrencyInput = (input: string, currency: string = 'DKK'): number => {
  // Always use DKK format for simplified implementation
  const config = DKK_FORMAT;
  
  // Remove currency symbol and thousands separator
  let cleanInput = input.replace(config.symbol, '').replace(/\./g, '');
  
  // Replace decimal separator with standard decimal point
  cleanInput = cleanInput.replace(',', '.');
  
  // Parse as number
  const parsed = parseFloat(cleanInput);
  return isNaN(parsed) ? 0 : parsed;
};
