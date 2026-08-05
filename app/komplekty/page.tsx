import type { Metadata } from "next";
import { ArrowIcon, BookingCta, SiteFrame } from "../components/SiteFrame";
import { packages } from "../site-data";

export const metadata: Metadata = {
  title: "Комплекти для прибирання — VAcleaner",
  description: "Готові комплекти техніки й засобів для глибокого очищення текстилю, генерального прибирання та повного HOME RESET.",
  alternates: { canonical: "/komplekty" },
};

export default function PackagesPage() {
  return (
    <SiteFrame>
      <section className="inner-hero">
        <div>
          <p className="eyebrow"><span /> Кілька задач одним бронюванням</p>
          <h1>Комплект, який працює<br /><em>як єдина система.</em></h1>
        </div>
        <p>Не збираємо випадковий набір техніки. Кожен комплект має зрозумілий сценарій, послідовність і реальний обсяг роботи на день.</p>
      </section>

      <section className="inner-section package-page-grid">
        {packages.map((item) => (
          <article className={`package-card package-card-large ${item.featured ? "featured" : ""}`} key={item.title}>
            <p className="package-eyebrow">{item.eyebrow}</p>
            <h2>{item.title}</h2>
            <p className="package-items">{item.items}</p>
            <p className="package-purpose">{item.purpose}</p>
            <ul>
              {item.tasks.map((task) => <li key={task}>{task}</li>)}
            </ul>
            <div className="package-price"><strong>{item.price}</strong><span>{item.note}</span></div>
            <p className="package-value">{item.value}</p>
            <a className="package-link" href={`/bronuvannia?product=${item.code}`}>Перевірити вільну дату <ArrowIcon /></a>
          </article>
        ))}
      </section>

      <section className="day-section">
        <div className="day-heading">
          <p className="eyebrow"><span /> HOME RESET</p>
          <h2>Приклад маршруту<br />на один день.</h2>
          <p>Орієнтовна послідовність для HOME RESET, а не обіцянка однакового таймінгу для кожного дому. Точний план складаємо під ваш обсяг.</p>
        </div>
        <div className="timeline">
          <div><time>09:00</time><span>01</span><h3>Диван і крісла</h3><p>Kärcher Puzzi</p></div>
          <div><time>11:00</time><span>02</span><h3>Матрац</h3><p>Jimmy + Puzzi</p></div>
          <div><time>13:30</time><span>03</span><h3>Кухня та ванна</h3><p>Kärcher SC 2</p></div>
          <div><time>16:30</time><span>04</span><h3>Вікна</h3><p>ABIR WD8</p></div>
          <div><time>18:00</time><span>05</span><h3>Чистий дім</h3><p>Справу зроблено</p></div>
        </div>
      </section>
      <BookingCta title="Підберемо комплект під ваш дім" />
    </SiteFrame>
  );
}
