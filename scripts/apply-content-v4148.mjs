import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const write=(rel,value)=>{const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value)};
const build=JSON.parse(read('release.json')).build;
const sample=read('blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html');
const heroAt=sample.indexOf('<section class="v4-article-hero">');
const footerAt=sample.indexOf('<footer class="v4-footer">');
const bodyAt=sample.indexOf('<body');
if(heroAt<0||footerAt<0||bodyAt<0)throw new Error('Cannot derive article shell');
const bodyShell=sample.slice(bodyAt,heroAt);
const footerShell=sample.slice(footerAt);
const areaServed=[
  {'@type':'City','name':'Полтава'},
  {'@type':'Place','name':'Розсошенці'},
  {'@type':'Place','name':'Щербані'},
  {'@type':'Place','name':'Горбанівка'},
  {'@type':'AdministrativeArea','name':'Полтавський район, Полтавська область'},
];
const business={
  '@type':'LocalBusiness','@id':'https://vacleaner.pp.ua/#business',name:'VAcleaner',url:'https://vacleaner.pp.ua/',
  image:'https://vacleaner.pp.ua/assets/og-home.png',logo:'https://vacleaner.pp.ua/apple-touch-icon.png',telephone:'+380953919569',
  priceRange:'500–3500 UAH',currenciesAccepted:'UAH',address:{'@type':'PostalAddress',addressLocality:'Полтава',addressRegion:'Полтавська область',addressCountry:'UA'},
  areaServed,openingHoursSpecification:{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],opens:'09:00',closes:'19:00'},
  sameAs:['https://www.instagram.com/vacleaner_washing.pl/']
};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

const articles=[
  {
    slug:'yak-pochystyty-dyvan-vdoma',
    title:'Як почистити диван вдома: покрокова схема | VAcleaner',
    description:'Покроково про чистку дивана вдома: суха підготовка, тест тканини, локальні плями, промивання Kärcher Puzzi, відбір вологи та правильне сушіння.',
    headline:'Як почистити диван вдома: покрокова схема',
    eyebrow:'Диван · покроково',
    hero:'Як почистити диван вдома: покрокова схема',
    heroText:'Від сухої підготовки до останнього проходу Puzzi — без зайвої води й випадкової хімії.',
    lead:'Щоб почистити диван вдома акуратно, не треба починати з максимальної кількості води або «найсильнішого» засобу. Найкраще працює проста послідовність: спочатку сухий бруд, потім локальні плями, далі контрольоване промивання і лише після цього — сушіння.',
    quick:'Коротко: приберіть сухий пил і шерсть → перевірте тканину на непомітній ділянці → окремо обробіть плями → промийте невеликими зонами → зробіть кілька проходів Puzzi без подачі води → забезпечте рух повітря.',
    body:`
      <h2>1. Почніть із сухої підготовки</h2>
      <p>Крихти, шерсть і сухий пил краще прибрати до зволоження. Якщо їх намочити першими, вони перетворюються на суспензію, яку доведеться вимивати з тканини разом з основним брудом. Для звичайного дивана достатньо ретельно пройти поверхню пилососом. Якщо в меблях багато шерсті або дрібного сухого пилу, сухий етап можна посилити Jimmy перед роботою Puzzi.</p>
      <p>Зніміть пледи й декоративні подушки, відсуньте меблі від стіни та огляньте шви, кант і місця біля підлокітників. Саме там часто видно, де потрібна локальна обробка, а де достатньо загального промивання.</p>
      <h2>2. Перевірте тканину до великої мокрої зони</h2>
      <p>Навіть професійний засіб не робить нестійкий барвник стійким. Перед стартом протестуйте воду й обраний засіб на малопомітній ділянці. Якщо серветка забарвлюється, ворс змінює напрям або тканина помітно світлішає — не продовжуйте навмання.</p>
      <p>Особливої обережності потребують делікатні, невідомі або нестандартні матеріали. У такій ситуації краще показати фото тканини й ярлика менеджеру до оренди, ніж виправляти наслідки після.</p>
      <h2>3. Плями обробляйте окремо від загального очищення</h2>
      <p>Загальний розчин у Puzzi і локальний плямовивідник виконують різні задачі. Свіжі та змішані побутові забруднення спочатку промокають і локально обробляють відповідним засобом. Для стійких слідів кави, чаю, вина чи ягід може знадобитися окремий окиснювальний етап. Не змішуйте кілька засобів одразу.</p>
      <p>Після локальної роботи плямовивідник потрібно видалити промиванням, а не залишити висихати у волокнах. Детальніше про це є в окремому гайді <a href="/blog/yak-vyvesty-plyamu-z-dyvana/">про плями на дивані</a>.</p>
      <h2>4. Працюйте Puzzi невеликими зонами</h2>
      <p>Не намагайтеся «залити й одразу відмити» всю посадкову частину. Розділіть диван на логічні ділянки: подушка, спинка, підлокітник. Подавайте розчин під час контрольованого проходу й одразу відбирайте його насадкою.</p>
      <p>Якщо забруднення не виходить з першого проходу, це не означає, що треба довше тримати подачу води в одному місці. Краще оцінити тип плями, повторити локальну обробку за потреби або зробити ще один акуратний цикл промивання.</p>
      <h2>5. Закінчуйте не водою, а відбором вологи</h2>
      <p>Після основного очищення зробіть кілька повільних проходів насадкою без подачі розчину. Це один із найважливіших етапів: чим менше вологи лишиться в оббивці й наповнювачі, тим передбачуваніше диван висохне.</p>
      <p>Не орієнтуйтеся лише на верх тканини. Шви, товсті подушки й кант утримують воду довше. Окремий гайд про сушіння пояснює, <a href="/blog/skilky-sokhne-dyvan-pislia-chyshchennia/">від чого залежить час висихання дивана</a>.</p>
      <h2>6. Сушіть рухом повітря, а не сильним нагрівом</h2>
      <p>Після чистки залиште диван відкритим, зніміть або поставте подушки так, щоб повітря проходило з двох боків. Провітрювання або вентилятор на відстані корисніші за гарячий фен впритул. Не накривайте вологий диван пледом і не використовуйте його як спальне місце до повного висихання.</p>
      <h2>7. Коли Puzzi достатньо, а коли є сенс додати Jimmy</h2>
      <p>Для більшості диванів основна задача — глибоке промивання, і тут ключовою технікою залишається Kärcher Puzzi. Jimmy має сенс як додатковий сухий етап, коли на меблях багато шерсті, пилу або хочеться ретельніше підготувати текстиль перед вологим очищенням. Для матраців така комбінація ще логічніша, тому що сухий етап там зазвичай важливіший.</p>
      <h2>8. Три помилки, які найчастіше псують результат</h2>
      <ul class="content-checklist"><li><strong>Забагато води.</strong> Більше розчину не дорівнює чистішому дивану.</li><li><strong>Хімія навмання.</strong> Пляма, запах і загальний бруд можуть потребувати різних етапів.</li><li><strong>Слабкий відбір.</strong> Якщо не забрати вологу насадкою, сушіння стає довшим і менш передбачуваним.</li></ul>
    `,
    related:[['/rishennia/textile/','Рішення для дивана'],['/tekhnika/karcher-puzzi-8-1/','Оренда Kärcher Puzzi'],['/blog/yak-prybraty-zapakh-z-dyvana/','Як прибрати запах']],
    ctaTitle:'Хочете почистити диван самостійно?',
    ctaText:'Оберіть Puzzi на потрібну дату — система покаже доступність, тариф, доставку та залоговий платіж до відправлення заявки.',
    ctaHref:'/bronuvannia/?product=puzzi',ctaLabel:'Перевірити дату Puzzi →'
  },
  {
    slug:'yak-prybraty-zapakh-z-dyvana',
    title:'Як прибрати запах із дивана, а не замаскувати його | VAcleaner',
    description:'Як прибрати запах із дивана після сечі, тварин, їжі, тютюну чи вогкості: знайти джерело, підібрати Neutralix або Odour Zero, промити й висушити.',
    headline:'Як прибрати запах із дивана, а не замаскувати його',
    eyebrow:'Текстиль · запах',hero:'Як прибрати запах із дивана, а не замаскувати його',
    heroText:'Ароматизатор змінює запах у кімнаті. Очищення має прибрати джерело з текстилю.',
    lead:'Стійкий запах у дивані рідко вирішується одним ароматним спреєм. Спочатку треба зрозуміти, де саме джерело: на поверхні, у шві чи вже в наповнювачі. Потім — підібрати окремий етап нейтралізації та видалити залишки забруднення з текстилю.',
    quick:'Коротко: знайдіть джерело → заберіть сухий або рідкий надлишок → не змішуйте засоби → для локального стійкого запаху підберіть нейтралізатор → після обробки промийте текстиль Puzzi → ретельно відберіть вологу й висушіть.',
    body:`
      <h2>1. Спочатку визначте не аромат, а причину</h2>
      <p>Запах сечі, тютюну, їжі й вогкості поводиться по-різному. Якщо причина локальна — наприклад, одна ділянка після тварини — немає сенсу заливати засобом весь диван. Якщо запах рівномірний після диму або довгого зберігання, навпаки, одна маленька пляма не пояснить проблему.</p>
      <p>Огляньте шви, стики подушок, нижню частину й місця біля підлокітників. Джерело може бути глибшим за видиму пляму.</p>
      <h2>2. Не намагайтеся перебити запах парфумом</h2>
      <p>Сильний аромат може на кілька годин створити відчуття чистоти, але якщо органічне забруднення лишилося в тканині, після висихання або нагрівання запах повернеться. Те саме стосується хаотичного змішування соди, оцту, хлору та професійної хімії — ви втрачаєте контроль над реакцією і результатом.</p>
      <h2>3. Neutralix і Odour Zero — не одна й та сама задача</h2>
      <p>У підборі VAcleaner <strong>Neutralix</strong> є пріоритетним варіантом для локальних стійких запахів у текстилі, зокрема сечі. <strong>Odour Zero</strong> використовуємо для загальної нейтралізації запахів, коли проблема ширша — наприклад, вогкість, тютюн або загальний побутовий запах.</p>
      <p>Це не означає, що засіб можна наносити без перевірки матеріалу. Спочатку тест на непомітній ділянці, далі — робота за інструкцією конкретного продукту. Не змішуйте два нейтралізатори в одній ємності й не додавайте локальні засоби в бак Puzzi, якщо вони для цього не призначені.</p>
      <h2>4. Якщо є видима пляма — працюйте з нею окремо</h2>
      <p>Запах і колір плями можуть вимагати двох послідовних етапів. Спочатку локальна пляма, потім промивання, оцінка й лише після цього нейтралізація запаху або навпаки — залежно від конкретного забруднення. Головне, щоб кожен засіб мав зрозумілу задачу.</p>
      <p>Для свіжих і змішаних побутових плям є VA SPOT FIX, для стійких слідів кави, чаю, вина, ягід і соків — VA STAIN OX. Детальна послідовність є в <a href="/blog/yak-vyvesty-plyamu-z-dyvana/">гайді про плями</a>.</p>
      <h2>5. Після нейтралізації треба прибрати залишки з текстилю</h2>
      <p>Коли джерело запаху в тканині, глибоке промивання Puzzi допомагає фізично видалити розчинене забруднення та залишки робочого розчину. Працюйте невеликими зонами, не перезволожуйте наповнювач і в кінці зробіть кілька проходів без подачі води.</p>
      <h2>6. Сушіння — частина боротьби із запахом</h2>
      <p>Навіть добре очищений диван може неприємно пахнути, якщо він довго залишається вологим у закритій кімнаті. Після промивання забезпечте циркуляцію повітря, відкрийте доступ до подушок і швів, не накривайте меблі до повного висихання.</p>
      <h2>7. Чому запах інколи повертається</h2>
      <p>Найчастіші причини — джерело було глибше, ніж зона обробки; залишилося забагато вологи; або прибрали запах із поверхні, але не сам органічний слід. Якщо після повного висихання проблема повернулася з тієї самої точки, не повторюйте десять однакових мокрих циклів. Краще уточнити походження забруднення й скоригувати засіб.</p>
      <h2>8. Коли домашнє очищення може бути недостатнім</h2>
      <p>Якщо рідина давно проникла глибоко в товстий наповнювач, запах іде з конструкції дивана або матеріал не допускає вологого промивання, одного поверхневого циклу може бути мало. У такій ситуації варто оцінити меблі до оренди за фото й описом, а не обіцяти результат «у будь-якому випадку».</p>
    `,
    related:[['/rishennia/textile/','Рішення для текстилю'],['/tekhnika/karcher-puzzi-8-1/','Kärcher Puzzi 8/1'],['/blog/yak-pochystyty-dyvan-vdoma/','Повна схема чистки дивана']],
    ctaTitle:'Є запах у дивані й не знаєте, що додати до Puzzi?',ctaText:'Пройдіть короткий підбір — він розрізняє локальний запах і загальну проблему та запропонує відповідний засіб.',ctaHref:'/pidbir/',ctaLabel:'Підібрати комплект →'
  },
  {
    slug:'yak-pochystyty-matrats-vdoma',
    title:'Як почистити матрац вдома: сухий і вологий етап | VAcleaner',
    description:'Як почистити матрац вдома без зайвої вологи: сухий етап Jimmy, локальна обробка плям, контрольоване промивання Kärcher Puzzi та правильне сушіння.',
    headline:'Як почистити матрац вдома: сухий і вологий етап',eyebrow:'Матрац · 2 етапи',hero:'Як почистити матрац вдома: сухий і вологий етап',
    heroText:'Матрац краще не «заливати хімією», а розділити роботу: спочатку сухе очищення, потім локальні проблеми й лише тоді промивання.',
    lead:'Матрац відрізняється від дивана тим, що в ньому особливо важливо контролювати глибину вологи. Тому логічна схема для домашнього очищення складається з двох етапів: Jimmy прибирає сухий пил, шерсть і частинки з поверхні, а Puzzi після локальної підготовки промиває текстиль без хаотичного замочування.',
    quick:'Коротко: зніміть постіль → сухий етап Jimmy → огляд і тест матеріалу → локальні плями/запах → короткі контрольовані проходи Puzzi → максимальний відбір вологи → сушіння з доступом повітря з обох боків.',
    body:`
      <h2>1. Зніміть усе, що заважає сухому етапу</h2>
      <p>Матрац має бути повністю відкритим: без простирадла, наматрацника й ковдри. Пройдіть шви, кант і зони, де накопичується сухий пил. Якщо матрац можна безпечно підняти або поставити на ребро — це також допоможе пізніше під час сушіння.</p>
      <h2>2. Почніть із Jimmy, а не з води</h2>
      <p>Jimmy JV35 потрібен тут як сухий підготовчий етап. Він збирає пил, шерсть і дрібні частинки з поверхні текстилю до того, як вони намокнуть. Це не «лікування алергії» і не стерилізація матраца, а механічне очищення, яке робить наступний мокрий етап більш контрольованим.</p>
      <h2>3. Окремо визначте плями й запах</h2>
      <p>Не весь матрац потрібно обробляти плямовивідником через одну локальну пляму. Свіжі змішані забруднення, стійкі кольорові сліди та запах — різні задачі. Спочатку визначте проблемні ділянки, протестуйте засіб на непомітному місці й працюйте локально.</p>
      <p>Якщо ситуація пов’язана з дитиною або сечею, є окремий матеріал <a href="/blog/yak-pochystyty-matrats-pislia-dytyny/">про пляму й запах на матраці</a>.</p>
      <h2>4. Вологий етап Puzzi має бути контрольованим</h2>
      <p>Матрац не потрібно просочувати розчином наскрізь. Працюйте невеликими зонами: короткий прохід із подачею, одразу відбір. Якщо треба повторити — повторіть після оцінки, а не тримайте воду в одній точці.</p>
      <p>Після основного промивання кілька разів пройдіть насадкою без подачі. Саме цей сухіший фініш визначає, скільки вологи лишиться всередині.</p>
      <h2>5. Не поспішайте перевертати мокрий матрац на суху основу</h2>
      <p>Після промивання йому потрібен доступ повітря. Якщо конструкція дозволяє, поставте матрац так, щоб циркуляція була з обох боків. Не застеляйте його й не кладіть на суцільну поверхню, поки нижня сторона ще утримує вологу.</p>
      <h2>6. Puzzi + Jimmy — коли комплект справді має сенс</h2>
      <p>Для матраца ця пара логічніша, ніж для багатьох інших задач: Jimmy закриває суху підготовку, Puzzi — глибоке промивання. Саме тому в Smart Entry для матраца комбінація Puzzi + Jimmy є основним рекомендованим сценарієм, а Puzzi окремо лишається простішим варіантом.</p>
      <h2>7. Чого не варто робити</h2>
      <ul class="content-checklist"><li><strong>Не замочуйте матрац.</strong> Вода, що пішла глибоко в конструкцію, значно ускладнює сушіння.</li><li><strong>Не змішуйте засоби.</strong> Плямовивідник і нейтралізатор запаху використовуйте як окремі контрольовані етапи.</li><li><strong>Не застеляйте вологий матрац.</strong> Навіть якщо верх уже здається сухим, перевірте шви та нижню сторону.</li></ul>
      <h2>8. Коли краще не робити мокрий етап самостійно</h2>
      <p>Якщо ярлик забороняє вологе очищення, матеріал нестійкий, всередині є шар, чутливий до води, або забруднення проникло дуже глибоко й давно — краще не експериментувати. Фото ярлика й проблемної ділянки допоможе визначити, чи підходить домашній сценарій.</p>
    `,
    related:[['/rishennia/mattress/','Рішення для матраца'],['/bronuvannia/?product=puzzi_jimmy','Puzzi + Jimmy'],['/blog/yak-pochystyty-matrats-pislia-dytyny/','Матрац після дитини']],
    ctaTitle:'Потрібно очистити матрац у два етапи?',ctaText:'Оберіть комплект Puzzi + Jimmy — система покаже доступну дату та точну суму бронювання.',ctaHref:'/bronuvannia/?product=puzzi_jimmy',ctaLabel:'Перевірити комплект →'
  },
  {
    slug:'shcho-mozhna-i-ne-mozhna-chystyty-paroochysnykom',
    title:'Що можна і не можна чистити пароочисником | VAcleaner',
    description:'Практичний список поверхонь для пароочисника: де Kärcher SC 2 доречний, де потрібен тест і які матеріали краще не обробляти гарячою парою.',
    headline:'Що можна і не можна чистити пароочисником',eyebrow:'Пара · безпека',hero:'Що можна і не можна чистити пароочисником',
    heroText:'Пара добре працює на стійких твердих поверхнях. Але «гаряче» не означає «підходить для всього».',
    lead:'Пароочисник корисний там, де треба розм’якшити жир, пройти шви й складні стики або зменшити кількість побутової хімії. Головне правило — матеріал має витримувати тепло й вологу. Якщо є сумнів, спочатку перевірте рекомендації виробника поверхні та зробіть тест на непомітній ділянці.',
    quick:'Зазвичай пара доречна для стійкої плитки, швів, сантехніки, металевих і багатьох герметичних твердих поверхонь. Обережність потрібна зі склом, пластиком і пофарбованими зонами. Не варто працювати парою по електроніці, необробленому дереву, чутливих покриттях та матеріалах, для яких виробник забороняє тепло або вологу.',
    body:`
      <h2>Що зазвичай можна чистити парою</h2>
      <ul class="content-checklist"><li><strong>Керамічна й порцелянова плитка.</strong> Особливо зручно для рельєфу та стиків.</li><li><strong>Стійкі шви між плиткою.</strong> Пара допомагає розм’якшити поверхневий бруд, але старий пошкоджений шов спочатку краще перевірити.</li><li><strong>Сантехніка й металеві елементи.</strong> Змішувачі, мийки, решітки та інші поверхні, які допускають нагрів.</li><li><strong>Стійкі герметичні тверді поверхні.</strong> Якщо виробник дозволяє вологе гаряче очищення.</li></ul>
      <h2>Де потрібна обережність</h2>
      <p><strong>Скло.</strong> Не направляйте концентровану гарячу пару на дуже холодне скло або одну точку надовго: різкий перепад температур небажаний. Починайте з відстані й прогрівайте поверхню поступово, якщо виробник допускає парове очищення.</p>
      <p><strong>Пластик і силікон.</strong> Вони різні за термостійкістю. На одному елементі пара працює нормально, інший може деформуватися або втратити блиск. Тут тест особливо важливий.</p>
      <p><strong>Пофарбовані поверхні.</strong> Стара або слабко закріплена фарба може відреагувати на тепло й вологу. Не тримайте сопло впритул.</p>
      <h2>Що краще не чистити пароочисником без прямого дозволу виробника</h2>
      <ul class="content-checklist"><li><strong>Електроніку, розетки й прилади під напругою.</strong> Волога й електрика не поєднуються.</li><li><strong>Необроблене дерево, шпон і чутливі меблеві покриття.</strong> Тепло та волога можуть дати набухання або пошкодити фініш.</li><li><strong>Ламінат і паркет через стики.</strong> Навіть якщо верхня поверхня виглядає стійкою, пара може потрапити в шви.</li><li><strong>Вощені, масляні або делікатні декоративні покриття.</strong> Гаряча пара може змінити фініш.</li><li><strong>Матеріали з невідомою термостійкістю.</strong> Якщо немає інформації — не перевіряйте максимальним режимом на видимій зоні.</li></ul>
      <h2>Кухня: де SC 2 найкорисніший</h2>
      <p>Пара добре допомагає розм’якшити побутовий жир біля стиків, ручок, фартуха й плитки. Але товстий старий нагар — це вже не тільки температура: інколи потрібен окремий засіб і механічне очищення. Пароочисник не варто продавати як «одну кнопку замість усієї хімії».</p>
      <h2>Ванна: пара не розчиняє все однаково</h2>
      <p>На мильному нальоті, стиках і рельєфі пара може полегшити роботу. Стійкий вапняний камінь — інша задача; для нього потрібен відповідний засіб. Тобто SC 2 і хімія не конкуренти, а різні інструменти.</p>
      <h2>Як працювати безпечніше</h2>
      <p>Починайте з менш агресивної насадки й короткого контакту, не направляйте пару на руки, людей або тварин, не відкривайте бак під тиском і дайте техніці охолонути перед сервісними діями. Перед видачею VAcleaner показує конкретний запуск і комплект насадок — ці інструкції мають пріоритет над загальними порадами з інтернету.</p>
    `,
    related:[['/rishennia/steam/','Рішення для кухні й ванної'],['/tekhnika/karcher-sc-2-deluxe/','Оренда Kärcher SC 2'],['/bronuvannia/?product=sc2','Перевірити дату SC 2']],
    ctaTitle:'Не впевнені, чи підходить пара саме для вашої поверхні?',ctaText:'Опишіть задачу в Smart Guide або надішліть фото — краще вибрати правильний спосіб до початку роботи.',ctaHref:'/pidbir/',ctaLabel:'Підібрати рішення →'
  },
  {
    slug:'yak-pomyty-vikna-robotom',
    title:'Як помити вікна роботом і чи є від нього сенс | VAcleaner',
    description:'Як правильно користуватися роботом для вікон: підготовка скла, чисті серветки, страхувальний трос, кількість засобу, краї та випадки, коли ABIR WD8 справді економить час.',
    headline:'Як помити вікна роботом і чи є від нього сенс',eyebrow:'Вікна · робот',hero:'Як помити вікна роботом і чи є від нього сенс',
    heroText:'Робот бере на себе повторювані проходи по великій площі скла. Рами, кути й підготовка все одно залишаються за людиною.',
    lead:'Робот для вікон найбільше виправдовує себе на великих гладких площах: панорамних секціях, балконному склінні, дзеркалах. Він не перетворює миття вікон на повністю автоматичний процес, зате помітно зменшує кількість однакових ручних рухів.',
    quick:'Коротко: спочатку приберіть сильний пил і бруд → встановіть чисті сухі серветки → закріпіть страхувальний трос → не переливайте засіб → дайте роботу пройти основну площу → краї, рами й кути доробіть вручну → міняйте серветки, коли вони забруднились.',
    body:`
      <h2>1. Робот не повинен стартувати по шару піску</h2>
      <p>Якщо зовнішнє скло дуже запилене, спочатку приберіть грубий сухий бруд. Пісок на серветці не допомагає миттю й може залишати сліди. Те саме стосується пташиних забруднень або товстого нальоту — сильні локальні місця краще підготувати окремо.</p>
      <h2>2. Чисті серветки важливіші, ніж багато засобу</h2>
      <p>Одна з найчастіших причин розводів — робот продовжує працювати вже брудною мікрофіброю. На великій площі краще мати кілька чистих комплектів і міняти їх у процесі. Засобу має бути рівно стільки, скільки потрібно для ковзання й очищення, а не щоб скло стало мокрим.</p>
      <p>Для скла у VAcleaner є Glass Perfect Care, але навіть хороший засіб не компенсує перенасичену брудом серветку.</p>
      <h2>3. Страхувальний трос — не декоративна деталь</h2>
      <p>Перед запуском на вертикальному склі закріпіть страхування за надійну точку відповідно до інструкції. Не розраховуйте лише на всмоктування. Особливо це важливо на балконі та зовнішніх вікнах.</p>
      <h2>4. Де робот справді економить час</h2>
      <p>Найкращий сценарій — великі прямокутні скляні площі, де вручну доводиться багато разів повторювати той самий рух. На маленькому вікні з великою кількістю рам виграш менший: підготовка й перестановка можуть зайняти майже стільки ж часу, скільки ручне миття.</p>
      <h2>5. Рами, кути й край скла все одно потребують рук</h2>
      <p>Робот проходить основну площу, але не варто обіцяти ідеальне миття рам і стиків. Саме тому комплект «Ідеальні вікна» поєднує SC 2 для рам, кутів і стиків та робота для основної площі скла.</p>
      <h2>6. Не запускайте робота на будь-яку поверхню без перевірки</h2>
      <p>Скло має бути достатньо рівним і відповідати вимогам конкретної моделі. Нестандартна геометрія, дуже вузька секція, пошкоджене скло або поверхня, де робот не може стабільно триматися, потребують окремої оцінки. Для зовнішньої роботи також враховуйте погоду й не використовуйте техніку під дощем.</p>
      <h2>7. Як зменшити розводи</h2>
      <ul class="content-checklist"><li>починайте з чистих серветок;</li><li>не переливайте засіб;</li><li>на дуже брудному склі зробіть підготовчий прохід;</li><li>міняйте мікрофібру, а не намагайтеся одним комплектом пройти всю квартиру;</li><li>фінальні краї перевірте вручну при боковому світлі.</li></ul>
      <h2>8. То чи є сенс орендувати робота?</h2>
      <p>Так, якщо у вас багато скла, панорамні вікна, великий балкон або дзеркальні поверхні. Для двох невеликих стандартних вікон економія часу може бути невеликою. Саме тому краще обирати не «модний гаджет», а рішення під площу: робот окремо або комплект SC 2 + робот, якщо треба одночасно пройти рами й стики.</p>
    `,
    related:[['/rishennia/windows/','Рішення для вікон'],['/tekhnika/robot-dlia-vikon-abir/','Оренда ABIR WD8'],['/bronuvannia/?product=ideal_windows','Комплект «Ідеальні вікна»']],
    ctaTitle:'Багато скла або панорамні вікна?',ctaText:'Перевірте робота ABIR WD8 на потрібну дату або оберіть комплект із SC 2 для рам і стиків.',ctaHref:'/bronuvannia/?product=abir',ctaLabel:'Перевірити дату робота →'
  }
];

function articleSchema(article,url){
  return {'@context':'https://schema.org','@graph':[structuredClone(business),{
    '@type':'BlogPosting',headline:article.headline,description:article.description,datePublished:'2026-08-26',dateModified:'2026-08-26',
    author:{'@type':'Organization',name:'VAcleaner'},publisher:{'@id':'https://vacleaner.pp.ua/#business'},mainEntityOfPage:url
  },{'@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'Головна',item:'https://vacleaner.pp.ua/'},
    {'@type':'ListItem',position:2,name:'Поради',item:'https://vacleaner.pp.ua/blog/'},
    {'@type':'ListItem',position:3,name:article.headline,item:url}
  ]}]};
}
function head(article,url){
  const schema=JSON.stringify(articleSchema(article,url));
  return `<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"/><meta content="width=device-width,initial-scale=1" name="viewport"/><title>${esc(article.title)}</title><meta content="${esc(article.description)}" name="description"/><link href="${url}" rel="canonical"/><meta content="${esc(article.title)}" property="og:title"/><meta content="${esc(article.description)}" property="og:description"/><meta content="${url}" property="og:url"/><meta content="uk_UA" property="og:locale"/><meta content="article" property="og:type"/><meta content="https://vacleaner.pp.ua/assets/og-home.png" property="og:image"/><meta content="summary_large_image" name="twitter:card"/><meta content="${esc(article.title)}" name="twitter:title"/><meta content="${esc(article.description)}" name="twitter:description"/><link href="/favicon.ico" rel="shortcut icon"/><link href="/favicon.svg" rel="icon" type="image/svg+xml"/><link href="/apple-touch-icon.png" rel="apple-touch-icon"/><link href="/_next/static/chunks/0-rnytzezgu81.css" rel="stylesheet"/><link href="/assets/public-fixes.css?v=${build}" rel="stylesheet"/><link href="/assets/mobile-home-fix.css?v=${build}" rel="stylesheet"/><link href="/assets/public-experience.css?v=${build}" rel="stylesheet"/><link href="/assets/site-v400.css?v=${build}" rel="stylesheet"/><link rel="stylesheet" href="/assets/seo-v4147.css?v=${build}"><script id="vac-gtm-bootstrap">(function(w,d,s,l,i){if(w.__VAC_GTM_LOADED__)return;w.__VAC_GTM_LOADED__=true;w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-KC8FF7FB');</script><script type="application/ld+json">${schema}</script></head>`;
}
function relatedAside(article){return `<aside class="seo-route-links content-article-links" aria-label="Наступний крок"><small>Наступний крок</small><strong>Від гайда — до конкретного рішення</strong><div>${article.related.map(([href,label])=>`<a href="${href}">${esc(label)} →</a>`).join('')}</div></aside>`}
function page(article){
  const route=`/blog/${article.slug}/`,url=`https://vacleaner.pp.ua${route}`;
  const hero=`<section class="v4-article-hero"><nav aria-label="Хлібні крихти" class="v4-breadcrumbs"><a href="/">Головна</a><span>→</span><a href="/blog/">Поради</a><span>→</span><b>${esc(article.headline)}</b></nav><p class="eyebrow"><span></span> VAcleaner · ${esc(article.eyebrow)}</p><h1>${esc(article.hero)}</h1><p>${esc(article.heroText)}</p></section>`;
  const content=`<article class="v4-article content-article"><p class="v4-lead">${esc(article.lead)}</p><aside class="content-quick-answer"><small>Коротка відповідь</small><p>${esc(article.quick)}</p></aside>${article.body}${relatedAside(article)}<div class="v4-article-cta"><strong>${esc(article.ctaTitle)}</strong><p>${esc(article.ctaText)}</p><a class="button button-gold" href="${article.ctaHref}">${esc(article.ctaLabel)}</a></div></article>`;
  return head(article,url)+bodyShell+hero+content+footerShell.replaceAll('?v=41472',`?v=${build}`);
}
for(const article of articles)write(`blog/${article.slug}/index.html`,page(article));

const priorityCards=[
  ['yak-pochystyty-dyvan-vdoma','Диван · покроково','Як почистити диван вдома','Від сухої підготовки до промивання Puzzi й правильного сушіння.'],
  ['skilky-sokhne-dyvan-pislia-chyshchennia','Після чищення','Скільки сохне диван','Що реально впливає на висихання та як не залишити зайву вологу.'],
  ['yak-prybraty-zapakh-z-dyvana','Текстиль · запах','Як прибрати запах із дивана','Чим відрізняється нейтралізація від маскування й коли потрібен Neutralix або Odour Zero.'],
  ['yak-pochystyty-matrats-vdoma','Матрац · 2 етапи','Як почистити матрац вдома','Jimmy для сухої підготовки, Puzzi для контрольованого промивання.'],
  ['shcho-mozhna-i-ne-mozhna-chystyty-paroochysnykom','Пара · безпека','Що можна і не можна чистити пароочисником','Поверхні, де SC 2 доречний, і матеріали, з якими потрібна обережність.'],
  ['yak-pomyty-vikna-robotom','Вікна · робот','Як помити вікна роботом','Де робот економить час, як уникнути розводів і що все одно робиться вручну.'],
];
const supportCards=[
  ['yak-vyvesty-plyamu-z-dyvana','Локальна задача','Як працювати з плямою на дивані','SPOT FIX, STAIN OX, промивання і помилки, через які пляма стає більшою.'],
  ['yak-pochystyty-matrats-pislia-dytyny','Матрац · пляма + запах','Матрац після дитини','Окрема схема для плями, запаху й контрольованого промивання.'],
];
const cards=list=>list.map(([slug,kicker,title,desc])=>`<a href="/blog/${slug}/"><span>${esc(kicker)}</span><h2>${esc(title)}</h2><p>${esc(desc)}</p><b>Читати →</b></a>`).join('');
{
  let html=read('blog/index.html');
  const firstGrid=/<section class="v4-blog-grid">[\s\S]*?<\/section>/;
  const existingCluster=/<section class="content-cluster-heading">[\s\S]*?<section class="v4-blog-grid content-support-grid">[\s\S]*?<\/section>/;
  const replacement=`<section class="content-cluster-heading"><p class="eyebrow"><span></span> Почніть звідси</p><h2>6 гайдів під найчастіші домашні задачі.</h2><p>Кожен матеріал веде до конкретного рішення, техніки або комплекту — без дублювання комерційних сторінок.</p></section><section class="v4-blog-grid content-priority-grid">${cards(priorityCards)}</section><section class="content-cluster-heading content-cluster-secondary"><p class="eyebrow"><span></span> Точкові ситуації</p><h2>Плями й окремі сценарії.</h2></section><section class="v4-blog-grid content-support-grid">${cards(supportCards)}</section>`;
  if(existingCluster.test(html))html=html.replace(existingCluster,replacement);
  else if(firstGrid.test(html))html=html.replace(firstGrid,replacement);
  else throw new Error('Cannot locate blog grid');
  write('blog/index.html',html);
}

const relatedBlocks={
  'rishennia/textile/index.html':[
    ['Як почистити диван вдома','/blog/yak-pochystyty-dyvan-vdoma/','Повна послідовність: підготовка, плями, Puzzi та сушіння.'],
    ['Як прибрати запах','/blog/yak-prybraty-zapakh-z-dyvana/','Neutralix, Odour Zero і чому ароматизатор не вирішує джерело.'],
    ['Скільки сохне диван','/blog/skilky-sokhne-dyvan-pislia-chyshchennia/','Як забрати максимум вологи після промивання.'],
  ],
  'rishennia/mattress/index.html':[
    ['Як почистити матрац вдома','/blog/yak-pochystyty-matrats-vdoma/','Сухий етап Jimmy → локальні проблеми → промивання Puzzi.'],
    ['Матрац після дитини','/blog/yak-pochystyty-matrats-pislia-dytyny/','Окрема схема для плями й запаху.'],
  ],
  'rishennia/steam/index.html':[
    ['Що можна і не можна чистити парою','/blog/shcho-mozhna-i-ne-mozhna-chystyty-paroochysnykom/','Плитка, шви, скло, дерево, пластик та інші поверхні без міфів.'],
  ],
  'rishennia/windows/index.html':[
    ['Як помити вікна роботом','/blog/yak-pomyty-vikna-robotom/','Підготовка скла, серветки, страхування та реальні обмеження робота.'],
  ],
  'tekhnika/karcher-puzzi-8-1/index.html':[
    ['Як почистити диван вдома','/blog/yak-pochystyty-dyvan-vdoma/','Покроково від сухої підготовки до сушіння.'],
    ['Як прибрати запах','/blog/yak-prybraty-zapakh-z-dyvana/','Як вибрати Neutralix або Odour Zero під причину.'],
    ['Скільки сохне диван','/blog/skilky-sokhne-dyvan-pislia-chyshchennia/','Що робити після останнього мокрого проходу.'],
  ],
  'tekhnika/karcher-sc-2-deluxe/index.html':[
    ['Що можна і не можна чистити пароочисником','/blog/shcho-mozhna-i-ne-mozhna-chystyty-paroochysnykom/','Де SC 2 доречний і коли краще не використовувати пару.'],
  ],
  'tekhnika/robot-dlia-vikon-abir/index.html':[
    ['Як помити вікна роботом','/blog/yak-pomyty-vikna-robotom/','Коли ABIR WD8 економить час і як зменшити розводи.'],
  ],
};
function relatedSection(items){
  return `<section class="content-related-section" data-content-v4148="1"><div class="content-related-heading"><div><p class="eyebrow"><span></span> Корисні поради</p><h2>Перед стартом — короткі практичні гайди.</h2></div><a href="/blog/">Усі поради →</a></div><div class="content-related-grid">${items.map(([title,href,desc])=>`<a href="${href}"><small>Гід VAcleaner</small><strong>${esc(title)}</strong><p>${esc(desc)}</p><b>Читати →</b></a>`).join('')}</div></section>`;
}
for(const [file,items] of Object.entries(relatedBlocks)){
  let html=read(file);
  html=html.replace(/<section class="content-related-section" data-content-v4148="1">[\s\S]*?<\/section>/,'');
  const marker=html.includes('<section class="puzzi-final">')?'<section class="puzzi-final">':'<section class="final-cta">';
  const at=html.indexOf(marker);
  if(at<0)throw new Error(`Cannot locate CTA marker for ${file}`);
  html=html.slice(0,at)+relatedSection(items)+html.slice(at);
  write(file,html);
}

// Strengthen links inside the three pre-existing supporting articles without creating duplicate articles.
const articleCrosslinks={
  'blog/skilky-sokhne-dyvan-pislia-chyshchennia/index.html':`<aside class="content-inline-related" data-content-v4148="1"><small>Читайте також</small><a href="/blog/yak-pochystyty-dyvan-vdoma/">Як почистити диван вдома →</a><a href="/blog/yak-prybraty-zapakh-z-dyvana/">Як прибрати запах із дивана →</a></aside>`,
  'blog/yak-vyvesty-plyamu-z-dyvana/index.html':`<aside class="content-inline-related" data-content-v4148="1"><small>Читайте також</small><a href="/blog/yak-pochystyty-dyvan-vdoma/">Повна схема чищення дивана →</a><a href="/blog/yak-prybraty-zapakh-z-dyvana/">Як працювати із запахом →</a></aside>`,
  'blog/yak-pochystyty-matrats-pislia-dytyny/index.html':`<aside class="content-inline-related" data-content-v4148="1"><small>Читайте також</small><a href="/blog/yak-pochystyty-matrats-vdoma/">Загальна схема очищення матраца →</a><a href="/rishennia/mattress/">Рішення Puzzi + Jimmy →</a></aside>`,
};
for(const [file,block] of Object.entries(articleCrosslinks)){
  let html=read(file).replace(/<aside class="content-inline-related" data-content-v4148="1">[\s\S]*?<\/aside>/,'');
  const at=html.indexOf('<aside class="seo-route-links"');
  const marker=at>=0?at:html.indexOf('<div class="v4-article-cta">');
  if(marker<0)throw new Error(`Cannot locate article crosslink marker for ${file}`);
  html=html.slice(0,marker)+block+html.slice(marker);
  html=html.replace(/"dateModified":"[0-9-]+"/,'"dateModified":"2026-08-26"');
  write(file,html);
}

// Add/refresh the cluster CSS in one already-versioned public stylesheet.
{
  const file='assets/seo-v4147.css';
  let css=read(file).replace(/\/\* CONTENT_V4148_START \*\/[\s\S]*?\/\* CONTENT_V4148_END \*\//,'').trimEnd();
  css+=`\n/* CONTENT_V4148_START */\n.content-cluster-heading{max-width:1180px;margin:0 auto;padding:64px clamp(24px,5vw,72px) 8px;background:#f4efe8}.content-cluster-heading h2{max-width:760px;margin:12px 0 10px;font-size:clamp(30px,4vw,48px);line-height:1.03;letter-spacing:-.035em;color:#111315}.content-cluster-heading>p:last-child{max-width:720px;color:#6b645d;line-height:1.6}.content-cluster-secondary{padding-top:20px}.content-priority-grid{padding-top:28px}.content-support-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding-top:28px}.content-quick-answer{max-width:820px;margin:30px 0 38px;padding:22px 24px;border:1px solid rgba(178,123,51,.24);border-radius:20px;background:#fffaf2}.content-quick-answer small,.content-inline-related small{display:block;margin-bottom:8px;color:#9a6e31;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.content-quick-answer p{margin:0!important;color:#322f2b!important;font-size:17px!important;line-height:1.65!important}.content-article a{color:#8b5d22;text-decoration-thickness:1px;text-underline-offset:3px}.content-checklist{max-width:820px;margin:14px 0 28px;padding:0;list-style:none;display:grid;gap:10px}.content-checklist li{position:relative;padding:14px 16px 14px 42px;border:1px solid rgba(62,54,44,.12);border-radius:14px;background:#fbf8f3;color:#5f5953;font-size:17px;line-height:1.55}.content-checklist li:before{content:'✓';position:absolute;left:16px;top:14px;color:#a46e29;font-weight:900}.content-inline-related{max-width:820px;margin:34px 0 10px;padding:18px;border-radius:16px;background:#ebe4da;display:flex;gap:10px;flex-wrap:wrap}.content-inline-related small{flex-basis:100%}.content-inline-related a{display:inline-flex;padding:9px 12px;border-radius:999px;background:#f8f4ee;color:#6f4b1d;text-decoration:none;font-size:13px;font-weight:700}.content-article-links{max-width:820px;background:#17191b}.content-related-section{padding:72px clamp(24px,5vw,72px);background:#f4efe8;color:#111315}.content-related-heading{max-width:1180px;margin:0 auto 24px;display:flex;justify-content:space-between;align-items:end;gap:28px}.content-related-heading h2{max-width:720px;margin:10px 0 0;font-size:clamp(30px,4vw,48px);line-height:1.04;letter-spacing:-.035em}.content-related-heading>a{color:#8b5d22;text-decoration:none;font-weight:750}.content-related-grid{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.content-related-grid>a{min-height:220px;padding:24px;border:1px solid rgba(62,54,44,.13);border-radius:20px;background:#fffaf5;color:#111315;text-decoration:none;display:flex;flex-direction:column;box-shadow:0 12px 36px rgba(29,22,15,.05)}.content-related-grid small{color:#9a6e31;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.content-related-grid strong{margin:12px 0 8px;font-size:22px;line-height:1.12}.content-related-grid p{margin:0;color:#6b645d;font-size:14px;line-height:1.55}.content-related-grid b{margin-top:auto;padding-top:18px;color:#8b5d22;font-size:13px}.content-related-grid>a:focus-visible,.content-inline-related a:focus-visible{outline:2px solid #9a6e31;outline-offset:3px}@media(max-width:900px){.content-support-grid{grid-template-columns:1fr}.content-related-heading{align-items:flex-start;flex-direction:column}.content-related-grid{grid-template-columns:1fr}.content-related-grid>a{min-height:0}.content-related-section{padding:52px 20px}.content-cluster-heading{padding-left:20px;padding-right:20px}}@media(max-width:560px){.content-quick-answer{padding:18px}.content-checklist li{font-size:16px}.content-inline-related{display:grid}.content-inline-related small{margin-bottom:0}.content-inline-related a{border-radius:12px;min-height:42px;align-items:center}}\n/* CONTENT_V4148_END */\n`;
  write(file,css);
}

// Add five new URLs; the existing drying guide is the sixth priority article.
{
  let sitemap=read('sitemap.xml');
  for(const article of articles){
    const url=`https://vacleaner.pp.ua/blog/${article.slug}/`;
    if(sitemap.includes(`<loc>${url}</loc>`))continue;
    const entry=`  <url><loc>${url}</loc><lastmod>2026-08-26</lastmod><priority>0.7</priority></url>\n`;
    sitemap=sitemap.replace('  <url><loc>https://vacleaner.pp.ua/polityka-konfidenciynosti/',entry+'  <url><loc>https://vacleaner.pp.ua/polityka-konfidenciynosti/');
  }
  write('sitemap.xml',sitemap);
}

console.log(`Applied v4.1.48 content cluster: ${articles.length} new articles + existing drying guide.`);
