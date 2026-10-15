export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  scale: number;
  displayDecimals?: number;
  crypto?: boolean;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: "USD", name: "US Dollar", symbol: "$", scale: 2 },
  { code: "EUR", name: "Euro", symbol: "€", scale: 2 },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", scale: 0 },
  { code: "THB", name: "Thai Baht", symbol: "฿", scale: 2 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", scale: 2 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", scale: 2 },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", scale: 2 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", scale: 2 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", scale: 0 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", scale: 0 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", scale: 2 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", scale: 2 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", scale: 2 },
  { code: "TWD", name: "Taiwan Dollar", symbol: "NT$", scale: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", scale: 2 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", scale: 2 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", scale: 2 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", scale: 2 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", scale: 2 },
  { code: "ARS", name: "Argentine Peso", symbol: "$", scale: 2 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", scale: 2 },
  { code: "CLP", name: "Chilean Peso", symbol: "$", scale: 0 },
  { code: "COP", name: "Colombian Peso", symbol: "$", scale: 2 },
  { code: "MXN", name: "Mexican Peso", symbol: "$", scale: 2 },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", scale: 2 },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$U", scale: 2 },
  { code: "PYG", name: "Paraguayan Guarani", symbol: "₲", scale: 0 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", scale: 2 },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", scale: 2 },
  { code: "ZAR", name: "South African Rand", symbol: "R", scale: 2 },
  { code: "GEL", name: "Georgian Lari", symbol: "₾", scale: 2 },
  { code: "MAD", name: "Moroccan Dirham", symbol: "DH", scale: 2 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", scale: 2 },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", scale: 2 },
  { code: "DKK", name: "Danish Krone", symbol: "kr", scale: 2 },
  { code: "ISK", name: "Icelandic Krona", symbol: "kr", scale: 0 },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", scale: 2 },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", scale: 2 },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", scale: 2 },
  { code: "RON", name: "Romanian Leu", symbol: "lei", scale: 2 },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв", scale: 2 },
  { code: "RSD", name: "Serbian Dinar", symbol: "RSD ", scale: 2 },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴", scale: 2 },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", scale: 2 },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸", scale: 2 },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", scale: 2 },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR ", scale: 2 },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR ", scale: 2 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD ", scale: 3 },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", scale: 2 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", scale: 2 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh ", scale: 2 },
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs ", scale: 2 },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", scale: 2 },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs ", scale: 2 },
  { code: "NPR", name: "Nepalese Rupee", symbol: "Rs ", scale: 2 },
  { code: "KHR", name: "Cambodian Riel", symbol: "៛", scale: 2 },
  { code: "LAK", name: "Lao Kip", symbol: "₭", scale: 2 },
  { code: "MMK", name: "Myanmar Kyat", symbol: "K ", scale: 2 },
  { code: "BOB", name: "Bolivian Boliviano", symbol: "Bs ", scale: 2 },
  { code: "CRC", name: "Costa Rican Colon", symbol: "₡", scale: 2 },
  { code: "DOP", name: "Dominican Peso", symbol: "RD$", scale: 2 },
  { code: "GTQ", name: "Guatemalan Quetzal", symbol: "Q", scale: 2 },
  { code: "VES", name: "Venezuelan Bolivar", symbol: "Bs.S ", scale: 2 },
  {
    code: "USDT",
    name: "Tether USD",
    symbol: "USDT ",
    scale: 6,
    displayDecimals: 2,
    crypto: true,
  },
  {
    code: "USDC",
    name: "USD Coin",
    symbol: "USDC ",
    scale: 6,
    displayDecimals: 2,
    crypto: true,
  },
];

export const CRYPTO_CODES: ReadonlyArray<string> = CURRENCIES.filter(
  (currency) => currency.crypto,
).map((currency) => currency.code);

export const CURRENCY_MAP: Record<string, CurrencyMeta> = Object.fromEntries(
  CURRENCIES.map((currency) => [currency.code, currency]),
);

export function getCurrency(code: string): CurrencyMeta {
  return CURRENCY_MAP[code] ?? { code, name: code, symbol: code, scale: 2 };
}

export function currencyScaleOrDefault(code: string): number {
  return getCurrency(code).scale;
}

export function currencyDisplayDecimals(code: string): number {
  const { scale, displayDecimals } = getCurrency(code);
  return displayDecimals ?? scale;
}

export function storageScale(code: string): number {
  const meta = CURRENCY_MAP[code];
  if (!meta) throw new Error(`No storage scale for currency ${code}`);
  return meta.scale;
}

export function isSupportedCurrency(code: string): boolean {
  return code in CURRENCY_MAP;
}

export const DEFAULT_BASE_CURRENCY = "USD";

export function supportedOrDefault(codes: ReadonlyArray<string>): string[] {
  const supported = codes.filter(isSupportedCurrency);
  return supported.length > 0 ? supported : [DEFAULT_BASE_CURRENCY];
}
