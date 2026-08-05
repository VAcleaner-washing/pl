/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { ArrowIcon, BookingCta, SiteFrame } from "../components/SiteFrame";
import { solutions } from "../site-data";

export const metadata: Metadata = {
  title: "Рішення для прибирання — VAcleaner Полтава",
  description: "Підбір готового рішення для дивана, матраца, кухні, ванної або вікон: техніка, засоби, інструктаж і підтримка.",
  alternates: { canonical: "/rishennia" },
};

export default function SolutionsPage() {
  return (
    <SiteFrame>
      <section className="inner-hero">
        <div>
          <p className="eyebrow"><span /> Підбір за задачею</p>
          <h1>Не обирайте техніку.<br /><em>Оберіть результат.</em></h1>
        </div>
        <p>Розкажіть, що потрібно очистити. VAcleaner підбере обладнання, засоби й послідовність — без зайвих позицій у комплекті.</p>
      </section>

      <section className="inner-section">
        <div className="editorial-grid">
          {solutions.map((item) => (
            <article className="editorial-card" key={item.slug}>
              <a className="editorial-image" href={`/rishennia/${item.slug}`}>
                <img src={item.image} alt={item.model} />
                <span>{item.number}</span>
              </a>
              <div className="editorial-body">
                <p className="card-kicker">{item.label} · {item.model}</p>
                <h2><a href={`/rishennia/${item.slug}`}>{item.title}</a></h2>
                <p>{item.description}</p>
                <div className="editorial-footer">
                  <strong>{item.price} / доба</strong>
                  <a href={`/rishennia/${item.slug}`}>Детальніше <ArrowIcon /></a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="choice-strip">
        <p>Не знаєте, що підійде?</p>
        <h2>Надішліть фото або коротко опишіть задачу — ми зберемо рішення.</h2>
        <a href="/kontakty">Як зв’язатися <ArrowIcon /></a>
      </section>
      <BookingCta />
    </SiteFrame>
  );
}
