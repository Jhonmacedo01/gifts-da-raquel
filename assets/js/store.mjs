import { calculateOrder, formatBRL, SHIPPING_FEE, WHATSAPP_NUMBER } from "./order-pricing.mjs";

const menuButton = document.querySelector(".menu-toggle");
const menu = document.querySelector(".store-header nav");

menuButton?.addEventListener("click", () => {
  const open = menu.dataset.open !== "true";
  menu.dataset.open = String(open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
});

menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  menu.dataset.open = "false";
  menuButton?.setAttribute("aria-expanded", "false");
}));

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || menu?.dataset.open !== "true") return;
  menu.dataset.open = "false";
  menuButton?.setAttribute("aria-expanded", "false");
  menuButton?.focus();
});

const orderForm = document.querySelector("#order-estimate");
const quantityInput = document.querySelector("#order-quantity");
const orderSummary = document.querySelector("#order-summary");

quantityInput?.addEventListener("input", () => {
  const estimate = calculateOrder(quantityInput.value);
  if (estimate.kind === "invalid") {
    orderSummary.textContent = "Informe uma quantidade inteira entre 1 e 500.";
  } else if (estimate.kind === "quote") {
    orderSummary.textContent = `Produtos: orçamento para ${estimate.quantity} unidade(s). Frete fixo: ${formatBRL(SHIPPING_FEE)}.`;
  } else {
    orderSummary.textContent = `${estimate.quantity} × ${formatBRL(estimate.unitPrice)} = ${formatBRL(estimate.subtotal)} + frete ${formatBRL(estimate.shippingFee)} = ${formatBRL(estimate.total)}.`;
  }
});

orderForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!orderForm.reportValidity()) return;
  const estimate = calculateOrder(quantityInput.value);
  if (estimate.kind === "invalid") {
    quantityInput.setCustomValidity("Informe uma quantidade inteira entre 1 e 500.");
    quantityInput.reportValidity();
    quantityInput.setCustomValidity("");
    return;
  }
  const lines = ["Olá, quero fazer um pedido de ímãs personalizados.", `Quantidade: ${estimate.quantity} unidade(s).`];
  if (estimate.kind === "quote") {
    lines.push("Valor dos produtos: gostaria de receber um orçamento para esta quantidade.");
    lines.push(`Frete fixo: ${formatBRL(estimate.shippingFee)}.`, "Quero confirmar o total final pelo WhatsApp.");
  } else {
    lines.push(`Valor dos produtos: ${formatBRL(estimate.subtotal)} (${formatBRL(estimate.unitPrice)} por unidade).`);
    lines.push(`Frete fixo: ${formatBRL(estimate.shippingFee)}.`, `Total estimado: ${formatBRL(estimate.total)}.`);
  }
  lines.push("Ainda vou combinar o envio das fotos e a forma de pagamento.");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
});
