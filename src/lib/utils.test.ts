import { expect, test, describe, mock } from "bun:test";

mock.module("clsx", () => {
  return {
    clsx: (...args: any[]) => args.join(" "),
  };
});

mock.module("tailwind-merge", () => {
  return {
    twMerge: (arg: string) => arg,
  };
});

// Use dynamic import to ensure mocks are registered before utils.ts is loaded
const { getCurrencySymbol } = await import("./utils");

describe("getCurrencySymbol", () => {
  test("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  test("returns € for EUR", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
  });

  test("returns £ for GBP", () => {
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  test("returns ¥ for JPY", () => {
    expect(getCurrencySymbol("JPY")).toBe("¥");
  });

  test("returns KSh for KES", () => {
    expect(getCurrencySymbol("KES")).toBe("KSh");
  });

  test("handles lowercase currency codes", () => {
    expect(getCurrencySymbol("usd")).toBe("$");
    expect(getCurrencySymbol("eur")).toBe("€");
    expect(getCurrencySymbol("kes")).toBe("KSh");
  });

  test("returns $ for missing currency code", () => {
    expect(getCurrencySymbol()).toBe("$");
  });

  test("returns $ for unknown currency code", () => {
    expect(getCurrencySymbol("XYZ")).toBe("$");
  });
});
