export const WHATSAPP_NUMBER = "5594992674980";
export const SHIPPING_FEE = 10;

export function formatBRL(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function calculateOrder(quantity) {
  const units = Number(quantity);
  if (!Number.isInteger(units) || units < 1 || units > 500) {
    return { kind: "invalid", quantity: units };
  }

  let unitPrice = null;
  if (units === 1) unitPrice = 15;
  else if (units >= 6 && units <= 24) unitPrice = 12;
  else if (units === 25) unitPrice = 10;
  else if (units === 50) unitPrice = 9;
  else if (units === 100) unitPrice = 8;

  if (unitPrice === null) return { kind: "quote", quantity: units, shippingFee: SHIPPING_FEE };
  const subtotal = unitPrice * units;
  return { kind: "priced", quantity: units, unitPrice, subtotal, shippingFee: SHIPPING_FEE, total: subtotal + SHIPPING_FEE };
}
