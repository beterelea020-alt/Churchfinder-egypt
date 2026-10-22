# تشغيل ChurchFinder في 10 دقايق

## 1) Supabase
1. أنشئ مشروع جديد على supabase.com
2. افتح **SQL Editor** وشغّل الملفات **بالترتيب**:
   - `supabase/migrations/202610230001_initial_schema.sql`
   - `supabase/migrations/202610230002_admin_full_control.sql`  ← (جديد: رقم التليفون، الصور، الاجتماعات، المساعدات)
   - `supabase/seed.sql`  ← اختياري: كام كنيسة ومطعم تجريبي عشان الموقع مايبقاش فاضي
3. **Authentication → Providers → Email**: اقفل **Confirm email** عشان العميل يسجل ويدخل على طول.
4. من **Project Settings → API** خد الـ Project URL والـ publishable key.

## 2) أنت تبقى أدمن
سجّل حساب من الموقع، وبعدين في SQL Editor:
```sql
update public.profiles p set role='admin'
from auth.users u where p.id=u.id and lower(u.email)=lower('بريدك@example.com');
```
اعمل خروج ودخول تاني، هتلاقي «لوحة الإدارة» في المزيد / حسابي (`/admin`).

## 3) Vercel
- ارفع المشروع على GitHub وبعدين Import في Vercel (Framework: Vite).
- Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Deploy.

## محلي
```
copy .env.example .env.local   (واكتب المفاتيح)
npm install
npm run dev
```
