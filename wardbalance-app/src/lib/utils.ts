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
