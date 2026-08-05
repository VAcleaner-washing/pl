import type { Metadata } from "next";
import { ArrowIcon, SiteFrame } from "../components/SiteFrame";
import { instagram, telegram } from "../site-data";

export const metadata: Metadata = {
  title: "Контакти VAcleaner — Полтава",
  description: "Забронювати рішення VAcleaner в Instagram або Telegram. Доставка по Полтаві та самовивіз.",
  alternates: { canonical: "/kontakty" },
};

export default function ContactsPage() {
  return (
    <SiteFrame>
      <section className="contact-hero">
        <p className="eyebrow"><span /> Почнімо з вашої задачі</p>
        <h1>Напишіть, що хочете очистити.<br /><em>Решту складемо ми.</em></h1>
        <p>Надішліть короткий опис, фото за потреби та бажану дату. Відповімо з конкретним рішенням і повною вартістю.</p>
      </section>

      <section className="contact-grid">
        <a className="contact-card contact-card-gold" href={telegram} target="_blank" rel="noreferrer">
          <span>Основний канал</span>
          <h2>Telegram</h2>
          <p>+38 (095) 391 95 69</p>
          <b>Написати <ArrowIcon /></b>
        </a>
        <a className="contact-card" href={instagram} target="_blank" rel="noreferrer">
          <span>Більше процесу й результатів</span>
          <h2>Instagram</h2>
          <p>@vacleaner_washing.pl</p>
          <b>Написати <ArrowIcon /></b>
        </a>
        <a className="contact-card" href="tel:+380953919569">
          <span>Телефон</span>
          <h2>Подзвонити</h2>
          <p>Щодня, 09:00–19:00</p>
          <b>+38 (095) 391 95 69</b>
        </a>
      </section>

      <section className="contact-facts">
        <div><span>01</span><h3>Полтава</h3><p>Працюємо локально й погоджуємо зручний час передачі.</p></div>
        <div><span>02</span><h3>Доставка — 250 грн</h3><p>По місту. Також можна забрати комплект самостійно.</p></div>
        <div><span>03</span><h3>Передплата — 200 грн</h3><p>Фіксує дату й входить у погоджену суму замовлення.</p></div>
      </section>
    </SiteFrame>
  );
}
