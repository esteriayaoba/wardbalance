/**
 * Formats a numeric value into Nigerian Naira currency representation.
 * Always formats as ₦120,000 with thousands separators and optional decimals.
 */
export const formatNaira = (amount: number | string | any): string => {
  const numericAmount = typeof amount === "number" ? amount : Number(amount || 0);
  
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
