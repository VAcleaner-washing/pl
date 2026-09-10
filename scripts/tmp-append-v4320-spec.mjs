import fs from 'node:fs';

const path='docs/VAcleaner-SYSTEM-SPEC.md';
const marker='# 76. Change record — v4.3.20 UPCOMING STATUS ALIGNMENT';
const current=fs.readFileSync(path,'utf8');
if(current.includes(marker)) process.exit(0);

const record=`

---

# 76. Change record — v4.3.20 UPCOMING STATUS ALIGNMENT

## UPCOMING-STATUS-001 — mobile status badge stays in the header

На mobile/PWA картка \`Найближчі\` тримає статус бронювання у верхньому правому куті заголовка незалежно від довжини назви техніки. Назва техніки займає ліву гнучку колонку й може переноситися, але не має права виштовхувати \`Підтверджена\` / інший status chip на окремий рядок під назву.

### CHANGED

- Заголовок mobile \`Найближчі\` використовує дві колонки: \`minmax(0,1fr)\` для назви техніки та \`max-content\` для status chip.
- Довгі назви на кшталт \`Puzzi + Jimmy + робот\` можуть переноситися тільки всередині лівої колонки.

### FIXED

- \`Підтверджена\` більше не падає під назву техніки у довгій картці й лишається вирівняною праворуч зверху, як у коротких бронюваннях.

### PRESERVED

- Дані бронювання, статусна машина, час, extras, клієнт, телефон, доставка, кнопки \`Деталі\` / \`Видати техніку\`, фінанси, Supabase, RETURN/SMS/referral, public booking та VA HOME не змінюються.
- Desktop/tablet layout поза mobile breakpoint не змінюється.

### TESTS

- \`scripts/test-v4-3-20-upcoming-status.mjs\` — static contract для двоколонкового title/status layout і PWA asset/cache.
- \`scripts/admin_upcoming_status_v4320_qa.py\` — browser regression на 390 / 430 px із довгою назвою \`Puzzi + Jimmy + робот\`.
- Full canonical Static/build + Browser/PWA QA залишається release-blocking перед merge у \`main\`.
`;
fs.writeFileSync(path,current.replace(/\s*$/,'')+record+'\n');
console.log('Appended v4.3.20 System Spec record');
