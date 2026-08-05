"use client";

import type { Session } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";

type BookingStatus = "pending" | "waiting_payment" | "confirmed" | "issued" | "declined" | "cancelled" | "completed";
type WindowCode = "morning" | "evening";

type Booking = {
  id: string;
  booking_code: string;
  product_code: string;
  product_label: string;
  start_date: string;
  return_date: string;
  pickup_window: WindowCode;
  return_window: WindowCode;
  rental_days: number;
  fulfillment: "pickup" | "delivery";
  fulfillment_address: string | null;
  customer_name: string;
  customer_phone: string;
  customer_telegram: string | null;
  customer_comment: string | null;
  total_amount: number;
  prepayment_amount: number;
  prepayment_paid: boolean;
  deposit_amount: number;
  deposit_paid: boolean;
  status: BookingStatus;
  source: string;
  hold_expires_at: string | null;
  created_at: string;
  admin_note: string | null;
  confirmation_text: string;
};

type CalendarDay = {
  date: string;
  resources: Record<string, { morning: number; evening: number; capacity: number; label: string }>;
};

type BookingForm = {
  source: string;
  productCode: string;
  startDate: string;
  returnDate: string;
  pickupWindow: WindowCode;
  returnWindow: WindowCode;
  customerName: string;
  customerPhone: string;
  customerTelegram: string;
  customerComment: string;
  fulfillment: "pickup" | "delivery";
  deliveryAddress: string;
  prepaymentPaid: boolean;
  depositAmount: string;
  depositPaid: boolean;
  adminNote: string;
};

const products = [
  ["puzzi", "Kärcher Puzzi"],
  ["puzzi_jimmy", "Puzzi + Jimmy"],
  ["sc2", "Kärcher SC 2"],
  ["abir", "Робот ABIR"],
  ["combo", "Комбо · Puzzi + SC 2"],
  ["general", "Генеральне"],
  ["ideal_windows", "Ідеальні вікна"],
  ["elite", "HOME RESET"],
] as const;

const statusLabels: Record<BookingStatus, string> = {
  pending: "Нова",
  waiting_payment: "Очікує передплату",
  confirmed: "Підтверджена",
  issued: "Видана",
  declined: "Відхилена",
  cancelled: "Скасована",
  completed: "Повернена",
};

const sourceLabels: Record<string, string> = {
  instagram: "Instagram",
  phone: "Телефон",
  website: "Сайт",
  vacleaner_website: "Сайт",
  other: "Інше",
};

const resourceLabels: Record<string, string> = { puzzi: "Puzzi", sc2: "SC 2", jimmy: "Jimmy", abir: "ABIR" };
const windowLabel = (value: WindowCode) => value === "morning" ? "7:00–9:00" : "18:00–20:00";
const money = (value: number) => new Intl.NumberFormat("uk-UA").format(value);
const inputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};
const displayDate = (value: string) => new Intl.DateTimeFormat("uk-UA", { weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));

const blankForm = (): BookingForm => {
  const start = addDays(new Date(), 1);
  return {
    source: "instagram",
    productCode: "puzzi",
    startDate: inputDate(start),
    returnDate: inputDate(addDays(start, 1)),
    pickupWindow: "morning",
    returnWindow: "morning",
    customerName: "",
    customerPhone: "",
    customerTelegram: "",
    customerComment: "",
    fulfillment: "pickup",
    deliveryAddress: "",
    prepaymentPaid: false,
    depositAmount: "0",
    depositPaid: false,
    adminNote: "",
  };
};

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function BookingAdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("vahome.aroma@gmail.com");
  const [loginSent, setLoginSent] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<"calendar" | "bookings">("calendar");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState<BookingForm>(blankForm);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  const invoke = useCallback(async (activeSession: Session, body: Record<string, unknown>) => {
    return supabase.functions.invoke("vacleaner-admin-bookings", {
      headers: { Authorization: `Bearer ${activeSession.access_token}` },
      body,
    });
  }, []);

  const load = useCallback(async (activeSession: Session, status: "all" | BookingStatus = "all") => {
    setLoading(true);
    setNotice("");
    const [{ data: listData, error: listError }, { data: calendarData, error: calendarError }] = await Promise.all([
      invoke(activeSession, { action: "list", status: status === "all" ? "" : status }),
      invoke(activeSession, { action: "calendar", from: inputDate(new Date()), days: 14 }),
    ]);
    setLoading(false);
    if (listError || calendarError || !listData?.bookings || !calendarData?.days) {
      setNotice("Не вдалося оновити дані. Перевірте з’єднання й спробуйте ще раз.");
      return;
    }
    setBookings(listData.bookings as Booking[]);
    setCalendar(calendarData.days as CalendarDay[]);
  }, [invoke]);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
      if (data.session) load(data.session, "all");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) window.setTimeout(() => load(nextSession, "all"), 0);
    });
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      listener.subscription.unsubscribe();
    };
  }, [load]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: `${window.location.origin}/admin/bronuvannia` } });
    if (error) setLoginError("Не вдалося надіслати посилання для входу.");
    else setLoginSent(true);
  };

  const changeFilter = (next: "all" | BookingStatus) => {
    setFilter(next);
    if (session) load(session, next);
  };

  const updateStatus = async (booking: Booking, status: BookingStatus) => {
    if (!session) return;
    setActionId(booking.id);
    const { data, error } = await invoke(session, { action: "update", bookingId: booking.id, status, adminNote: booking.admin_note || "" });
    setActionId("");
    if (error || !data?.booking) {
      setNotice(data?.error === "inventory_conflict" ? "На цей період уже не вистачає вільної техніки." : "Не вдалося змінити статус.");
      return;
    }
    setNotice(`${booking.booking_code}: ${statusLabels[status].toLowerCase()}.`);
    await load(session, filter);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm());
    setFormOpen(true);
  };

  const openEdit = (booking: Booking) => {
    setEditing(booking);
    setForm({
      source: booking.source === "vacleaner_website" ? "website" : booking.source,
      productCode: booking.product_code,
      startDate: booking.start_date,
      returnDate: booking.return_date,
      pickupWindow: booking.pickup_window,
      returnWindow: booking.return_window,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      customerTelegram: booking.customer_telegram || "",
      customerComment: booking.customer_comment || "",
      fulfillment: booking.fulfillment,
      deliveryAddress: booking.fulfillment === "delivery" ? booking.fulfillment_address || "" : "",
      prepaymentPaid: booking.prepayment_paid,
      depositAmount: String(booking.deposit_amount || 0),
      depositPaid: booking.deposit_paid,
      adminNote: booking.admin_note || "",
    });
    setFormOpen(true);
  };

  const saveBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) return;
    setActionId(editing?.id || "create");
    setNotice("");
    const payload = {
      ...form,
      action: editing ? "edit" : "create",
      bookingId: editing?.id,
      depositAmount: Number(form.depositAmount) || 0,
    };
    const { data, error } = await invoke(session, payload);
    setActionId("");
    if (error || !data?.booking) {
      const code = data?.error;
      setNotice(code === "inventory_conflict" ? "На цей період техніка вже зайнята." : code === "invalid_rental_period" ? "Перевірте дату й вікна видачі та повернення." : "Не вдалося зберегти бронювання. Перевірте ПІБ і телефон.");
      return;
    }
    setFormOpen(false);
    setNotice(editing ? "Зміни збережено." : "Бронювання додано. Без передплати дата зарезервована на 2 години.");
    await load(session, filter);
  };

  const copyText = async (booking: Booking) => {
    await navigator.clipboard.writeText(booking.confirmation_text);
    setNotice(`Текст ${booking.booking_code} скопійовано.`);
  };

  const installApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }
    setNotice("На iPhone: відкрийте «Поділитися» → «На початковий екран». На Android: меню браузера → «Встановити застосунок».");
  };

  const activeCount = useMemo(() => bookings.filter((booking) => ["waiting_payment", "confirmed", "issued"].includes(booking.status)).length, [bookings]);

  if (!authReady) return <main className="admin-pwa admin-auth"><p>Перевіряємо доступ…</p></main>;

  if (!session) {
    return (
      <main className="admin-pwa admin-auth">
        <div className="admin-auth-brand"><span>VA</span><div><strong>CLEANER</strong><small>MANAGER</small></div></div>
        <p className="eyebrow"><span /> Закрита адмінка</p>
        <h1>Усі бронювання<br />в одному місці.</h1>
        {loginSent ? (
          <div className="admin-auth-note"><strong>Посилання надіслано</strong><p>Відкрийте лист на {email} і натисніть кнопку входу.</p></div>
        ) : (
          <form onSubmit={login}>
            <label>Email адміністратора<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            {loginError && <p className="booking-error">{loginError}</p>}
            <button className="button button-gold" type="submit">Отримати посилання для входу</button>
          </form>
        )}
      </main>
    );
  }

  return (
    <main className="admin-pwa">
      <header className="admin-pwa-header">
        <div className="admin-pwa-brand"><span>VA</span><div><strong>VAcleaner</strong><small>Календар оренди</small></div></div>
        <div className="admin-pwa-header-actions">
          <button type="button" onClick={installApp}>Встановити</button>
          <button type="button" onClick={() => supabase.auth.signOut()}>Вийти</button>
        </div>
      </header>

      <section className="admin-pwa-shell">
        <div className="admin-pwa-topline">
          <div><p>Сьогодні</p><h1>{new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" }).format(new Date())}</h1><span>{activeCount} активних бронювань</span></div>
          <button className="admin-create-button" type="button" onClick={openCreate}><b>+</b> Додати бронювання</button>
        </div>

        <nav className="admin-pwa-tabs" aria-label="Розділи адмінки">
          <button className={panel === "calendar" ? "is-active" : ""} type="button" onClick={() => setPanel("calendar")}>Календар</button>
          <button className={panel === "bookings" ? "is-active" : ""} type="button" onClick={() => setPanel("bookings")}>Заявки</button>
        </nav>

        {notice && <div className="admin-pwa-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")}>×</button></div>}

        {panel === "calendar" && (
          <section className="admin-calendar-section">
            <div className="admin-section-heading"><div><h2>Вільна техніка</h2><p>Ранок / вечір · показано, скільки одиниць доступно</p></div><button type="button" disabled={loading} onClick={() => load(session, filter)}>Оновити</button></div>
            <div className="admin-calendar-strip">
              {calendar.map((day) => (
                <article className="admin-day-card" key={day.date}>
                  <header><strong>{displayDate(day.date)}</strong><span>{day.date}</span></header>
                  <div className="admin-day-times"><span>Ранок</span><span>Вечір</span></div>
                  {Object.entries(day.resources).map(([code, item]) => (
                    <div className="admin-resource-row" key={code}>
                      <b>{resourceLabels[code] || item.label}</b>
                      <span className={item.morning === 0 ? "is-zero" : ""}>{item.morning}/{item.capacity}</span>
                      <span className={item.evening === 0 ? "is-zero" : ""}>{item.evening}/{item.capacity}</span>
                    </div>
                  ))}
                </article>
              ))}
            </div>
            <div className="admin-today-bookings">
              <div className="admin-section-heading"><div><h2>Найближчі бронювання</h2><p>Очікування передплати, підтверджені та видані</p></div><button type="button" onClick={() => setPanel("bookings")}>Усі заявки</button></div>
              <BookingList bookings={bookings.filter((booking) => ["waiting_payment", "confirmed", "issued"].includes(booking.status)).slice(0, 6)} actionId={actionId} onStatus={updateStatus} onEdit={openEdit} onCopy={copyText} />
            </div>
          </section>
        )}

        {panel === "bookings" && (
          <section className="admin-bookings-section">
            <div className="admin-filters">
              {(["all", "pending", "waiting_payment", "confirmed", "issued", "completed", "cancelled"] as const).map((item) => (
                <button type="button" className={filter === item ? "is-active" : ""} key={item} onClick={() => changeFilter(item)}>{item === "all" ? "Усі" : statusLabels[item]}</button>
              ))}
            </div>
            {loading ? <p className="admin-empty">Оновлюємо…</p> : <BookingList bookings={bookings} actionId={actionId} onStatus={updateStatus} onEdit={openEdit} onCopy={copyText} />}
          </section>
        )}
      </section>

      {formOpen && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label={editing ? "Редагувати бронювання" : "Додати бронювання"}>
          <button className="admin-modal-backdrop" type="button" aria-label="Закрити" onClick={() => setFormOpen(false)} />
          <form className="admin-booking-form" onSubmit={saveBooking}>
            <header><div><small>{editing ? editing.booking_code : "Нове бронювання"}</small><h2>{editing ? "Редагувати" : "Додати з Instagram"}</h2></div><button type="button" onClick={() => setFormOpen(false)}>×</button></header>
            <div className="admin-form-grid">
              <label>Джерело<select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}><option value="instagram">Instagram</option><option value="phone">Телефон</option><option value="website">Сайт</option><option value="other">Інше</option></select></label>
              <label>Комплект<select value={form.productCode} onChange={(event) => setForm({ ...form, productCode: event.target.value })}>{products.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
              <label>Отримання<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></label>
              <label>Вікно видачі<select value={form.pickupWindow} onChange={(event) => setForm({ ...form, pickupWindow: event.target.value as WindowCode })}><option value="morning">Ранок · 7:00–9:00</option><option value="evening">Вечір · 18:00–20:00</option></select></label>
              <label>Повернення<input type="date" min={form.startDate} value={form.returnDate} onChange={(event) => setForm({ ...form, returnDate: event.target.value })} required /></label>
              <label>Вікно повернення<select value={form.returnWindow} onChange={(event) => setForm({ ...form, returnWindow: event.target.value as WindowCode })}><option value="morning">Ранок · 7:00–9:00</option><option value="evening">Вечір · 18:00–20:00</option></select></label>
              <label>ПІБ<input type="text" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} placeholder="Прізвище, ім’я, по батькові" minLength={5} required /></label>
              <label>Телефон<input type="tel" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} placeholder="095 391 95 69" required /></label>
              <label>Telegram <small>необов’язково</small><input type="text" value={form.customerTelegram} onChange={(event) => setForm({ ...form, customerTelegram: event.target.value })} placeholder="@username" /></label>
              <label>Отримання техніки<select value={form.fulfillment} onChange={(event) => setForm({ ...form, fulfillment: event.target.value as "pickup" | "delivery" })}><option value="pickup">Самовивіз · 0 грн</option><option value="delivery">Доставка · 250 грн</option></select></label>
              {form.fulfillment === "delivery" && <label className="admin-form-wide">Адреса доставки<input type="text" value={form.deliveryAddress} onChange={(event) => setForm({ ...form, deliveryAddress: event.target.value })} placeholder="Вулиця, будинок, квартира" minLength={8} required /></label>}
              <label>Залог, грн<input type="number" min="0" step="100" value={form.depositAmount} onChange={(event) => setForm({ ...form, depositAmount: event.target.value })} /></label>
              <label className="admin-form-check"><input type="checkbox" checked={form.depositPaid} onChange={(event) => setForm({ ...form, depositPaid: event.target.checked })} /><span>Залог внесено</span></label>
              {!editing && <label className="admin-form-check admin-form-wide"><input type="checkbox" checked={form.prepaymentPaid} onChange={(event) => setForm({ ...form, prepaymentPaid: event.target.checked })} /><span><b>Передплата 200 грн уже внесена</b><small>Якщо ні — техніка тимчасово блокується на 2 години.</small></span></label>}
              <label className="admin-form-wide">Коментар клієнта<textarea value={form.customerComment} onChange={(event) => setForm({ ...form, customerComment: event.target.value })} placeholder="Що планує чистити, особливі побажання" /></label>
              <label className="admin-form-wide">Внутрішня примітка<textarea value={form.adminNote} onChange={(event) => setForm({ ...form, adminNote: event.target.value })} placeholder="Не відправляється клієнту" /></label>
            </div>
            <footer><button className="admin-secondary-button" type="button" onClick={() => setFormOpen(false)}>Скасувати</button><button className="admin-create-button" type="submit" disabled={actionId === "create" || actionId === editing?.id}>{actionId ? "Зберігаємо…" : editing ? "Зберегти зміни" : "Додати бронювання"}</button></footer>
          </form>
        </div>
      )}
    </main>
  );
}

function BookingList({
  bookings,
  actionId,
  onStatus,
  onEdit,
  onCopy,
}: {
  bookings: Booking[];
  actionId: string;
  onStatus: (booking: Booking, status: BookingStatus) => void;
  onEdit: (booking: Booking) => void;
  onCopy: (booking: Booking) => void;
}) {
  if (bookings.length === 0) return <p className="admin-empty">У цьому розділі поки немає бронювань.</p>;
  return (
    <div className="admin-booking-list">
      {bookings.map((booking) => (
        <article className="admin-booking-card" key={booking.id}>
          <header><div><span>{booking.booking_code} · {sourceLabels[booking.source] || booking.source}</span><h2>{booking.product_label}</h2></div><b className={`status-${booking.status}`}>{statusLabels[booking.status]}</b></header>
          <div className="admin-booking-meta">
            <p><small>Період</small><strong>{booking.start_date} · {windowLabel(booking.pickup_window)} → {booking.return_date} · {windowLabel(booking.return_window)}</strong><span>{booking.rental_days} доб.</span></p>
            <p><small>Отримання</small><strong>{booking.fulfillment === "delivery" ? "Доставка · 250 грн" : "Самовивіз"}</strong><span>{booking.fulfillment_address || "вул. Європейська, 146Е"}</span></p>
            <p><small>Клієнт</small><strong>{booking.customer_name}</strong><a href={`tel:${booking.customer_phone}`}>{booking.customer_phone}</a></p>
            <p><small>Оплата</small><strong>{money(booking.total_amount)} грн</strong><span>{booking.prepayment_paid ? "передплата внесена" : "передплата очікується"}{booking.deposit_amount ? ` · залог ${money(booking.deposit_amount)} грн${booking.deposit_paid ? " ✓" : ""}` : ""}</span></p>
          </div>
          {booking.hold_expires_at && booking.status === "waiting_payment" && <p className="admin-hold">Тимчасова бронь до {new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit" }).format(new Date(booking.hold_expires_at))}</p>}
          {booking.customer_comment && <p className="admin-detail"><strong>Коментар:</strong> {booking.customer_comment}</p>}
          {booking.admin_note && <p className="admin-detail"><strong>Примітка:</strong> {booking.admin_note}</p>}
          <div className="admin-booking-actions">
            <button type="button" onClick={() => onCopy(booking)}>Копіювати текст</button>
            <button type="button" onClick={() => onEdit(booking)}>Редагувати</button>
            {booking.status === "pending" && <button type="button" disabled={actionId === booking.id} onClick={() => onStatus(booking, "waiting_payment")}>Тримати 2 год</button>}
            {booking.status === "pending" && <button type="button" disabled={actionId === booking.id} onClick={() => onStatus(booking, "confirmed")}>Підтвердити</button>}
            {booking.status === "waiting_payment" && <button type="button" disabled={actionId === booking.id} onClick={() => onStatus(booking, "confirmed")}>Передплата внесена</button>}
            {booking.status === "confirmed" && <button type="button" disabled={actionId === booking.id} onClick={() => onStatus(booking, "issued")}>Техніку видано</button>}
            {booking.status === "issued" && <button type="button" disabled={actionId === booking.id} onClick={() => onStatus(booking, "completed")}>Повернено</button>}
            {["pending", "waiting_payment", "confirmed", "issued"].includes(booking.status) && <button className="danger" type="button" disabled={actionId === booking.id} onClick={() => onStatus(booking, "cancelled")}>Скасувати</button>}
          </div>
        </article>
      ))}
    </div>
  );
}
