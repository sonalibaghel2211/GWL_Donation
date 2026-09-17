const currencies = ["USD", "INR", "EUR", "GBP", "CAD", "JPY"];

function getCurrencySymbol(currency) {
  const code = (currency || "USD").toUpperCase().trim();
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find(part => part.type === "currency");
    return symbolPart ? symbolPart.value : code;
  } catch (e) {
    return code;
  }
}

function formatCurrency(amountVal, currencyCode) {
  const code = (currencyCode || "USD").toUpperCase().trim();
  const numericAmount = typeof amountVal === "string" ? parseFloat(amountVal.replace(/[^0-9.-]/g, "")) : amountVal;
  if (isNaN(numericAmount)) return String(amountVal);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(numericAmount);
  } catch (e) {
    return `${code} ${numericAmount.toFixed(2)}`;
  }
}

console.log("Symbols:");
currencies.forEach(c => {
  console.log(`${c} -> ${getCurrencySymbol(c)}`);
});

console.log("\nFormatted Amounts:");
currencies.forEach(c => {
  console.log(`${c} -> ${formatCurrency(100.5, c)}`);
});

const template = "Thank you! You donated {{currency}}{{amount}} to our campaign.";
console.log("\nTemplate Replacements:");
currencies.forEach(c => {
  let res = template;
  // Replace {{currency}}{{amount}} combination
  res = res.replace(/\{\{\s*currency\s*\}\}\s*\{\{\s*(amount|price)\s*\}\}/gi, "{{amount}}");
  res = res.replace(/\{\{\s*amount\s*\}\}/gi, formatCurrency(100.5, c));
  console.log(`${c}: ${res}`);
});
