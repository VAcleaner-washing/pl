
(() => {
  const button = document.querySelector(".menu-button");
  const menu = document.querySelector(".mobile-menu");
  if (button && menu) {
    const close = () => {
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Відкрити меню");
      document.body.style.overflow = "";
    };
    button.addEventListener("click", () => {
      const opening = !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", opening);
      menu.setAttribute("aria-hidden", String(!opening));
      button.setAttribute("aria-expanded", String(opening));
      button.setAttribute("aria-label", opening ? "Закрити меню" : "Відкрити меню");
      document.body.style.overflow = opening ? "hidden" : "";
    });
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
  }
  document.querySelectorAll("details").forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      const group = item.parentElement;
      group?.querySelectorAll("details[open]").forEach((other) => { if (other !== item) other.open = false; });
    });
  });
  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    items.forEach((item) => observer.observe(item));
  } else {
    items.forEach((item) => item.classList.add("is-visible"));
  }
})();
