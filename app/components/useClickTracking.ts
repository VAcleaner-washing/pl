"use client";

import { useEffect } from "react";

type AnalyticsWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
};

export function useClickTracking() {
  useEffect(() => {
    const analyticsWindow = window as AnalyticsWindow;
    const dataLayer = (analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? []);

    const search = new URLSearchParams(window.location.search);
    const currentAttribution = Object.fromEntries(
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
        .map((key) => [key, search.get(key) ?? ""])
        .filter(([, value]) => Boolean(value)),
    );

    if (Object.keys(currentAttribution).length) {
      sessionStorage.setItem("vacleaner_attribution", JSON.stringify(currentAttribution));
    }

    let attribution: Record<string, string> = currentAttribution;
    if (!Object.keys(attribution).length) {
      try {
        attribution = JSON.parse(sessionStorage.getItem("vacleaner_attribution") ?? "{}") as Record<string, string>;
      } catch {
        attribution = {};
      }
    }

    const track = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest("a");
      if (!(link instanceof HTMLAnchorElement)) return;

      const href = link.getAttribute("href") ?? "";
      let eventName = "";
      if (href.includes("t.me/")) eventName = "contact_telegram";
      else if (href.includes("instagram.com/")) eventName = "contact_instagram";
      else if (href.startsWith("tel:")) eventName = "contact_phone";
      else if (href.includes("/rishennia")) eventName = "view_solution";
      if (!eventName) return;

      dataLayer.push({
        event: eventName,
        link_text: (link.textContent ?? "").trim().slice(0, 80),
        link_url: href,
        page_path: window.location.pathname,
        ...attribution,
      });
    };

    document.addEventListener("click", track);
    return () => document.removeEventListener("click", track);
  }, []);
}
