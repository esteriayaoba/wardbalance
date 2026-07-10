import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/**
 * Formats a numeric value into Nigerian Naira currency representation.
 * Always formats as ₦120,000 with thousands separators and optional decimals.
 */
export const formatNaira = (amount: number | string | unknown): string => {
  let numericAmount = 0;
  
  if (typeof amount === "number") {
    numericAmount = amount;
  } else if (typeof amount === "string") {
    numericAmount = Number(amount || 0);
  } else if (amount && typeof amount === "object" && "toString" in amount) {
    const strVal = (amount as { toString(): string }).toString();
    numericAmount = Number(strVal || 0);
  }
  
  if (isNaN(numericAmount)) {
    return "₦0";
  }

  // Format with thousands separator
  const formatted = numericAmount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `₦${formatted}`;
};

/**
 * Smoothly scrolls to a section by its id, respecting the dynamic
 * marketing header offset (--marketing-header-offset CSS variable).
 *
 * Falls back to 96px if the CSS variable has not been set yet.
 */
export const scrollToSection = (id: string): void => {
  const el = document.getElementById(id);
  if (!el) return;
  const offsetStr = getComputedStyle(document.documentElement)
    .getPropertyValue("--marketing-header-offset")
    .trim();
  const offset = offsetStr ? parseFloat(offsetStr) : 96;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
};

