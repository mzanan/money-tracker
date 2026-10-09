export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  /** ISO 4217 minor unit decimals (VND/JPY/KRW/CLP = 0, not 2). */
  decimals: number;
  storageDecimals?: number;
  crypto?: boolean;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", decimals: 0 },
  { code: "THB", name: "Thai Baht", symbol: "฿", decimals: 2 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", decimals: 2 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", decimals: 2 },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", decimals: 2 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimals: 2 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", decimals: 0 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", decimals: 0 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", decimals: 2 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimals: 2 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimals: 2 },
  { code: "TWD", name: "Taiwan Dollar", symbol: "NT$", decimals: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", decimals: 2 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimals: 2 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", decimals: 2 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", decimals: 2 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimals: 2 },
  { code: "ARS", name: "Argentine Peso", symbol: "$", decimals: 2 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", decimals: 2 },
  { code: "CLP", name: "Chilean Peso", symbol: "$", decimals: 0 },
  { code: "COP", name: "Colombian Peso", symbol: "$", decimals: 2 },
  { code: "MXN", name: "Mexican Peso", symbol: "$", decimals: 2 },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", decimals: 2 },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$U", decimals: 2 },
  { code: "PYG", name: "Paraguayan Guarani", symbol: "₲", decimals: 0 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", decimals: 2 },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", decimals: 2 },
  { code: "ZAR", name: "South African Rand", symbol: "R", decimals: 2 },
  { code: "GEL", name: "Georgian Lari", symbol: "₾", decimals: 2 },
  { code: "MAD", name: "Moroccan Dirham", symbol: "DH", decimals: 2 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", decimals: 2 },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", decimals: 2 },
  { code: "DKK", name: "Danish Krone", symbol: "kr", decimals: 2 },
  { code: "ISK", name: "Icelandic Krona", symbol: "kr", decimals: 0 },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", decimals: 2 },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", decimals: 2 },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", decimals: 2 },
  { code: "RON", name: "Romanian Leu", symbol: "lei", decimals: 2 },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв", decimals: 2 },
  { code: "RSD", name: "Serbian Dinar", symbol: "RSD ", decimals: 2 },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴", decimals: 2 },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", decimals: 2 },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸", decimals: 2 },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", decimals: 2 },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR ", decimals: 2 },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR ", decimals: 2 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD ", decimals: 3 },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", decimals: 2 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", decimals: 2 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh ", decimals: 2 },
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs ", decimals: 2 },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", decimals: 2 },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs ", decimals: 2 },
  { code: "NPR", name: "Nepalese Rupee", symbol: "Rs ", decimals: 2 },
  { code: "KHR", name: "Cambodian Riel", symbol: "៛", decimals: 2 },
  { code: "LAK", name: "Lao Kip", symbol: "₭", decimals: 2 },
  { code: "MMK", name: "Myanmar Kyat", symbol: "K ", decimals: 2 },
  { code: "BOB", name: "Bolivian Boliviano", symbol: "Bs ", decimals: 2 },
  { code: "CRC", name: "Costa Rican Colon", symbol: "₡", decimals: 2 },
  { code: "DOP", name: "Dominican Peso", symbol: "RD$", decimals: 2 },
  { code: "GTQ", name: "Guatemalan Quetzal", symbol: "Q", decimals: 2 },
  { code: "VES", name: "Venezuelan Bolivar", symbol: "Bs.S ", decimals: 2 },
  {
    code: "USDT",
    name: "Tether USD",
    symbol: "USDT ",
    decimals: 2,
    storageDecimals: 6,
    crypto: true,
  },
  {
    code: "USDC",
    name: "USD Coin",
    symbol: "USDC ",
    decimals: 2,
    storageDecimals: 6,
    crypto: true,
  },
  { code: "BTC", name: "Bitcoin", symbol: "BTC ", decimals: 8, crypto: true },
  { code: "ETH", name: "Ethereum", symbol: "ETH ", decimals: 8, crypto: true },
  { code: "SOL", name: "Solana", symbol: "SOL ", decimals: 6, crypto: true },
  { code: "BNB", name: "BNB", symbol: "BNB ", decimals: 6, crypto: true },
  { code: "XRP", name: "XRP", symbol: "XRP ", decimals: 6, crypto: true },
  { code: "ADA", name: "Cardano", symbol: "ADA ", decimals: 6, crypto: true },
  {
    code: "DOGE",
    name: "Dogecoin",
    symbol: "DOGE ",
    decimals: 6,
    crypto: true,
  },
  { code: "TRX", name: "TRON", symbol: "TRX ", decimals: 6, crypto: true },
  { code: "LTC", name: "Litecoin", symbol: "LTC ", decimals: 8, crypto: true },
  {
    code: "AVAX",
    name: "Avalanche",
    symbol: "AVAX ",
    decimals: 6,
    crypto: true,
  },
  { code: "DOT", name: "Polkadot", symbol: "DOT ", decimals: 6, crypto: true },
  {
    code: "LINK",
    name: "Chainlink",
    symbol: "LINK ",
    decimals: 6,
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
  return CURRENCY_MAP[code] ?? { code, name: code, symbol: code, decimals: 2 };
}

export function storageDecimals(code: string): number {
  const meta = getCurrency(code);
  return meta.storageDecimals ?? meta.decimals;
}

export function isSupportedCurrency(code: string): boolean {
  return code in CURRENCY_MAP;
}
