import type { Metadata } from "next";
import { BookingCta, SiteFrame } from "../components/SiteFrame";
import { faqs } from "../site-data";

export const metadata: Metadata = {
  title: "Питання та відповіді — VAcleaner",
  description: "Відповіді про бронювання, доставку, комплектацію, засоби, строки та користування технікою VAcleaner.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <SiteFrame>
      <section className="inner-hero">
        <div>
          <p className="eyebrow"><span /> Без дрібного шрифту</p>
          <h1>Коротко про<br /><em>важливе.</em></h1>
        </div>
        <p>Умови, комплектація й процес мають бути зрозумілими до бронювання. Якщо питання немає у списку — відповімо особисто.</p>
      </section>

      <section className="faq-page">
        <div className="faq-page-aside">
          <p>Не знайшли відповідь?</p>
          <a href="/kontakty">Перейти до контактів →</a>
          <small>Щодня, 09:00–19:00</small>
        </div>
        <div className="faq-list faq-list-large">
          {faqs.map((faq, index) => (
            <details key={faq.q}>
              <summary><span>{String(index + 1).padStart(2, "0")}</span>{faq.q}<b aria-hidden="true">+</b></summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
      <BookingCta />
    </SiteFrame>
  );
}
