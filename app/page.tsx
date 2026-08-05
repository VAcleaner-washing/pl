"use client";
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useClickTracking } from "./components/useClickTracking";
import { telegram } from "./site-data";

const instagram = "https://www.instagram.com/vacleaner_washing.pl/";

const solutions = [
  {
    code: "puzzi",
    id: "textile",
    kicker: "М’які меблі",
    title: "Диван і крісла",
    description: "Глибоке очищення тканини від побутового бруду, пилу та слідів щоденного життя.",
    model: "Kärcher Puzzi 8/1",
    price: "700 грн / доба",
    image: "/assets/puzzi.webp",
  },
  {
    code: "puzzi_jimmy",
    id: "mattress",
    kicker: "Місце, де ви спите",
    title: "Матрац",
    description: "Сухий етап із Jimmy та глибоке промивання Puzzi — окремо або одним комплектом.",
    model: "Jimmy JV35 + Puzzi",
    price: "від 350 грн",
    image: "/assets/jimmy.webp",
  },
  {
    code: "sc2",
    id: "steam",
    kicker: "Без десятка засобів",
    title: "Кухня і ванна",
    description: "Пара розм’якшує жир, наліт і бруд у стиках, на плитці та твердих поверхнях.",
    model: "Kärcher SC 2 Deluxe",
    price: "500 грн / доба",
    image: "/assets/sc2.webp",
  },
  {
    code: "abir",
    id: "windows",
    kicker: "Без висоти й зайвого ризику",
    title: "Вікна",
    description: "Робот рухається по склу сам і підходить для звичайних та панорамних вікон.",
    model: "ABIR WD8",
    price: "800 грн / доба",
    image: "/assets/abir.webp",
  },
];

const packages = [
  {
    code: "puzzi_jimmy",
    label: "Для текстилю",
    title: "Puzzi + Jimmy",
    description: "Диван, крісла, матрац і м’які поверхні одним логічним комплектом.",
    price: "1 050 грн",
    term: "за одну добу",
    value: "Ціна як окремо · одна заявка й одна видача",
  },
  {
    code: "general",
    label: "Генеральне",
    title: "Puzzi + SC 2 + Jimmy",
    description: "Текстиль, кухня, ванна та поверхні за один день.",
    price: "1 300 грн",
    term: "за одну добу",
    value: "Економія 250 грн проти оренди окремо",
  },
  {
    code: "elite",
    label: "HOME RESET",
    title: "Увесь дім",
    description: "Puzzi, SC 2, Jimmy та ABIR — повний набір для домашнього ресету.",
    price: "від 2 300 грн",
    term: "за 1 будній день",
    value: "Будній день — 2 300 грн · один вихідний — 2 500 грн · субота + неділя — 3 500 грн",
    featured: true,
  },
];

const faqs = [
  {
    q: "Я ніколи не користувався такою технікою. Впораюсь?",
    a: "Так. Перед передачею показуємо запуск, правильну послідовність і догляд за технікою. Під час прибирання залишаємося на зв’язку в месенджері.",
  },
  {
    q: "Що входить у сервіс?",
    a: "Перевірена техніка, потрібні насадки, короткий інструктаж і підтримка. З Puzzi завжди видаємо 8 порцій хімії: після повернення оплачуєте лише використані по 50 грн, а за відмітку VAcleaner у сторіс 2 використані порції безкоштовні.",
  },
  {
    q: "Є доставка по Полтаві?",
    a: "Так. Самовивіз: вул. Європейська, 146Е. Доставка в межах Полтави — 250 грн за привезення техніки до вас і повернення назад; у заявці потрібно вказати адресу.",
  },
  {
    q: "Як зафіксувати дату?",
    a: "Напишіть у Telegram або Instagram, вкажіть задачу та бажану дату. Після узгодження повної вартості дата фіксується передплатою 200 грн. Це частина суми замовлення, а не додаткова оплата.",
  },
  {
    q: "Скільки сохне текстиль після очищення?",
    a: "Зазвичай 6–12 годин — залежно від тканини, кількості проходів і вентиляції. Користуйтеся диваном або матрацом лише після повного висихання.",
  },
  {
    q: "Як зрозуміти, чи підходить спосіб для моєї поверхні?",
    a: "Надішліть фото й назву матеріалу до бронювання. Ми перевіримо сумісність і підкажемо, де потрібен тест на непомітній ділянці.",
  },
];

function Arrow() {
  return (
    <svg className="icon-arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 12 12 4M6 4h6v6" />
    </svg>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  useClickTracking();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <main className="home-v21">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="VAcleaner — на головну">
          <span className="brand-mark">VA</span>
          <span className="brand-copy">
            <strong>CLEANER</strong>
            <small>POLTAVA</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Головна навігація">
          <a href="/rishennia">Що почистити</a>
          <a href="/komplekty">Комплекти</a>
          <a href="/yak-tse-pratsiuie">Як це працює</a>
          <a href="/vidhuky">Процес</a>
          <a href="/faq">FAQ</a>
        </nav>

        <a className="header-cta" href="/bronuvannia">
          Забронювати онлайн <Arrow />
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
          <a href="/rishennia" onClick={() => setMenuOpen(false)}>Що почистити</a>
          <a href="/komplekty" onClick={() => setMenuOpen(false)}>Комплекти</a>
          <a href="/yak-tse-pratsiuie" onClick={() => setMenuOpen(false)}>Як це працює</a>
          <a href="/vidhuky" onClick={() => setMenuOpen(false)}>Процес</a>
          <a href="/faq" onClick={() => setMenuOpen(false)}>FAQ</a>
          <a href="/kontakty" onClick={() => setMenuOpen(false)}>Контакти</a>
        </nav>
        <div className="mobile-menu-actions">
          <a className="button button-gold" href="/bronuvannia">Забронювати онлайн <Arrow /></a>
          <a className="button button-outline" href={instagram} target="_blank" rel="noreferrer">Instagram <Arrow /></a>
        </div>
      </div>

      <section className="v21-hero" id="top">
        <div className="v21-hero-copy">
          <p className="v21-kicker"><span /> Диван виглядає чистим. А що покаже вода після першого проходу?</p>
          <h1>Глибоке прибирання — <em>без виклику майстра.</em></h1>
          <p className="v21-lead">
            Отримуєте техніку, професійні засоби й короткий інструктаж.
            Прибираєте у своєму темпі, а ми залишаємося на зв’язку до результату.
          </p>
          <div className="v21-price-line">
            <strong>від 500 грн</strong>
            <span>за готове рішення на добу</span>
          </div>
          <div className="v21-actions">
            <a className="v21-primary" href="/bronuvannia">
              Перевірити вільну дату <Arrow />
            </a>
            <a className="v21-secondary" href="#choose">Підібрати рішення ↓</a>
          </div>
          <p className="v21-action-note">Напишіть, що хочете почистити — менеджер підкаже комплект і точну вартість.</p>
          <div className="v21-included" aria-label="Що входить у сервіс">
            <span>Техніка</span><i />
            <span>Засоби</span><i />
            <span>Інструктаж</span><i />
            <span>Підтримка</span>
          </div>
        </div>

        <div className="v21-hero-media">
          <img
            src="/assets/cleaning-process-poster.webp"
            alt="VAcleaner доставляє готовий комплект для прибирання"
            fetchPriority="high"
          />
          <div className="v21-media-shade" />
          <div className="v21-media-caption">
            <span>Усе готово до старту</span>
            <strong>Техніка, засоби та зрозумілий план</strong>
          </div>
        </div>
      </section>

      <section className="v21-trust-strip" aria-label="Коротко про сервіс">
        <p><strong>01</strong> Доставка по Полтаві</p>
        <p><strong>02</strong> Засоби в комплекті</p>
        <p><strong>03</strong> Інструктаж перед стартом</p>
        <p><strong>04</strong> Підтримка до завершення</p>
      </section>

      <section className="v21-light v21-choose" id="choose">
        <div className="v21-heading">
          <div>
            <p className="v21-kicker dark"><span /> Почніть із результату</p>
            <h2>Що хочете<br />почистити?</h2>
          </div>
          <p>
            Вам не потрібно знати моделі чи характеристики. Оберіть задачу —
            ми запропонуємо техніку, засоби й зрозумілий план.
          </p>
        </div>

        <div className="v21-solutions">
          {solutions.map((item, index) => (
            <a className="v21-solution" href={`/rishennia/${item.id}`} key={item.id}>
              <div className="v21-solution-image">
                <img src={item.image} alt={item.model} loading="lazy" />
                <span>0{index + 1}</span>
              </div>
              <div className="v21-solution-copy">
                <small>{item.kicker}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div>
                  <span>{item.model}</span>
                  <strong>{item.price}</strong>
                </div>
                <b>Дивитися рішення <Arrow /></b>
              </div>
            </a>
          ))}
        </div>
        <div className="v21-choice-help">
          <div>
            <strong>Не знаєте, що підійде?</strong>
            <span>Опишіть задачу одним повідомленням — без бронювання й зобов’язань.</span>
          </div>
          <a href={telegram} target="_blank" rel="noreferrer">Запитати менеджера <Arrow /></a>
        </div>
      </section>

      <section className="v21-service v21-anna" id="about">
        <div className="v21-anna-media">
          <div className="v21-anna-placeholder" aria-hidden="true">
            <strong>VA</strong>
            <small>ANNA · FOUNDER</small>
          </div>
          <span>Менеджер VAcleaner · підтримка</span>
        </div>
        <div className="v21-service-intro">
          <p className="v21-kicker"><span /> Жива допомога, не чат-бот</p>
          <h2>Менеджер поруч.<br /><em>Допоможе впоратися.</em></h2>
          <p>
            Підбираю техніку під конкретну задачу, показую, як нею користуватися,
            і залишаюся на зв’язку під час прибирання. Техніку після кожної оренди
            очищаємо, перевіряємо й готуємо до наступної видачі.
          </p>
          <a href={telegram} target="_blank" rel="noreferrer">Поставити питання менеджеру <Arrow /></a>
        </div>

        <div className="v21-service-list">
          {[
            ["Підбір без переплати", "Раджу тільки те, що справді знадобиться для вашої задачі."],
            ["Чиста й перевірена техніка", "Після повернення все очищаємо, перевіряємо та комплектуємо заново."],
            ["Інструктаж людською мовою", "Показую запуск і послідовність без довгих технічних пояснень."],
          ].map(([title, text], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="v21-light v21-day">
        <div className="v21-heading">
          <div>
            <p className="v21-kicker dark"><span /> Реальний план</p>
            <h2>HOME RESET:<br />маршрут на один день.</h2>
          </div>
          <p>Без гонитви за «ідеально». Просто зрозумілий маршрут, з яким за день можна пройти основні зони дому.</p>
        </div>

        <div className="v21-day-grid">
          {[
            ["09:00", "Диван і крісла", "Puzzi"],
            ["11:00", "Матрац", "Jimmy + Puzzi"],
            ["13:30", "Кухня та ванна", "SC 2 Deluxe"],
            ["16:30", "Вікна", "ABIR WD8"],
            ["18:00", "Дім знову свіжий", "Готово"],
          ].map(([time, title, tool], index) => (
            <article key={time}>
              <span>0{index + 1}</span>
              <time>{time}</time>
              <h3>{title}</h3>
              <p>{tool}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="v21-packages">
        <div className="v21-heading inverse">
          <div>
            <p className="v21-kicker"><span /> Коли однієї задачі мало</p>
            <h2>Готові комплекти</h2>
          </div>
          <p>Кілька етапів одним бронюванням. Де є реальна економія — показуємо її прямо, без загальних обіцянок.</p>
        </div>

        <div className="v21-package-grid">
          {packages.map((item) => (
            <article className={item.featured ? "is-featured" : ""} key={item.title}>
              <small>{item.label}</small>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <strong>{item.price}</strong>
              <span>{item.term}</span>
              <b>{item.value}</b>
              <a href={`/bronuvannia?product=${item.code}`}>Перевірити вільну дату <Arrow /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="v21-light v21-reviews">
        <div className="v21-heading">
          <div>
            <p className="v21-kicker dark"><span /> Процес без прикрас</p>
            <h2>Як це виглядає<br />у реальному прибиранні.</h2>
          </div>
          <p>Процес і результат у деталях — без рекламних цитат та випадкових обіцянок.</p>
        </div>

        <div className="v21-review-grid">
          {[
            ["/assets/review-1.webp", "Диван + матрац", "Послідовне очищення двох домашніх зон"],
            ["/assets/review-2.webp", "Kärcher Puzzi", "Глибоке промивання домашнього текстилю"],
            ["/assets/review-3.webp", "HOME RESET", "Кілька задач одним готовим комплектом"],
          ].map(([image, label, caption]) => (
            <article key={caption}>
              <img src={image} alt="" loading="lazy" />
              <span>{label}</span>
              <blockquote>{caption}</blockquote>
            </article>
          ))}
        </div>
        <a className="v21-dark-link" href="/vidhuky">Більше кадрів процесу <Arrow /></a>
      </section>

      <section className="v21-faq">
        <div>
          <p className="v21-kicker"><span /> Без дрібного шрифту</p>
          <h2>Коротко про важливе</h2>
          <p>Якщо вашого питання тут немає — напишіть. Відповідаємо щодня з 09:00 до 19:00.</p>
          <a href="tel:+380953919569">+38 (095) 391 95 69</a>
        </div>
        <div className="v21-faq-list">
          {faqs.map((item, index) => (
            <details key={item.q}>
              <summary><span>0{index + 1}</span>{item.q}<b aria-hidden="true">+</b></summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="v21-final">
        <p className="v21-kicker"><span /> Почнімо з вашої задачі</p>
        <h2>Напишіть, що хочете почистити.</h2>
        <p>Підберемо комплект, порахуємо точну вартість і забронюємо дату.</p>
        <div>
          <a className="v21-primary" href="/bronuvannia">Перевірити вільну дату <Arrow /></a>
          <a className="v21-secondary" href={instagram} target="_blank" rel="noreferrer">Написати в Instagram <Arrow /></a>
        </div>
        <small>Передплата 200 грн входить у погоджену суму · доставка до вас і назад — 250 грн · самовивіз: вул. Європейська, 146Е</small>
      </section>

      <footer>
        <div className="footer-main">
          <a className="brand footer-brand" href="#top">
            <span className="brand-mark">VA</span>
            <span className="brand-copy"><strong>CLEANER</strong><small>POLTAVA</small></span>
          </a>
          <p>Готові рішення для глибокого прибирання вдома.</p>
          <div className="footer-links">
            <a href="/rishennia">Що почистити</a>
            <a href="/komplekty">Комплекти</a>
            <a href="/yak-tse-pratsiuie">Як це працює</a>
            <a href="/vidhuky">Процес</a>
            <a href="/faq">FAQ</a>
            <a href="/kontakty">Контакти</a>
            <a href="/umovy">Умови</a>
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
        <a href="/bronuvannia">Забронювати онлайн <Arrow /></a>
        <a href={instagram} target="_blank" rel="noreferrer" aria-label="Відкрити Instagram VAcleaner">Instagram <Arrow /></a>
      </div>
    </main>
  );
}
