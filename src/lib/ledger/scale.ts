import { CURRENCY_MAP } from "@/lib/constants/currencies";

export type ScaleOf = (currency: string) => number;

export interface CryptoScale {
  code: string;
  scale: number;
}

export function scaleResolver(
  cryptoAssets: ReadonlyArray<CryptoScale>,
): ScaleOf {
  const cryptoScales = new Map(
    cryptoAssets.map((asset) => [asset.code, asset.scale]),
  );
  return (currency) => {
    const cryptoScale = cryptoScales.get(currency);
    if (cryptoScale !== undefined) return cryptoScale;
    const fiat = CURRENCY_MAP[currency];
    if (fiat && !fiat.crypto) return fiat.decimals;
    throw new Error(`No storage scale for currency ${currency}`);
  };
}
