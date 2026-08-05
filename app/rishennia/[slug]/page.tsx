/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowIcon, BookingCta, SiteFrame } from "../../components/SiteFrame";
import { solutions } from "../../site-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return solutions.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = solutions.find((solution) => solution.slug === slug);
  if (!item) return {};
  return {
    title: `${item.model} — сервіс VAcleaner у Полтаві`,
    description: `${item.title}: готове рішення VAcleaner з інструктажем, комплектом і підтримкою. ${item.price} за добу.`,
    alternates: { canonical: `/rishennia/${item.slug}` },
  };
}

export default async function SolutionPage({ params }: Props) {
  const { slug } = await params;
  const item = solutions.find((solution) => solution.slug === slug);
  if (!item) notFound();

  return (
    <SiteFrame>
      <section className="product-hero">
        <div className="product-copy">
          <a className="breadcrumb" href="/rishennia">← Усі рішення</a>
          <p className="eyebrow"><span /> {item.label} · {item.model}</p>
          <h1>{item.title}</h1>
          <p>{item.longDescription}</p>
          <div className="product-price">
            <strong>{item.price}</strong>
            <span>за одну добу</span>
          </div>
          <div className="hero-actions">
            <a className="button button-gold" href={`/bronuvannia?product=${item.slug === "textile" ? "puzzi" : item.slug === "steam" ? "sc2" : item.slug === "windows" ? "abir" : "puzzi_jimmy"}`}>
              Перевірити вільну дату <ArrowIcon />
            </a>
            <a className="button button-ghost" href="#details">Що входить ↓</a>
          </div>
        </div>
        <div className="product-image">
          <img src={item.image} alt={item.model} />
          <span className="solution-label">{item.model}</span>
        </div>
      </section>

      <section className="details-section" id="details">
        <article>
          <p className="eyebrow"><span /> Комплектація</p>
          <h2>Усе потрібне вже зібрано</h2>
          <ul className="feature-list">
            {item.includes.map((entry, index) => (
              <li key={entry}><span>{String(index + 1).padStart(2, "0")}</span>{entry}</li>
            ))}
          </ul>
        </article>
        <article>
          <p className="eyebrow"><span /> Підходить для</p>
          <h2>Одна задача — кілька зон</h2>
          <div className="tag-cloud">
            {item.suitable.map((entry) => <span key={entry}>{entry}</span>)}
          </div>
        </article>
      </section>

      <section className="result-section">
        <div>
          <p className="eyebrow"><span /> Що отримуєте</p>
          <h2>Результат без хаосу в процесі</h2>
        </div>
        <div className="result-grid">
          {item.result.map((entry, index) => (
            <div key={entry}><span>0{index + 1}</span><p>{entry}</p></div>
          ))}
        </div>
      </section>

      <section className="mini-process">
        <div><span>01</span><h3>Описуєте задачу</h3><p>Фото, поверхня, приблизний обсяг і дата.</p></div>
        <div><span>02</span><h3>Отримуєте комплект</h3><p>Чиста техніка, насадки й потрібні засоби.</p></div>
        <div><span>03</span><h3>Проходите інструктаж</h3><p>Коротко, по суті та під вашу поверхню.</p></div>
        <div><span>04</span><h3>Працюєте з підтримкою</h3><p>VAcleaner залишається на зв’язку.</p></div>
      </section>
      <BookingCta title={`Потрібне рішення «${item.title}»?`} />
    </SiteFrame>
  );
}
