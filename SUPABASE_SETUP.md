# رفع قاعدة بيانات OpsFlow إلى Supabase

تم تحويل المشروع من MySQL إلى PostgreSQL وتجهيز Drizzle للعمل مع Supabase.

## 1. إنشاء مشروع Supabase

1. أنشئ مشروعًا جديدًا في Supabase.
2. من صفحة المشروع اضغط **Connect**.
3. انسخ رابط **Session pooler** للـBackend؛ يستخدم المنفذ `5432` ويعمل على IPv4.
4. انسخ رابط **Direct connection** للـMigration. إذا لم يعمل بسبب IPv6، استخدم رابط Session pooler نفسه.
5. استبدل `[YOUR-PASSWORD]` بكلمة مرور قاعدة البيانات.

## 2. إعداد Backend

انسخ `.env.example` إلى ملف جديد باسم `.env` ثم أدخل الروابط الحقيقية:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:5432/postgres
MIGRATION_DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
JWT_SECRET=ضع-هنا-مفتاحًا-طويلًا-وعشوائيًا
OWNER_OPEN_ID=your-email@example.com
PORT=4000
NODE_ENV=development
```

لا ترفع ملف `.env` إلى GitHub.

إذا كانت استضافة الـBackend من نوع Serverless، يمكن استخدام رابط **Transaction pooler** ذي المنفذ `6543` في `DATABASE_URL`. الكود يعطّل prepared statements حتى يكون هذا الوضع مدعومًا.

## 3. إنشاء الجداول في Supabase

```bash
npm install
npm run check
npm run db:check
npm run db:migrate
```

ملف Migration جاهز مسبقًا داخل `drizzle/migrations`. تأكد قبل `db:migrate` أن `MIGRATION_DATABASE_URL` يشير إلى مشروع Supabase الصحيح.

## 4. التحقق

من **Table Editor** في Supabase، تأكد من ظهور الجداول التالية:

- `users`
- `projects`
- `project_members`
- `tasks`
- `chat_rooms`
- `chat_room_members`
- `messages`
- `notifications`
- `activities`

ثم شغّل الـBackend:

```bash
npm run dev
```

عند نشر الـBackend، أضف `DATABASE_URL` و`JWT_SECRET` و`OWNER_OPEN_ID` و`NODE_ENV=production` إلى متغيرات بيئة الاستضافة. لا تحتاج إلى إضافة `MIGRATION_DATABASE_URL` إلى خدمة التشغيل بعد انتهاء الترحيل.
