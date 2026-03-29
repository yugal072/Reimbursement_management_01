import axios from "axios";

// ─── Exchange Rate Cache ──────────────────────────────────────────────────────
interface RateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

const rateCache: Record<string, RateCache> = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ convertedAmount: number; isApproximate: boolean }> => {
  if (fromCurrency === toCurrency) {
    return { convertedAmount: parseFloat(amount.toFixed(2)), isApproximate: false };
  }

  const now = Date.now();
  const cached = rateCache[fromCurrency];
  let rates: Record<string, number>;
  let isApproximate = false;

  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    rates = cached.rates;
  } else {
    try {
      const res = await axios.get(
        `${process.env.EXCHANGE_RATE_BASE_URL}/${fromCurrency}`,
        { timeout: 5000 }
      );
      rates = res.data.rates;
      rateCache[fromCurrency] = { rates, fetchedAt: now };
    } catch (err) {
      // Fallback: use stale cache if available
      if (cached) {
        rates = cached.rates;
        isApproximate = true;
        console.warn(`Exchange rate API unavailable. Using cached rates for ${fromCurrency}.`);
      } else {
        // Last resort: return amount as-is and flag it
        console.error(`No cached rates available for ${fromCurrency}. Returning original amount.`);
        return { convertedAmount: amount, isApproximate: true };
      }
    }
  }

  if (!rates![toCurrency]) {
    throw new Error(`Exchange rate not found for currency: ${toCurrency}`);
  }

  const converted = parseFloat((amount * rates![toCurrency]).toFixed(2));
  return { convertedAmount: converted, isApproximate };
};

// ─── Country Currency Lookup ──────────────────────────────────────────────────
export const getCurrencyForCountry = async (
  countryName: string
): Promise<{ currencyCode: string; currencySymbol: string }> => {
  const res = await axios.get(process.env.COUNTRIES_API_URL!, { timeout: 8000 });

  const match = res.data.find(
    (c: any) => c.name.common.toLowerCase() === countryName.toLowerCase()
  );

  if (!match || !match.currencies) {
    throw new Error(`Country not found or has no currency data: ${countryName}`);
  }

  const entries = Object.entries(match.currencies) as [string, any][];
  const [code, details] = entries[0];

  return {
    currencyCode: code,
    currencySymbol: details.symbol || code,
  };
};

// ─── Get All Currencies ───────────────────────────────────────────────────────
export const getAllCurrencies = async () => {
  const res = await axios.get(process.env.COUNTRIES_API_URL!, { timeout: 8000 });

  const currencies = res.data
    .filter((c: any) => c.currencies)
    .flatMap((c: any) =>
      Object.entries(c.currencies).map(([code, details]: [string, any]) => ({
        code,
        name: details.name,
        symbol: details.symbol,
        country: c.name.common,
      }))
    );

  // Deduplicate by currency code
  const unique = Array.from(
    new Map(currencies.map((c: any) => [c.code, c])).values()
  );

  return unique.sort((a: any, b: any) => a.code.localeCompare(b.code));
};
