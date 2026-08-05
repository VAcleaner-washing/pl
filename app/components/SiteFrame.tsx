"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";
import { instagram, telegram } from "../site-data";
import { useClickTracking } from "./useClickTracking";

export function ArrowIcon() {
  return (
    <svg className="icon-arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 12 12 4M6 4h6v6" />
    </svg>
  );
}

const nav = [
  ["/rishennia", "Рішення"],
  ["/komplekty", "Комплекти"],
  ["/yak-tse-pratsiuie", "Як це працює"],
  ["/vidhuky", "Процес"],
  ["/faq", "FAQ"],
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  useClickTracking();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className="site-header">
        <a className="brand" href="/" aria-label="VAcleaner — на головну">
          <span className="brand-mark">VA</span>
          <span className="brand-copy">
            <strong>CLEANER</strong>
            <small>POLTAVA</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Головна навігація">
          {nav.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
        </nav>
        <a className="header-cta" href="/bronuvannia">
          Забронювати онлайн <ArrowIcon />
        </a>
        <button
          className="menu-button"
          type="button"
          aria-label={menuOpen ? "Закрити меню" : "Відкрити меню"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </header>
      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`}>
        <nav aria-label="Мобільна навігація">
          {nav.map(([href, label]) => (
            <a href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
          <a href="/kontakty" onClick={() => setMenuOpen(false)}>Контакти</a>
        </nav>
        <div className="mobile-menu-actions">
          <a className="button button-gold" href="/bronuvannia">
            Забронювати онлайн <ArrowIcon />
          </a>
          <a className="button button-outline" href={instagram} target="_blank" rel="noreferrer">
            Instagram <ArrowIcon />
          </a>
        </div>
      </div>
    </>
  );
}

export function SiteFooter() {
  return (
    <>
      <footer>
        <div className="footer-main">
          <a className="brand footer-brand" href="/">
            <span className="brand-mark">VA</span>
            <span className="brand-copy"><strong>CLEANER</strong><small>POLTAVA</small></span>
          </a>
          <p>Сервіс самостійного глибокого прибирання в Полтаві.</p>
          <div className="footer-links">
            <a href="/rishennia">Рішення</a>
            <a href="/komplekty">Комплекти</a>
            <a href="/yak-tse-pratsiuie">Як це працює</a>
            <a href="/vidhuky">Процес</a>
            <a href="/faq">FAQ</a>
            <a href="/kontakty">Контакти</a>
            <a href="/umovy">Умови сервісу</a>
            <a href={instagram} target="_blank" rel="noreferrer">Instagram</a>
            <a href={telegram} target="_blank" rel="noreferrer">Telegram</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} VAcleaner</span>
          <span>Полтава · +38 (095) 391 95 69</span>
        </div>
      </footer>
      <div className="mobile-booking">
        <a href="/bronuvannia">
          Забронювати онлайн <ArrowIcon />
        </a>
        <a href={instagram} target="_blank" rel="noreferrer" aria-label="Відкрити Instagram VAcleaner">
          Instagram <ArrowIcon />
        </a>
      </div>
    </>
  );
}

export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <SiteHeader />
      {children}
      <SiteFooter />
    </main>
  );
}

export function BookingCta({
  title = "Почнімо з вашої задачі",
  text = "Напишіть, що хочете очистити й на яку дату. Ми складемо рішення та одразу порахуємо вартість.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="final-cta">
      <div className="final-cta-orbit orbit-one" />
      <div className="final-cta-orbit orbit-two" />
      <p className="eyebrow"><span /> Онлайн-запис</p>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="final-actions">
        <a className="button button-gold" href="/bronuvannia">
          Перевірити вільну дату <ArrowIcon />
        </a>
        <a className="button button-outline" href={instagram} target="_blank" rel="noreferrer">
          Instagram <ArrowIcon />
        </a>
      </div>
      <small>Передплата 200 грн входить у погоджену суму · доставка до вас і назад — 250 грн · самовивіз: вул. Європейська, 146Е</small>
    </section>
  );
}
