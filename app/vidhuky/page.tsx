/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { ArrowIcon, BookingCta, SiteFrame } from "../components/SiteFrame";
import { instagram, reviews } from "../site-data";

export const metadata: Metadata = {
  title: "Процес і результати — VAcleaner Полтава",
  description: "Живі кадри домашнього прибирання з технікою VAcleaner: текстиль, комплекти техніки та HOME RESET.",
  alternates: { canonical: "/vidhuky" },
};

export default function ReviewsPage() {
  return (
    <SiteFrame>
      <section className="inner-hero">
        <div>
          <p className="eyebrow"><span /> Процес без прикрас</p>
          <h1>Як проходить<br /><em>реальне прибирання.</em></h1>
        </div>
        <p>Показуємо техніку в роботі, послідовність і результат — без рекламних цитат від імені клієнтів.</p>
      </section>

      <section className="inner-section reviews-page-grid">
        {reviews.map((review) => (
          <article className="review-story" key={review.quote}>
            <div className="review-story-image">
              <img src={review.image} alt={`Процес прибирання: ${review.tag}`} />
              <span>{review.tag}</span>
            </div>
            <div>
              <blockquote>{review.quote}</blockquote>
              <p>{review.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="social-proof">
        <div>
          <p className="eyebrow"><span /> Більше живих кадрів</p>
          <h2>Більше процесу й результатів — в Instagram.</h2>
        </div>
        <a className="button button-gold" href={instagram} target="_blank" rel="noreferrer">
          Відкрити Instagram <ArrowIcon />
        </a>
      </section>
      <BookingCta />
    </SiteFrame>
  );
}
