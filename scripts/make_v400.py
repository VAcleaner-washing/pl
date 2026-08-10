from pathlib import Path
from bs4 import BeautifulSoup, Tag
import json, re, html

ROOT=Path('/mnt/data/vacleaner_400_work')
BUILD='4000'
VERSION='4.0.0'
TODAY='2026-08-09'

# ---------- release ----------
rel={"version":VERSION,"build":4000,"releasedAt":TODAY,"label":"VAcleaner v4.0.0 — STRUCTURE & TRUST"}
(ROOT/'release.json').write_text(json.dumps(rel,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')
pkg=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
pkg['version']=VERSION
(ROOT/'package.json').write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')

# ---------- shared HTML ----------
arrow='<svg aria-hidden="true" class="icon-arrow" focusable="false" viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6"></path></svg>'

def header_html():
    return f'''<header class="site-header"><a aria-label="VAcleaner — на головну" class="brand" href="/"><span class="brand-mark">VA</span><span class="brand-copy"><strong>CLEANER</strong><small>POLTAVA</small></span></a><nav aria-label="Головна навігація" class="desktop-nav"><a href="/rishennia/">Що почистити</a><a href="/komplekty/">Комплекти</a><a href="/yak-tse-pratsiuie/">Як це працює</a><a href="/vidhuky/">Відгуки</a><a href="/pidbir/">Підбір</a></nav><a class="header-cta" href="/bronuvannia/">Забронювати онлайн {arrow}</a><button aria-expanded="false" aria-label="Відкрити меню" class="menu-button" type="button"><span></span><span></span></button></header>'''

def mobile_menu_html():
    return f'''<div class="mobile-menu"><nav aria-label="Мобільна навігація"><a href="/rishennia/">Що почистити</a><a href="/komplekty/">Комплекти</a><a href="/yak-tse-pratsiuie/">Як це працює</a><a href="/vidhuky/">Відгуки</a><a href="/pidbir/">Підбір</a><a href="/kontakty/">Контакти</a></nav><div class="mobile-menu-actions"><a class="button button-gold" href="/bronuvannia/">Забронювати онлайн {arrow}</a><a class="button button-outline" href="https://www.instagram.com/vacleaner_washing.pl/" rel="noreferrer" target="_blank">Instagram {arrow}</a></div></div>'''

def footer_html():
    return '''<footer class="v4-footer"><div class="footer-main v4-footer-grid"><div class="v4-footer-brand"><a class="brand footer-brand" href="/"><span class="brand-mark">VA</span><span class="brand-copy"><strong>CLEANER</strong><small>POLTAVA</small></span></a><p>Сервіс самостійного глибокого прибирання в Полтаві.</p></div><div><strong>Підібрати</strong><a href="/pidbir/">Підбір рішення</a><a href="/rishennia/">Що почистити</a><a href="/komplekty/">Комплекти</a><a href="/bronuvannia/">Бронювання</a></div><div><strong>Довіра</strong><a href="/yak-tse-pratsiuie/">Як це працює</a><a href="/vidhuky/">Відгуки</a><a href="/pro-nas/">Про VAcleaner</a><a href="/blog/">Поради</a></div><div><strong>Сервіс</strong><a href="/dostavka/">Доставка й оплата</a><a href="/faq/">FAQ</a><a href="/umovy/">Умови оренди</a><a href="/kontakty/">Контакти</a><a href="/polityka-konfidenciynosti/">Конфіденційність</a></div><div class="v4-footer-ecosystem"><strong>VA ecosystem</strong><a href="https://vahome.com.ua/" rel="noreferrer" target="_blank">VA HOME</a><small>Простір чистий — тепер атмосфера.</small></div></div><div class="footer-bottom"><span>© 2026 VAcleaner</span><span>Полтава · +38 (095) 391 95 69</span></div></footer>'''

def mobile_booking_html():
    return f'''<div class="mobile-booking"><a href="/bronuvannia/">Забронювати онлайн {arrow}</a><a aria-label="Відкрити Instagram VAcleaner" href="https://www.instagram.com/vacleaner_washing.pl/" rel="noreferrer" target="_blank">Instagram {arrow}</a></div>'''

LOCAL_BUSINESS={
 "@type":"LocalBusiness","@id":"https://vacleaner.pp.ua/#business","name":"VAcleaner","url":"https://vacleaner.pp.ua/",
 "image":"https://vacleaner.pp.ua/assets/og-home.png","logo":"https://vacleaner.pp.ua/apple-touch-icon.png","telephone":"+380953919569",
 "priceRange":"500–3500 UAH","currenciesAccepted":"UAH",
 "address":{"@type":"PostalAddress","addressLocality":"Полтава","addressRegion":"Полтавська область","addressCountry":"UA"},
 "areaServed":{"@type":"City","name":"Полтава"},
 "openingHoursSpecification":{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"opens":"09:00","closes":"19:00"},
 "sameAs":["https://www.instagram.com/vacleaner_washing.pl/"]
}

def ld(graph):
    return '<script type="application/ld+json">'+json.dumps({"@context":"https://schema.org","@graph":[LOCAL_BUSINESS,*graph]},ensure_ascii=False,separators=(',',':'))+'</script>'

def page_doc(title, desc, canonical, body, graph=None, og_image='/assets/og-home.png'):
    graph=graph or []
    return f'''<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}"><link rel="canonical" href="https://vacleaner.pp.ua{canonical}"><meta property="og:title" content="{html.escape(title)}"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="https://vacleaner.pp.ua{canonical}"><meta property="og:locale" content="uk_UA"><meta property="og:type" content="website"><meta property="og:image" content="https://vacleaner.pp.ua{og_image}"><meta name="twitter:card" content="summary_large_image"><link rel="shortcut icon" href="/favicon.ico?v={BUILD}"><link rel="icon" href="/favicon.svg?v={BUILD}" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v={BUILD}"><link rel="stylesheet" href="/_next/static/chunks/0-rnytzezgu81.css"><link rel="stylesheet" href="/assets/public-fixes.css?v={BUILD}"><link rel="stylesheet" href="/assets/mobile-home-fix.css?v={BUILD}"><link rel="stylesheet" href="/assets/public-experience.css?v={BUILD}"><link rel="stylesheet" href="/assets/site-v400.css?v={BUILD}"><script id="vac-gtm-bootstrap">(function(w,d,s,l,i){{if(w.__VAC_GTM_LOADED__)return;w.__VAC_GTM_LOADED__=true;w[l]=w[l]||[];w[l].push({{'gtm.start':new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);}})(window,document,'script','dataLayer','GTM-KC8FF7FB');</script>{ld(graph)}</head><body class="geist_a71539c9-module__T19VSG__variable antialiased"><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KC8FF7FB" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript><main>{header_html()}{mobile_menu_html()}{body}{footer_html()}{mobile_booking_html()}</main><script defer src="/assets/site-v400.js?v={BUILD}"></script></body></html>'''

def write_page(path, title, desc, body, graph=None, og_image='/assets/og-home.png'):
    d=ROOT/path
    d.mkdir(parents=True,exist_ok=True)
    canonical='/' + str(path).strip('/') + '/'
    (d/'index.html').write_text(page_doc(title,desc,canonical,body,graph,og_image),encoding='utf-8')

# ---------- new pages ----------
about_body='''
<section class="inner-hero v4-inner-hero"><p class="eyebrow"><span></span> Про VAcleaner</p><h1>Не просто техніка.<br><em>Людина поруч із процесом.</em></h1><p>VAcleaner — локальний сервіс у Полтаві: підбір під задачу, підготовлена техніка, зрозумілий інструктаж і підтримка під час прибирання.</p></section>
<section class="v4-story"><div><p class="v4-kicker">ANNA · FOUNDER</p><h2>Сервіс, де не потрібно розбиратися в техніці заздалегідь.</h2><p>Замість «ось апарат — далі самі» ми починаємо з вашої задачі: що саме потрібно очистити, який матеріал, які плями або запахи. Після цього підбираємо техніку й засоби без зайвих позицій.</p><p>Менеджер показує запуск і послідовність роботи, а якщо питання виникає вже вдома — залишається на зв’язку.</p></div><aside class="v4-principles"><article><span>01</span><strong>Підбір без переплати</strong><p>Радимо те, що реально впливає на результат.</p></article><article><span>02</span><strong>Підготовлена техніка</strong><p>Після повернення очищаємо, перевіряємо й комплектуємо заново.</p></article><article><span>03</span><strong>Інструктаж людською мовою</strong><p>Без довгих мануалів і технічного жаргону.</p></article></aside></section>
<section class="v4-bridge"><div><p class="v4-kicker">Не знаєте, з чого почати?</p><h2>Опишіть задачу — Smart Guide збере рішення.</h2></div><a class="button button-gold" href="/pidbir/">Підібрати рішення →</a></section>'''
write_page(Path('pro-nas'),'Про VAcleaner — сервіс самостійного прибирання у Полтаві','Хто стоїть за VAcleaner: підбір техніки під задачу, підготовка, інструктаж і підтримка менеджера під час оренди.',about_body,[{"@type":"AboutPage","name":"Про VAcleaner","url":"https://vacleaner.pp.ua/pro-nas/","mainEntity":{"@id":"https://vacleaner.pp.ua/#business"}}])

delivery_body='''
<section class="inner-hero v4-inner-hero"><p class="eyebrow"><span></span> Доставка й оплата</p><h1>Отримання без<br><em>зайвої невизначеності.</em></h1><p>Самовивіз у Полтаві або доставка по місту. Точні умови бачите до підтвердження бронювання.</p></section>
<section class="v4-service-grid"><article><span>01</span><h2>Самовивіз · 0 грн</h2><p>Самовивіз у Полтаві. Точне місце отримання менеджер повідомить під час опрацювання заявки.</p></article><article><span>02</span><h2>Доставка · 250 грн</h2><p>У межах Полтави. У вартість входить доставка техніки до вас і її повернення назад. У заявці вказується актуальна адреса доставки.</p></article><article><span>03</span><h2>Передплата · 200 грн</h2><p>Вноситься після підтвердження заявки менеджером, закріплює дату та входить у фінальний взаєморозрахунок.</p></article><article><span>04</span><h2>Залоговий платіж</h2><p>Сума залежить від техніки та періоду оренди. Сплачується під час отримання; фактично отриману суму менеджер фіксує при видачі.</p></article></section>
<section class="v4-note"><strong>Важливо</strong><p>Конкретний час, місце самовивозу, склад комплекту й фінальну суму менеджер підтверджує під час опрацювання заявки.</p><a href="/umovy/">Переглянути правила оренди →</a></section>
<section class="v4-bridge"><div><p class="v4-kicker">Готові перевірити дату?</p><h2>Оберіть техніку й період онлайн.</h2></div><a class="button button-gold" href="/bronuvannia/">До бронювання →</a></section>'''
write_page(Path('dostavka'),'Доставка й оплата VAcleaner — Полтава','Самовивіз у Полтаві, доставка по місту, передплата 200 грн і правила залогового платежу для оренди техніки VAcleaner.',delivery_body,[{"@type":"WebPage","name":"Доставка й оплата VAcleaner","url":"https://vacleaner.pp.ua/dostavka/"}])

privacy_body='''
<section class="inner-hero v4-inner-hero"><p class="eyebrow"><span></span> Конфіденційність</p><h1>Як VAcleaner<br><em>працює з даними.</em></h1><p>Коротко й людською мовою: які дані потрібні для заявки та оренди, навіщо вони використовуються і як звернутися щодо своїх даних.</p></section>
<section class="v4-legal"><article><h2>1. Хто обробляє дані</h2><p>Володілець персональних даних — ФОП Невідома Анна Сергіївна, сервіс VAcleaner, Полтава. Контакт для звернень: +38 (095) 391 95 69 та офіційний Instagram VAcleaner.</p></article><article><h2>2. Що ми можемо отримувати</h2><p>ПІБ, номер телефону, Telegram за бажанням, адресу доставки, параметри бронювання, коментар до задачі, історію оренд і платежів. Для оформлення договору новий клієнт може приватно надати фото паспорта або водійського посвідчення.</p></article><article><h2>3. Для чого це потрібно</h2><p>Щоб опрацювати заявку, перевірити доступність, укласти й виконати договір оренди, організувати видачу/доставку, провести взаєморозрахунок, підтримувати клієнта та захищати права сторін.</p></article><article><h2>4. Аналітика сайту</h2><p>На сайті використовується Google Tag Manager і Google Analytics 4. Вони можуть обробляти технічну інформацію про відвідування, пристрій та взаємодію зі сторінками. Налаштування cookies можна контролювати у своєму браузері.</p></article><article><h2>5. Зберігання й доступ</h2><p>Доступ до даних мають лише уповноважені особи, яким вони потрібні для роботи сервісу. Дані зберігаються не довше, ніж це потрібно для мети обробки, договору, обліку та законного захисту прав сторін.</p></article><article><h2>6. Ваші права</h2><p>Ви можете звернутися щодо інформації про обробку, уточнення або виправлення даних, а також щодо видалення, якщо немає законної підстави для подальшого зберігання. Якщо обробка ґрунтується на згоді, її можна відкликати.</p></article><article><h2>7. Передача сервісам</h2><p>Для технічної роботи можуть використовуватися постачальники інфраструктури й аналітики, зокрема Supabase та Google. Передаємо лише те, що потрібно для відповідної функції.</p></article><article><h2>8. Оновлення політики</h2><p>Актуальна редакція цієї сторінки діє з 9 серпня 2026 року. При суттєвих змінах текст на цій сторінці буде оновлено.</p></article></section>'''
write_page(Path('polityka-konfidenciynosti'),'Політика конфіденційності VAcleaner','Політика обробки персональних даних VAcleaner: заявки, бронювання, документи для договору, аналітика сайту та права користувача.',privacy_body,[{"@type":"WebPage","name":"Політика конфіденційності VAcleaner","url":"https://vacleaner.pp.ua/polityka-konfidenciynosti/"}])

blog_body='''
<section class="inner-hero v4-inner-hero"><p class="eyebrow"><span></span> VAcleaner · Поради</p><h1>Чистий дім<br><em>без випадкових рішень.</em></h1><p>Короткі практичні гайди: плями, запахи, текстиль, матраци й техніка. Без «магічних лайфхаків» — лише зрозуміла послідовність.</p></section>
<section class="v4-blog-grid"><a href="/blog/yak-vyvesty-plyamu-z-dyvana/"><span>Текстиль · 6 хв</span><h2>Як працювати з плямою на дивані</h2><p>Що робити спочатку, чому не варто терти пляму навмання і коли потрібне глибоке промивання.</p><b>Читати →</b></a><a href="/blog/skilky-sokhne-dyvan-pislia-chyshchennia/"><span>Після чищення · 4 хв</span><h2>Скільки сохне диван після глибокого очищення</h2><p>Від чого залежить висихання і як не зіпсувати результат після Puzzi.</p><b>Читати →</b></a><a href="/blog/yak-pochystyty-matrats-pislia-dytyny/"><span>Матрац · 7 хв</span><h2>Як почистити матрац після дитини</h2><p>Окремо про пляму, запах сечі, сухий етап і правильну послідовність засобів.</p><b>Читати →</b></a></section>
<section class="v4-bridge"><div><p class="v4-kicker">Не хочете розбиратися самі?</p><h2>Smart Guide підбере техніку й засоби під вашу задачу.</h2></div><a class="button button-gold" href="/pidbir/">Пройти підбір →</a></section>'''
write_page(Path('blog'),'Поради VAcleaner — як чистити диван, матрац, кухню та вікна','Практичні гайди VAcleaner про домашнє глибоке прибирання, плями, запахи, сушіння текстилю та правильний підбір техніки.',blog_body,[{"@type":"CollectionPage","name":"Поради VAcleaner","url":"https://vacleaner.pp.ua/blog/"}])

articles=[
('yak-vyvesty-plyamu-z-dyvana','Як працювати з плямою на дивані — VAcleaner','Що робити з плямою на дивані до глибокого промивання, як не рознести забруднення і коли потрібен Carp-Deta та Puzzi.',
'''<p class="v4-lead">Пляма — це не завжди задача «потерти сильніше». Найчастіше результат залежить від того, чи не втерли забруднення глибше ще до основного очищення.</p><h2>1. Не розтирайте пляму по площі</h2><p>Якщо забруднення свіже, спочатку промокніть надлишок чистою серветкою або мікрофіброю. Рухайтесь від країв до центру.</p><h2>2. Зрозумійте, що це за пляма</h2><p>Кава, чай, напої, жир, олія, бруд і сажа потребують локального опрацювання. Для таких задач у VAcleaner використовується Carp-Deta 30 мл. Перед першим застосуванням обов’язково перевіряють стійкість барвника на непомітній ділянці.</p><h2>3. Плямовивідник — не заміна промиванню</h2><p>Після локального засобу оброблену ділянку потрібно промити чистою водою або миючим пилососом. Для диванів і крісел цю роль виконує Kärcher Puzzi.</p><h2>4. Якщо є ще й запах</h2><p>Пляма й запах — дві різні задачі. Якщо мова про запах сечі, у VAcleaner пріоритетний нейтралізатор — Neutralix; його не варто підміняти звичайним ароматизатором.</p>'''),
('skilky-sokhne-dyvan-pislia-chyshchennia','Скільки сохне диван після глибокого очищення — VAcleaner','Від чого залежить час висихання дивана після Puzzi та як допомогти тканині висохнути рівномірно без перегріву.',
'''<p class="v4-lead">Точної однакової цифри для всіх диванів немає: щільність наповнювача, тканина, кількість вологи, температура та вентиляція змінюють час висихання.</p><h2>Що найбільше впливає</h2><p>Чим краще Puzzi забирає воду з тканини після промивання, тим швидше сохне поверхня. Товсті подушки та щільний наповнювач можуть утримувати вологу довше за тонку оббивку.</p><h2>Як прискорити без ризику</h2><p>Забезпечте звичайну вентиляцію кімнати, не накривайте диван пледом і не притискайте подушки одна до одної. Не намагайтесь пересушувати тканину дуже гарячим повітрям.</p><h2>Коли диваном уже можна користуватись</h2><p>Орієнтуйтесь не лише на верхній шар: тканина та наповнювач мають бути сухими на дотик. Якщо є сумнів — дайте ще час, особливо на матрацах і товстих сидіннях.</p>'''),
('yak-pochystyty-matrats-pislia-dytyny','Як почистити матрац після дитини — пляма та запах сечі | VAcleaner','Послідовність очищення матраца після дитини: сухий етап, пляма, запах сечі, Neutralix, Carp-Deta та глибоке промивання Puzzi.',
'''<p class="v4-lead">У матраца після дитини часто дві окремі проблеми: видима пляма та запах. Якщо працювати лише з однією, результат може бути неповним.</p><h2>1. Почніть із сухого етапу</h2><p>Перед вологим очищенням приберіть пил, волосся й дрібне сухе сміття. Якщо пилу багато, особливо в матраці, окремий сухий етап помітно спрощує подальше промивання.</p><h2>2. Запах сечі — окрема задача</h2><p>У підборі VAcleaner для запаху сечі Neutralix має пріоритет №1. Його задача — нейтралізація запаху, а не маскування ароматом.</p><h2>3. Якщо лишилась видима пляма</h2><p>Тоді додається Carp-Deta для локального опрацювання. Перед застосуванням перевірте стійкість барвника на непомітній ділянці.</p><h2>4. Завершіть глибоким промиванням</h2><p>Kärcher Puzzi промиває текстиль і відбирає забруднену воду. Після очищення матрацу потрібно дати повністю висохнути з нормальною вентиляцією.</p>''')]

for slug,title,desc,content in articles:
    article_body=f'''<section class="v4-article-hero"><nav class="v4-breadcrumbs" aria-label="Хлібні крихти"><a href="/">Головна</a><span>→</span><a href="/blog/">Поради</a><span>→</span><b>{html.escape(title.split(' — ')[0])}</b></nav><p class="eyebrow"><span></span> VAcleaner · Гід</p><h1>{html.escape(title.split(' — ')[0])}</h1><p>Практична послідовність без зайвих кроків.</p></section><article class="v4-article">{content}<div class="v4-article-cta"><strong>Потрібен підбір під вашу ситуацію?</strong><p>Позначте задачу й проблему — Smart Guide запропонує техніку та засоби.</p><a class="button button-gold" href="/pidbir/">Підібрати рішення →</a></div></article>'''
    graph=[{"@type":"BlogPosting","headline":title.split(' — ')[0],"datePublished":TODAY,"dateModified":TODAY,"author":{"@type":"Organization","name":"VAcleaner"},"publisher":{"@id":"https://vacleaner.pp.ua/#business"},"mainEntityOfPage":"https://vacleaner.pp.ua/blog/"+slug+"/"},
           {"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Головна","item":"https://vacleaner.pp.ua/"},{"@type":"ListItem","position":2,"name":"Поради","item":"https://vacleaner.pp.ua/blog/"},{"@type":"ListItem","position":3,"name":title.split(' — ')[0],"item":"https://vacleaner.pp.ua/blog/"+slug+"/"}]}]
    write_page(Path('blog')/slug,title,desc,article_body,graph)

# ---------- V4 CSS ----------
css=r'''

/* VAcleaner 4.0 — structural layer only; visual language intentionally inherits the existing site. */
.v4-inner-hero{max-width:1180px;margin:0 auto;padding-left:clamp(24px,5vw,72px);padding-right:clamp(24px,5vw,72px)}
.v4-story,.v4-service-grid,.v4-legal,.v4-blog-grid,.v4-article,.v4-note,.v4-bridge{max-width:1180px;margin:0 auto}
.v4-story{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:48px;padding:80px clamp(24px,5vw,72px);background:#f4efe8;color:#111315}
.v4-story h2,.v4-bridge h2{font-size:clamp(34px,4vw,58px);line-height:1.02;letter-spacing:-.045em;margin:10px 0 24px}.v4-story p{font-size:17px;line-height:1.75;color:#625d57}
.v4-kicker{font-size:12px!important;letter-spacing:.18em;text-transform:uppercase;font-weight:800;color:#9a6e31!important}
.v4-principles{display:grid;gap:14px}.v4-principles article,.v4-service-grid article,.v4-blog-grid a{border:1px solid rgba(62,54,44,.14);border-radius:24px;background:#fbf8f3;padding:28px;box-shadow:0 16px 44px rgba(29,22,15,.06)}.v4-principles span,.v4-service-grid span{color:#b27b33;font-weight:800;font-size:13px}.v4-principles strong{display:block;font-size:22px;margin:8px 0}.v4-principles p{font-size:15px;margin:0}
.v4-service-grid{padding:72px clamp(24px,5vw,72px);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;background:#f4efe8;color:#111315}.v4-service-grid h2{font-size:28px;margin:10px 0}.v4-service-grid p{line-height:1.65;color:#69625b}
.v4-note{margin-top:18px;margin-bottom:72px;padding:28px clamp(24px,5vw,48px);border:1px solid rgba(200,150,76,.28);border-radius:24px;background:#111315;color:#f4efe8}.v4-note strong{color:#e7bd7a}.v4-note p{color:#c7c0b8;line-height:1.65}.v4-note a{color:#e7bd7a;font-weight:750}
.v4-legal{padding:64px clamp(24px,5vw,72px) 88px;background:#f4efe8;color:#111315;display:grid;gap:0}.v4-legal article{padding:30px 0;border-bottom:1px solid rgba(62,54,44,.14)}.v4-legal article:last-child{border-bottom:0}.v4-legal h2{font-size:24px;margin:0 0 12px}.v4-legal p{max-width:880px;line-height:1.75;color:#655f58;margin:0}
.v4-blog-grid{padding:72px clamp(24px,5vw,72px);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;background:#f4efe8}.v4-blog-grid a{color:#111315;text-decoration:none;min-height:310px;display:flex;flex-direction:column}.v4-blog-grid span{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9a6e31;font-weight:800}.v4-blog-grid h2{font-size:28px;line-height:1.08;margin:20px 0 14px}.v4-blog-grid p{color:#6b645d;line-height:1.6}.v4-blog-grid b{margin-top:auto;color:#9a6e31}
.v4-bridge{margin-top:64px;margin-bottom:64px;padding:40px 48px;border:1px solid rgba(200,150,76,.24);border-radius:28px;background:linear-gradient(135deg,#121416,#1b1712);color:#f6f1e9;display:flex;align-items:center;justify-content:space-between;gap:32px}.v4-bridge h2{font-size:clamp(28px,3vw,44px);max-width:760px;margin-bottom:0}
.v4-article-hero{max-width:1180px;margin:0 auto;padding:88px clamp(24px,5vw,72px) 56px;background:#111315;color:#f4efe8}.v4-article-hero h1{font-size:clamp(42px,6vw,76px);line-height:.98;max-width:950px;letter-spacing:-.05em;margin:18px 0}.v4-article-hero>p:last-child{color:#a9a39b}.v4-breadcrumbs{display:flex;gap:10px;flex-wrap:wrap;font-size:13px;color:#aaa49c}.v4-breadcrumbs a{color:#c9c2ba}.v4-breadcrumbs b{color:#e7bd7a}
.v4-article{padding:64px clamp(24px,10vw,150px) 96px;background:#f4efe8;color:#111315}.v4-article h2{font-size:30px;margin:42px 0 14px}.v4-article p{max-width:820px;font-size:18px;line-height:1.78;color:#5f5953}.v4-lead{font-size:23px!important;color:#2a2724!important}.v4-article-cta{margin-top:60px;padding:32px;border-radius:24px;background:#111315;color:#f4efe8}.v4-article-cta strong{font-size:26px}.v4-article-cta p{color:#bbb4ab;font-size:16px}.v4-article-cta .button{display:inline-flex;margin-top:12px}
.v4-footer-grid{display:grid!important;grid-template-columns:1.4fr repeat(4,minmax(140px,1fr));gap:30px!important;align-items:start}.v4-footer-grid>div{display:grid;gap:10px}.v4-footer-grid>div>strong{color:#e7bd7a;font-size:12px;text-transform:uppercase;letter-spacing:.14em}.v4-footer-grid>div>a{color:inherit;text-decoration:none;font-size:14px;opacity:.82}.v4-footer-grid>div>a:hover{opacity:1;color:#e7bd7a}.v4-footer-ecosystem small{opacity:.55;line-height:1.45}
.v4-review-proof{max-width:1180px;margin:0 auto 10px;padding:0 clamp(24px,5vw,72px)}.v4-review-proof>div{padding:26px 30px;border:1px solid rgba(200,150,76,.25);border-radius:22px;background:#17191b;color:#eee7dd}.v4-review-proof strong{color:#e7bd7a}.v4-review-proof p{color:#aaa39a;line-height:1.6;margin:8px 0 0}
.v4-vahome-success{margin-top:22px;padding:22px;border-radius:20px;border:1px solid rgba(200,150,76,.28);background:#151515}.v4-vahome-success strong{color:#e7bd7a}.v4-vahome-success p{margin:7px 0 13px!important;color:#bbb!important}.v4-vahome-success a{color:#f2c87d;font-weight:800}
@media(max-width:900px){.v4-story{grid-template-columns:1fr;padding-top:48px}.v4-service-grid{grid-template-columns:1fr}.v4-blog-grid{grid-template-columns:1fr}.v4-bridge{margin-left:18px;margin-right:18px;padding:28px;align-items:flex-start;flex-direction:column}.v4-footer-grid{grid-template-columns:1fr 1fr!important}.v4-footer-brand,.v4-footer-ecosystem{grid-column:1/-1}.v4-article{padding-left:24px;padding-right:24px}}
@media(max-width:560px){.v4-footer-grid{grid-template-columns:1fr!important}.v4-footer-grid>div{grid-column:auto}.v4-blog-grid{padding-left:18px;padding-right:18px}.v4-service-grid{padding-left:18px;padding-right:18px}.v4-legal{padding-left:20px;padding-right:20px}}

/* v4.0.5 — suppress legacy footer during React hydration; site-v400 replaces it with v4 footer. */
main>footer:not(.v4-footer){visibility:hidden}

/* v4.0.8 — small-desktop editorial hero safety.
   The original 1.15fr/.55fr grid left long right-column headings too narrow
   around 901–1180px (notably /dostavka/ at 1024px). */
@media (min-width:901px) and (max-width:1180px){
  .inner-hero.v4-inner-hero{
    grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr);
    gap:4vw;
    padding-left:5vw;
    padding-right:5vw;
  }
  .inner-hero.v4-inner-hero h1{
    min-width:0;
    max-width:100%;
    font-size:clamp(54px,5.7vw,64px);
  }
  .inner-hero.v4-inner-hero h1 em{max-width:100%}

  /* /umovy/ still uses the legacy wrapper around its heading. Keep the
     longest word inside that column at tablet/small-desktop widths. */
  body:has(.terms-grid) .inner-hero h1{
    min-width:0;
    max-width:100%;
    font-size:clamp(54px,5.7vw,64px);
  }
}

'''
(ROOT/'assets'/'site-v400.css').write_text(css,encoding='utf-8')

# ---------- V4 JS ----------
js=r'''

(()=>{
'use strict';
const path=location.pathname.replace(/\/+$/,'')||'/';
const ARROW='<svg aria-hidden="true" class="icon-arrow" focusable="false" viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6"></path></svg>';
function patchFooter(){
 document.querySelectorAll('footer').forEach(footer=>{if(footer.classList.contains('v4-footer')||footer.closest('.vq-dialog'))return;footer.className='v4-footer';footer.innerHTML='<div class="footer-main v4-footer-grid"><div class="v4-footer-brand"><a class="brand footer-brand" href="/"><span class="brand-mark">VA</span><span class="brand-copy"><strong>CLEANER</strong><small>POLTAVA</small></span></a><p>Сервіс самостійного глибокого прибирання в Полтаві.</p></div><div><strong>Підібрати</strong><a href="/pidbir/">Підбір рішення</a><a href="/rishennia/">Що почистити</a><a href="/komplekty/">Комплекти</a><a href="/bronuvannia/">Бронювання</a></div><div><strong>Довіра</strong><a href="/yak-tse-pratsiuie/">Як це працює</a><a href="/vidhuky/">Відгуки</a><a href="/pro-nas/">Про VAcleaner</a><a href="/blog/">Поради</a></div><div><strong>Сервіс</strong><a href="/dostavka/">Доставка й оплата</a><a href="/faq/">FAQ</a><a href="/umovy/">Умови оренди</a><a href="/kontakty/">Контакти</a><a href="/polityka-konfidenciynosti/">Конфіденційність</a></div><div class="v4-footer-ecosystem"><strong>VA ecosystem</strong><a href="https://vahome.com.ua/" rel="noreferrer" target="_blank">VA HOME</a><small>Простір чистий — тепер атмосфера.</small></div></div><div class="footer-bottom"><span>© 2026 VAcleaner</span><span>Полтава · +38 (095) 391 95 69</span></div>';});
}
function mobileMenu(){if(document.getElementById('_R_'))return;document.querySelectorAll('.menu-button').forEach(btn=>{if(btn.dataset.v4Bound)return;btn.dataset.v4Bound='1';btn.addEventListener('click',()=>{const menu=document.querySelector('.mobile-menu');const open=btn.getAttribute('aria-expanded')==='true';btn.setAttribute('aria-expanded',String(!open));menu?.classList.toggle('is-open',!open);document.body.classList.toggle('menu-open',!open)})});document.querySelectorAll('.mobile-menu a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('.menu-button')?.setAttribute('aria-expanded','false');document.querySelector('.mobile-menu')?.classList.remove('is-open');document.body.classList.remove('menu-open')}));}
function reviewsProof(){if(path!=='/vidhuky'||document.querySelector('.v4-review-proof'))return;const hero=document.querySelector('.inner-hero');if(!hero)return;const box=document.createElement('section');box.className='v4-review-proof';box.innerHTML='<div><strong>Підтверджена оренда</strong><p>Позначку даємо лише відгукам, які можна пов’язати з фактичним бронюванням. Ім’я публікуємо тільки з дозволу клієнта — без вигаданих рейтингів і підписів.</p></div>';hero.insertAdjacentElement('afterend',box);}
function termsDelivery(){if(path!=='/umovy')return;document.querySelectorAll('.terms-grid article,.terms-grid>div').forEach(card=>{const t=card.textContent||'';if(t.includes('Самовивіз або доставка')){const p=card.querySelector('p');if(p)p.innerHTML='Умови отримання та оплати винесені окремо: самовивіз у Полтаві, доставка по місту та передплата. <a href="/dostavka/"><strong>Доставка й оплата →</strong></a>';}})}
function privacyConsent(){if(path!=='/bronuvannia')return;const span=document.querySelector('.booking-consent span');if(!span||span.querySelector('a[href="/polityka-konfidenciynosti/"]'))return;const terms=span.querySelector('a[href^="/umovy"]');if(!terms)return;const a=document.createElement('a');a.href='/polityka-konfidenciynosti/';a.target='_blank';a.rel='noopener';a.textContent='політику конфіденційності';terms.insertAdjacentText('afterend',' та ');terms.insertAdjacentElement('afterend',a);}
function vahomeBridge(){if(path!=='/bronuvannia')return;const success=document.querySelector('.booking-success');if(!success||success.querySelector('.v4-vahome-success'))return;const box=document.createElement('div');box.className='v4-vahome-success';box.innerHTML='<strong>Простір чистий — тепер атмосфера.</strong><p>Після прибирання можна продовжити VA ecosystem у VA HOME.</p><a href="https://vahome.com.ua/" rel="noreferrer" target="_blank">Перейти до VA HOME →</a>';success.appendChild(box);}
function boot(){patchFooter();mobileMenu();reviewsProof();termsDelivery();privacyConsent();vahomeBridge()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('load',boot,{once:true});
new MutationObserver(()=>{vahomeBridge();if(document.querySelector('main>footer:not(.v4-footer)'))patchFooter();}).observe(document.body,{childList:true,subtree:true});
})();

'''
(ROOT/'assets'/'site-v400.js').write_text(js,encoding='utf-8')

# ---------- enhance current quiz result with manager alternative ----------
quiz=ROOT/'assets'/'public-quiz.js'
q=quiz.read_text(encoding='utf-8')
old='<a class="vq-book" href="${bookingUrl(r)}">Забронювати це рішення →</a><button type="button" class="vq-restart">Пройти заново</button>'
new='<a class="vq-book" href="${bookingUrl(r)}">Забронювати це рішення →</a><a class="vq-manager" href="https://www.instagram.com/vacleaner_washing.pl/" target="_blank" rel="noreferrer">Запитати менеджера</a><button type="button" class="vq-restart">Пройти заново</button>'
if old in q:q=q.replace(old,new)
quiz.write_text(q,encoding='utf-8')

# ---------- rebuild pidbir as full structural page, keep modal opener ----------
pid_body='''<section class="inner-hero v4-inner-hero"><p class="eyebrow"><span></span> Smart Guide · ~30 секунд</p><h1>Що почистити?<br><em>Підберемо рішення.</em></h1><p>Позначте одну або кілька зон. Поставимо лише ті уточнення, які реально впливають на техніку або засіб, а фінал одразу веде в передзаповнене бронювання.</p></section><section class="v4-bridge"><div><p class="v4-kicker">Підбір відкриється автоматично</p><h2>Без реєстрації й без списку «всього на світі».</h2></div><button type="button" class="button button-gold" onclick="location.reload()">Почати підбір →</button></section>'''
pid_doc=page_doc('Підібрати рішення для прибирання — VAcleaner','Розумний підбір техніки й засобів VAcleaner під диван, матрац, килим, кухню, ванну або вікна. Результат веде у передзаповнене бронювання.','/pidbir/',pid_body,[{"@type":"WebPage","name":"Підбір рішення VAcleaner","url":"https://vacleaner.pp.ua/pidbir/"}])
pid_doc=pid_doc.replace('</body>',f'<script defer src="/assets/public-quiz.js?v={BUILD}"></script></body>')
(ROOT/'pidbir'/'index.html').write_text(pid_doc,encoding='utf-8')

# ---------- patch existing public html: nav/footer asset + privacy consent + LB schema cleanup ----------
for p in ROOT.rglob('*.html'):
    rel=p.relative_to(ROOT).as_posix()
    if rel.startswith('admin/') or rel in {'pidbir/index.html'} or rel.startswith('blog/') or rel.startswith('pro-nas/') or rel.startswith('dostavka/') or rel.startswith('polityka-konfidenciynosti/'):
        continue
    s=p.read_text(encoding='utf-8',errors='ignore')
    # add structural assets
    if '/assets/site-v400.css' not in s and '</head>' in s:
        s=s.replace('</head>',f'<link rel="stylesheet" href="/assets/site-v400.css?v={BUILD}"></head>',1)
    if '/assets/site-v400.js' not in s and '</body>' in s:
        s=s.replace('</body>',f'<script defer src="/assets/site-v400.js?v={BUILD}"></script></body>',1)
    # privacy link in booking consent
    if rel=='bronuvannia/index.html':
        s=s.replace('умови бронювання</a>.','умови бронювання</a> та <a href="/polityka-konfidenciynosti/" target="_blank">політику конфіденційності</a>.')
    # Do not advertise a changing pickup point as a permanent business address in JSON-LD.
    s=s.replace('"address":{"@type":"PostalAddress","streetAddress":"вул. Європейська, 146Е","addressLocality":"Полтава","addressRegion":"Полтавська область","addressCountry":"UA"},"geo":{"@type":"GeoCoordinates","latitude":49.559015,"longitude":34.522031},','"address":{"@type":"PostalAddress","addressLocality":"Полтава","addressRegion":"Полтавська область","addressCountry":"UA"},')
    p.write_text(s,encoding='utf-8')

# ---------- breadcrumbs on rishennia subpages ----------
for slug,label in [('textile','Текстиль'),('mattress','Матрац'),('steam','Пара'),('windows','Вікна')]:
    p=ROOT/'rishennia'/slug/'index.html'
    s=p.read_text(encoding='utf-8')
    b={"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Головна","item":"https://vacleaner.pp.ua/"},{"@type":"ListItem","position":2,"name":"Що почистити","item":"https://vacleaner.pp.ua/rishennia/"},{"@type":"ListItem","position":3,"name":label,"item":f"https://vacleaner.pp.ua/rishennia/{slug}/"}]}
    if 'BreadcrumbList' not in s:s=s.replace('</head>','<script type="application/ld+json">'+json.dumps(b,ensure_ascii=False,separators=(',',':'))+'</script></head>',1)
    p.write_text(s,encoding='utf-8')

# ---------- sitemap ----------
urls=[
('/',1.0),('/pidbir/',.9),('/rishennia/',.9),('/rishennia/textile/',.8),('/rishennia/mattress/',.8),('/rishennia/steam/',.8),('/rishennia/windows/',.8),('/komplekty/',.9),('/bronuvannia/',.9),
('/vidhuky/',.7),('/yak-tse-pratsiuie/',.7),('/pro-nas/',.7),('/dostavka/',.7),('/faq/',.7),('/umovy/',.5),('/kontakty/',.7),('/blog/',.8),
('/blog/yak-vyvesty-plyamu-z-dyvana/',.7),('/blog/skilky-sokhne-dyvan-pislia-chyshchennia/',.7),('/blog/yak-pochystyty-matrats-pislia-dytyny/',.7),('/polityka-konfidenciynosti/',.3)]
smap=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for u,pr in urls:smap.append(f'  <url><loc>https://vacleaner.pp.ua{u}</loc><lastmod>{TODAY}</lastmod><priority>{pr:.1f}</priority></url>')
smap.append('</urlset>')
(ROOT/'sitemap.xml').write_text('\n'.join(smap)+'\n',encoding='utf-8')

# ---------- update stamp/check to know site-v400 assets ----------
stamp=ROOT/'scripts'/'stamp-build.mjs'
s=stamp.read_text(encoding='utf-8')
s=s.replace('mobile-home-fix)', 'mobile-home-fix|site-v400)')
stamp.write_text(s,encoding='utf-8')
check=ROOT/'scripts'/'check-build.mjs'
s=check.read_text(encoding='utf-8')
s=s.replace('mobile-home-fix)\\.(?:js|css)', 'mobile-home-fix|site-v400)\\.(?:js|css)')
check.write_text(s,encoding='utf-8')

# ---------- release report ----------
for old in ROOT.glob('RELEASE-REPORT-*.md'): old.unlink()
report='''# VAcleaner v4.0.0 — STRUCTURE & TRUST\n\nStructural release. No visual redesign.\n\n## Added\n- /pidbir/ as a shareable Smart Guide landing page; quiz ends in prefilled booking and includes manager escape-hatch.\n- /pro-nas/ founder/service trust page without invented biography.\n- /dostavka/ separated from rental rules.\n- /blog/ plus three launch guides.\n- /polityka-konfidenciynosti/ covering booking, documents, GTM/GA4 and data rights.\n- Full footer sitemap and VA HOME ecosystem bridge.\n- Primary navigation now: What to clean / Packages / How it works / Reviews / Selection / Booking.\n- BreadcrumbList on /rishennia/* and BlogPosting on guide pages.\n\n## Deliberate SEO decisions\n- Keep Service + Offer for rental/task pages instead of forcing Product markup.\n- Do not add self-serving AggregateRating/Review stars to LocalBusiness.\n- Do not publish customer names without explicit permission.\n- LocalBusiness no longer claims the variable pickup point as a permanent street/geo location.\n- FAQPage remains valid semantic markup, although Google generally does not show FAQ rich results for ordinary commercial sites.\n'''
(ROOT/'RELEASE-REPORT-v4.0.0.md').write_text(report,encoding='utf-8')
print('v4.0 structural files created')
