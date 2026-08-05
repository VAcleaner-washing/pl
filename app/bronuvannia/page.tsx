"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowIcon, SiteFrame } from "../components/SiteFrame";
import { telegram } from "../site-data";
import { supabase } from "../supabase";

const products = [
  { code: "puzzi", label: "Kärcher Puzzi", detail: "Текстиль · 8 порцій хімії видаємо в комплекті", price: "Будні · 700 грн  |  1 вихідний · 800 грн" },
  { code: "puzzi_jimmy", label: "Puzzi + Jimmy", detail: "Текстиль і матраци", price: "Будні · 1 050 грн  |  1 вихідний · 1 150 грн" },
  { code: "sc2", label: "Kärcher SC 2", detail: "Кухня, ванна, плитка", price: "Будні · 500 грн  |  1 вихідний · 600 грн" },
  { code: "abir", label: "Робот ABIR", detail: "Вікна, дзеркала, гладкі поверхні", price: "Будні · 800 грн  |  1 вихідний · 900 грн" },
  { code: "combo", label: "Тариф «Комбо»", detail: "Puzzi + SC 2", price: "Будні · 1 000 грн  |  1 вихідний · 1 200 грн  |  Сб + Нд · 1 800 грн" },
  { code: "general", label: "Генеральне", detail: "Puzzi + SC 2 + Jimmy", price: "Будні · 1 300 грн  |  1 вихідний · 1 400 грн  |  Сб + Нд · 2 200 грн" },
  { code: "ideal_windows", label: "Ідеальні вікна", detail: "SC 2 + ABIR", price: "Будні · 1 200 грн  |  1 вихідний · 1 300 грн  |  Сб + Нд · 1 900 грн" },
  { code: "elite", label: "HOME RESET", detail: "Puzzi + SC 2 + Jimmy + ABIR", price: "Будні · 2 300 грн  |  1 вихідний · 2 500 грн  |  Сб + Нд · 3 500 грн" },
] as const;

const extras = [
  { code: "premium_nozzles", label: "Насадки «Преміум» до SC 2", detail: "Для швів, кутів і точкового очищення", price: 200, sc2Only: true },
  { code: "odour_zero", label: "Odour Zero", detail: "Тютюн, вогкість, кухня та запахи тварин", price: 250 },
  { code: "neutralix", label: "Neutralix · концентрат", detail: "Нейтралізує запахи сечі, тварин, тютюну та вогкості на текстилі, м’яких меблях, в авто й приміщенні", price: 250 },
  { code: "shower_care", label: "Shower Care", detail: "Вапняний і мильний наліт у душі та ванній", price: 250 },
  { code: "soft_degreaser", label: "Soft Degreaser", detail: "Непригорілий жир і кухонний бруд", price: 250 },
  { code: "grill_force", label: "Grill Force", detail: "Нагар і пригорілий жир у духовках та грилях", price: 250 },
  { code: "scalex_pro", label: "Scalex Pro", detail: "Іржа, водний наліт і вапняні відкладення", price: 250 },
  { code: "eco_clean", label: "Eco Clean", detail: "Щоденний бруд на сталі, склі, пластику й кераміці", price: 250 },
  { code: "glass_perfect", label: "Glass Perfect Care", detail: "Скло, дзеркала й глянець без розводів", price: 150 },
] as const;

type Estimate = {
  rentalDays: number;
  baseAmount: number;
  extrasAmount: number;
  deliveryAmount: number;
  totalAmount: number;
  prepaymentAmount: number;
};

type Availability = "idle" | "checking" | "available" | "unavailable" | "error";

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const money = (value: number) => new Intl.NumberFormat("uk-UA").format(value);

const dayLabel = (days: number) => {
  const lastTwo = days % 100;
  const last = days % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${days} діб`;
  if (last === 1) return `${days} доба`;
  if (last >= 2 && last <= 4) return `${days} доби`;
  return `${days} діб`;
};

const billableDays = (
  startDate: string,
  returnDate: string,
  pickupWindow: "morning" | "evening",
  returnWindow: "morning" | "evening",
) => {
  if (!startDate || !returnDate || returnDate < startDate) return 0;
  const start = new Date(`${startDate}T12:00:00.000Z`);
  const end = new Date(`${returnDate}T12:00:00.000Z`);
  const calendarDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const pickupOrder = pickupWindow === "morning" ? 0 : 1;
  const returnOrder = returnWindow === "morning" ? 0 : 1;
  if (calendarDays === 0) return returnOrder > pickupOrder ? 1 : 0;
  return calendarDays + (returnOrder > pickupOrder ? 1 : 0);
};

const includesSc2 = (productCode: string) => ["sc2", "combo", "general", "ideal_windows", "elite"].includes(productCode);
const includesPuzzi = (productCode: string) => ["puzzi", "puzzi_jimmy", "combo", "general", "elite"].includes(productCode);

export default function BookingPage() {
  const [productCode, setProductCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [pickupWindow, setPickupWindow] = useState<"morning" | "evening">("morning");
  const [returnWindow, setReturnWindow] = useState<"morning" | "evening">("morning");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [storyMention, setStoryMention] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerTelegram, setCustomerTelegram] = useState("");
  const [customerComment, setCustomerComment] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [availability, setAvailability] = useState<Availability>("idle");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState<{ bookingCode: string; telegramText: string } | null>(null);

  const today = useMemo(() => new Date(), []);
  const minDate = toInputDate(today);
  const maxDate = toInputDate(addDays(today, 180));
  const activeExtras = useMemo(
    () => extras.filter((item) => !("sc2Only" in item) || !item.sc2Only || includesSc2(productCode)),
    [productCode],
  );
  const hasPuzzi = includesPuzzi(productCode);
  const extraPayload = useMemo(() => {
    return selectedExtras.map((code) => ({ code, quantity: 1 }));
  }, [selectedExtras]);
  const selectedRentalDays = useMemo(
    () => billableDays(startDate, returnDate, pickupWindow, returnWindow),
    [startDate, returnDate, pickupWindow, returnWindow],
  );
  const selectedProduct = useMemo(() => products.find((item) => item.code === productCode), [productCode]);
  const dateReady = availability === "available";
  const fulfillmentReady = fulfillment === "pickup" || deliveryAddress.trim().length >= 8;
  const contactReady = customerName.trim().length >= 5 && customerPhone.trim().length >= 7 && fulfillmentReady && privacyAccepted;
  const mobileAction = !productCode
    ? { label: "Обрати техніку", target: "booking-products" }
    : !dateReady
      ? { label: "Обрати дату", target: "booking-dates" }
      : !fulfillmentReady
        ? { label: "Вказати адресу", target: "booking-extras" }
      : !contactReady
        ? { label: "До контактів", target: "booking-contact" }
        : { label: "Надіслати заявку", target: "" };

  useEffect(() => {
    document.body.classList.add("booking-page-active");
    const query = new URLSearchParams(window.location.search);
    const requestedProduct = query.get("product");
    const initialStart = addDays(new Date(), 1);
    const timer = window.setTimeout(() => {
      if (requestedProduct && products.some((item) => item.code === requestedProduct)) setProductCode(requestedProduct);
      setStartDate(toInputDate(initialStart));
      setReturnDate(toInputDate(addDays(initialStart, 1)));
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove("booking-page-active");
    };
  }, []);

  useEffect(() => {
    if (!productCode || !startDate || !returnDate || selectedRentalDays < 1 || selectedRentalDays > 14) {
      const timer = window.setTimeout(() => {
        setAvailability("idle");
        setEstimate(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setAvailability("checking");
      setFormError("");
      const { data, error } = await supabase.functions.invoke("vacleaner-booking", {
        body: {
          action: "availability",
          productCode,
          startDate,
          returnDate,
          pickupWindow,
          returnWindow,
          fulfillment,
          deliveryAddress,
          extras: extraPayload,
          storyMention: hasPuzzi && storyMention,
        },
      });
      if (!active) return;
      if (error || !data) {
        setAvailability("error");
        setEstimate(null);
        return;
      }
      setEstimate(data.estimate as Estimate);
      setAvailability(data.available ? "available" : "unavailable");
    }, 320);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [productCode, startDate, returnDate, pickupWindow, returnWindow, fulfillment, deliveryAddress, extraPayload, hasPuzzi, storyMention, selectedRentalDays]);

  const chooseProduct = (code: string) => {
    setProductCode(code);
    if (!includesSc2(code)) setSelectedExtras((current) => current.filter((item) => item !== "premium_nozzles"));
    if (!includesPuzzi(code)) {
      setStoryMention(false);
    }
  };

  const toggleExtra = (code: string) => {
    setSelectedExtras((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  };

  const scrollToStep = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (availability !== "available") {
      setFormError("Спочатку оберіть доступний період.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("vacleaner-booking", {
      body: {
        action: "create",
        productCode,
        startDate,
        returnDate,
        pickupWindow,
        returnWindow,
        fulfillment,
        deliveryAddress,
        extras: extraPayload,
        storyMention: hasPuzzi && storyMention,
        customerName,
        customerPhone,
        customerTelegram,
        customerComment,
        privacyAccepted,
      },
    });
    setSubmitting(false);

    if (error || !data?.success) {
      const code = data?.error;
      if (code === "not_available") setFormError("Поки ви заповнювали форму, цей період став недоступним. Оберіть інші дати.");
      else if (code === "rate_limited") setFormError("Забагато заявок за короткий час. Спробуйте трохи пізніше.");
      else setFormError("Не вдалося створити заявку. Перевірте телефон і спробуйте ще раз.");
      return;
    }

    setSuccess({ bookingCode: data.bookingCode, telegramText: data.telegramText });
    const analyticsWindow = window as Window & { dataLayer?: Array<Record<string, unknown>> };
    analyticsWindow.dataLayer?.push({ event: "booking_request_created", booking_code: data.bookingCode, product_code: productCode });
  };

  if (success) {
    const telegramLink = `${telegram.split("?text=")[0]}?text=${encodeURIComponent(success.telegramText)}`;
    return (
      <SiteFrame>
        <section className="booking-success">
          <p className="eyebrow"><span /> Заявку створено</p>
          <h1>{success.bookingCode}</h1>
          <p>Ми отримали ваш запит. Дата буде остаточно зафіксована після підтвердження менеджером і передплати 200 грн — вона входить у загальну суму.</p>
          <div className="booking-success-actions">
            <a className="button button-gold" href={telegramLink} target="_blank" rel="noreferrer">Надіслати номер у Telegram <ArrowIcon /></a>
            <Link className="button button-outline" href="/">На головну</Link>
          </div>
        </section>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame>
      <section className="booking-hero">
        <div>
          <p className="eyebrow"><span /> Онлайн-запис VAcleaner</p>
          <h1>Бронювання<br /><em>за 2 хвилини.</em></h1>
        </div>
        <p>Оберіть техніку й дату — одразу покажемо доступність та повну вартість. Передплата лише після підтвердження менеджером.</p>
      </section>

      <form className="booking-form" onSubmit={submit}>
        <nav className="booking-progress" aria-label="Етапи бронювання">
          <button type="button" className={productCode ? "is-complete" : "is-current"} onClick={() => scrollToStep("booking-products")}><span>1</span><b>Техніка</b></button>
          <button type="button" className={dateReady ? "is-complete" : productCode ? "is-current" : ""} onClick={() => scrollToStep("booking-dates")}><span>2</span><b>Дата</b></button>
          <button type="button" className={dateReady && fulfillmentReady ? "is-complete" : dateReady ? "is-current" : ""} onClick={() => scrollToStep("booking-extras")}><span>3</span><b>Отримання</b></button>
          <button type="button" className={contactReady ? "is-complete" : dateReady ? "is-current" : ""} onClick={() => scrollToStep("booking-contact")}><span>4</span><b>Контакти</b></button>
        </nav>

        <section className="booking-step" id="booking-products">
          <div className="booking-step-heading"><span>01</span><div><h2>Що бронюємо</h2><p>Jimmy окремо не видається — обирайте комплект із Puzzi.</p></div></div>
          <div className="booking-products">
            {products.map((item) => (
              <button
                className={productCode === item.code ? "is-selected" : ""}
                type="button"
                key={item.code}
                onClick={() => chooseProduct(item.code)}
                aria-pressed={productCode === item.code}
              >
                {productCode === item.code && <i>Обрано</i>}
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
                <small>{item.price}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="booking-step" id="booking-dates">
          <div className="booking-step-heading"><span>02</span><div><h2>Дата й час</h2><p>Мінімальний тариф — 1 доба, навіть якщо користуєтесь менше. Від обраного вікна до такого самого вікна наступного дня — 1 доба; пізніше повернення рахується як наступна.</p></div></div>
          <div className="booking-date-grid">
            <label>Отримання<input type="date" min={minDate} max={maxDate} value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
            <label>Вікно видачі<select value={pickupWindow} onChange={(event) => setPickupWindow(event.target.value as "morning" | "evening")}><option value="morning">Ранок · 7:00–9:00</option><option value="evening">Вечір · 18:00–20:00</option></select></label>
            <label>Повернення<input type="date" min={startDate || minDate} max={maxDate} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required /></label>
            <label>Вікно повернення<select value={returnWindow} onChange={(event) => setReturnWindow(event.target.value as "morning" | "evening")}><option value="morning">Ранок · 7:00–9:00</option><option value="evening">Вечір · 18:00–20:00</option></select></label>
          </div>
          <div className={`availability-card ${availability}`} aria-live="polite">
            {availability === "idle" && <><strong>{productCode ? "Оберіть коректний період" : "Спочатку оберіть техніку"}</strong><span>{selectedRentalDays > 14 ? "Максимальний строк онлайн-бронювання — 14 діб." : productCode ? "В одну дату можна обрати лише ранок → вечір. Для іншого варіанта змініть дату повернення." : "Після вибору одразу перевіримо доступність на ці дати."}</span></>}
            {availability === "checking" && <><strong>Перевіряємо техніку…</strong><span>Це займає кілька секунд.</span></>}
            {availability === "available" && <><strong>Вільно · {estimate ? dayLabel(estimate.rentalDays) : ""}</strong><span>Техніка доступна на весь обраний період. Остаточне підтвердження — після відповіді менеджера.</span></>}
            {availability === "unavailable" && <><strong>На цей період комплект зайнятий</strong><span>Спробуйте змістити дату або обрати інше рішення.</span></>}
            {availability === "error" && <><strong>Не вдалося перевірити дату</strong><span>Оновіть сторінку або напишіть нам у Telegram.</span></>}
          </div>
        </section>

        <section className="booking-step" id="booking-extras">
          <div className="booking-step-heading"><span>03</span><div><h2>Отримання й засоби</h2><p>Самовивіз без доплати або доставка по Полтаві.</p></div></div>
          <div className="booking-choice-row">
            <button type="button" className={fulfillment === "pickup" ? "is-selected" : ""} onClick={() => setFulfillment("pickup")}><strong>Самовивіз</strong><span>вул. Європейська, 146Е · 0 грн</span></button>
            <button type="button" className={fulfillment === "delivery" ? "is-selected" : ""} onClick={() => setFulfillment("delivery")}><strong>Доставка по Полтаві</strong><span>до вас і назад · 250 грн</span></button>
          </div>
          {fulfillment === "delivery" && (
            <label className="booking-delivery-address">
              Адреса доставки
              <input type="text" autoComplete="street-address" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} minLength={8} maxLength={180} placeholder="Вулиця, будинок, квартира або під’їзд" required />
              <small>250 грн включає доставку техніки до вас і її повернення назад.</small>
            </label>
          )}
          {hasPuzzi && (
            <div className="booking-chemistry">
              <div><strong>Хімія для Puzzi · 8 порцій</strong><span>Завжди видаємо всі 8 порцій. Після повернення оплачуєте лише використані — 50 грн за порцію; невикористані повертаються разом із технікою.</span></div>
              <label className={storyMention ? "is-selected" : ""}>
                <input type="checkbox" checked={storyMention} onChange={(event) => setStoryMention(event.target.checked)} />
                <span><b>Відмічу VAcleaner у сторіс</b><small>Після відмітки 2 використані порції — безкоштовно, кожна наступна — 50 грн.</small></span>
              </label>
              <p><b>Наприклад:</b> використали 3 порції — 50 грн з відміткою або 150 грн без неї.</p>
            </div>
          )}
          <div className="booking-extras">
            <h3>Додати до замовлення</h3>
            <p>Засоби купуються окремо й залишаються у вас.</p>
            <div>
              {activeExtras.map((item) => (
                <label key={item.code} className={selectedExtras.includes(item.code) ? "is-selected" : ""}>
                  <input type="checkbox" checked={selectedExtras.includes(item.code)} onChange={() => toggleExtra(item.code)} />
                  <span><b>{item.label}</b><small>{item.detail}</small></span><strong>+{item.price} грн</strong>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="booking-step" id="booking-contact">
          <div className="booking-step-heading"><span>04</span><div><h2>Контактні дані</h2><p>Щоб менеджер підтвердив комплект і точну суму.</p></div></div>
          <div className="booking-contact-grid">
            <label>ПІБ<input type="text" autoComplete="name" placeholder="Прізвище, ім’я, по батькові" value={customerName} onChange={(event) => setCustomerName(event.target.value)} minLength={5} maxLength={80} required /></label>
            <label>Телефон<input type="tel" autoComplete="tel" placeholder="095 391 95 69" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} required /></label>
            <label>Telegram <small>необов’язково</small><input type="text" placeholder="@username" value={customerTelegram} onChange={(event) => setCustomerTelegram(event.target.value)} maxLength={80} /></label>
            <label className="booking-comment">Коментар <small>необов’язково</small><textarea value={customerComment} onChange={(event) => setCustomerComment(event.target.value)} maxLength={800} placeholder="Що плануєте чистити або яку хімію підібрати" /></label>
          </div>
          <div className="booking-conditions">
            <h3>Що потрібно для оформлення</h3>
            <ul>
              <li>Передплата 200 грн після підтвердження заявки — входить у суму оренди.</li>
              <li>Фото паспорта або водійського посвідчення для договору надсилається менеджеру приватно.</li>
              <li>Залоговий платіж вноситься під час передачі; сума залежить від кількості техніки.</li>
            </ul>
          </div>
          <label className="booking-consent"><input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required /><span>Погоджуюсь на обробку контактних даних для цієї заявки та приймаю <a href="/umovy" target="_blank">умови бронювання</a>.</span></label>
        </section>

        <aside className="booking-summary">
          <div className="booking-summary-product"><span>Ваш вибір</span><strong>{selectedProduct?.label || "Ще не обрано"}</strong></div>
          <div><span>{estimate ? `Оренда · ${dayLabel(estimate.rentalDays)}` : "Оренда"}</span><strong>{estimate ? `${money(estimate.baseAmount)} грн` : "—"}</strong></div>
          <div><span>Додатково</span><strong>{estimate ? `${money(estimate.extrasAmount)} грн` : "—"}</strong></div>
          {hasPuzzi && <div><span>Хімія для Puzzi</span><strong>за фактом використання</strong></div>}
          <div><span>{fulfillment === "delivery" ? "Доставка" : "Самовивіз"}</span><strong>{estimate ? `${money(estimate.deliveryAmount)} грн` : "—"}</strong></div>
          <div className="booking-summary-total"><span>Орієнтовно</span><strong>{estimate ? `${money(estimate.totalAmount)} грн` : "—"}</strong></div>
          <p>Передплата 200 грн входить у цю суму. Вона вноситься лише після підтвердження заявки.</p>
          {formError && <div className="booking-error" role="alert">{formError}</div>}
          <button className="button button-gold" type="submit" disabled={submitting || availability !== "available" || !privacyAccepted}>
            {submitting ? "Створюємо заявку…" : "Надіслати заявку"} <ArrowIcon />
          </button>
        </aside>

        <div className="booking-mobile-summary">
          <div><span>{estimate ? `Разом · ${dayLabel(estimate.rentalDays)}` : "Орієнтовно"}</span><strong>{estimate ? `${money(estimate.totalAmount)} грн` : "—"}</strong></div>
          <button
            className="button button-gold"
            type={contactReady && dateReady ? "submit" : "button"}
            disabled={submitting}
            onClick={() => mobileAction.target && scrollToStep(mobileAction.target)}
          >
            {submitting ? "Створюємо…" : mobileAction.label} <ArrowIcon />
          </button>
        </div>
      </form>
    </SiteFrame>
  );
}
