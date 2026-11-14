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
