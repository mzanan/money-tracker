import { getCurrency, storageScale } from "@/lib/constants/currencies";

export type ScaleOf = (currency: string) => number;

export interface CryptoScale {
  code: string;
  scale: number;
}

export function scaleResolver(
  cryptoAssets: ReadonlyArray<CryptoScale>,
): ScaleOf {
  const stored = new Map(
    cryptoAssets.map((asset) => [asset.code, asset.scale]),
  );
  return (currency) => {
    const scale = storageScale(currency);
    if (getCurrency(currency).crypto && stored.get(currency) !== scale) {
      throw new Error(
        `Scale drift for ${currency}: code ${scale}, crypto_assets ${stored.get(currency) ?? "missing"}`,
      );
    }
    return scale;
  };
}

export function hasStorageScale(currency: string, scaleOf: ScaleOf): boolean {
  try {
    scaleOf(currency);
    return true;
  } catch {
    return false;
  }
}
