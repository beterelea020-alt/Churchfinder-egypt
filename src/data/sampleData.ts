import type { Church, Restaurant } from '../types';

// Clearly labeled demo content. Names, coordinates, availability, photos, and schedules must be verified before production use.
export const churches: Church[] = [
  {
    id: 'st-george-cairo', name: 'كنيسة مار جرجس', address: 'شارع مار جرجس، مصر القديمة', neighborhood: 'مصر القديمة', governorate: 'القاهرة', denomination: 'الأرثوذكسية القبطية',
    coordinates: { lat: 30.0062, lng: 31.2301 }, image: 'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=900&q=85',
    description: 'ملف تعريفي تجريبي لكنيسة في منطقة مصر القديمة. يرجى مراجعة العنوان والمعلومات قبل الاعتماد عليها.', sampleOpen: true,
    services: ['قداس الأحد (مثال تجريبي)', 'اجتماعات روحية'], facilities: ['موقف سيارات قريب'], scheduleNote: 'مواعيد القداسات غير موثقة في هذا النموذج.'
  },
  {
    id: 'st-mark-damietta', name: 'كنيسة القديس مار مرقس', address: 'وسط المدينة، دمياط', neighborhood: 'وسط المدينة', governorate: 'دمياط', denomination: 'الأرثوذكسية القبطية',
    coordinates: { lat: 31.4167, lng: 31.8133 }, image: 'https://images.unsplash.com/photo-1548625361-58a9b86aa83b?auto=format&fit=crop&w=900&q=85',
    description: 'مثال تجريبي لمعلومات كنيسة بدمياط. بيانات الموقع والخدمات تحتاج إلى التحقق.', sampleOpen: false,
    services: ['خدمة الشباب (مثال تجريبي)'], facilities: ['مدخل مناسب للكراسي المتحركة'], scheduleNote: 'الجدول غير متاح في بيانات النموذج.'
  },
  {
    id: 'virgin-mary-maadi', name: 'كنيسة السيدة العذراء مريم', address: 'المعادي، القاهرة', neighborhood: 'المعادي', governorate: 'القاهرة', denomination: 'الأرثوذكسية القبطية',
    coordinates: { lat: 29.9602, lng: 31.2569 }, image: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?auto=format&fit=crop&w=900&q=85',
    description: 'نموذج تجريبي لصفحة كنيسة، وليس سجلًا رسميًا أو موثقًا.', sampleOpen: true,
    services: ['اجتماع أسرة (مثال تجريبي)'], facilities: ['دورات مياه'], scheduleNote: 'لا توجد مواعيد مؤكدة ضمن البيانات التجريبية.'
  },
  {
    id: 'st-anthony-nasr', name: 'كنيسة الأنبا أنطونيوس', address: 'مدينة نصر، القاهرة', neighborhood: 'مدينة نصر', governorate: 'القاهرة', denomination: 'الأرثوذكسية القبطية',
    coordinates: { lat: 30.0614, lng: 31.3422 }, image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=900&q=85',
    description: 'بيانات توضيحية لإظهار شكل قوائم الكنائس والبحث والتصفية.', sampleOpen: true,
    services: ['أنشطة أطفال (مثال تجريبي)'], facilities: ['موقف سيارات قريب', 'دورات مياه'], scheduleNote: 'معلومات المواعيد تجريبية وليست معلومة مباشرة.'
  },
  {
    id: 'holy-family-alex', name: 'كنيسة العائلة المقدسة', address: 'وسط الإسكندرية، الإسكندرية', neighborhood: 'وسط البلد', governorate: 'الإسكندرية', denomination: 'الأرثوذكسية القبطية',
    coordinates: { lat: 31.2001, lng: 29.9187 }, image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=900&q=85',
    description: 'مثال لعرض كنيسة من محافظة أخرى، لا يمثل دليلًا مكتملًا لمحافظات مصر.', sampleOpen: false,
    services: ['خدمة اجتماعية (مثال تجريبي)'], facilities: ['قريب من وسائل المواصلات'], scheduleNote: 'المواعيد والخدمات تحتاج إلى تأكيد من مصدر رسمي.'
  },
  {
    id: 'st-mary-new-cairo', name: 'كنيسة القديسة مريم', address: 'القاهرة الجديدة، القاهرة', neighborhood: 'القاهرة الجديدة', governorate: 'القاهرة', denomination: 'الأرثوذكسية القبطية',
    coordinates: { lat: 30.0218, lng: 31.4934 }, image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=900&q=85',
    description: 'عنصر تجريبي لاختبار الفلاتر والتنقل بين المحافظات.', sampleOpen: true,
    services: ['اجتماع عائلات (مثال تجريبي)'], facilities: ['مدخل مناسب للكراسي المتحركة'], scheduleNote: 'لا تستخدم المواعيد التجريبية للتخطيط لزيارة فعلية.'
  }
];

export const restaurants: Restaurant[] = [
  { id: 'restaurant-1', name: 'مطعم الفرح', category: 'شرقي', address: 'مصر القديمة، القاهرة', governorate: 'القاهرة', coordinates: { lat: 30.0092, lng: 31.2292 }, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=85', priceLabel: 'متوسط' },
  { id: 'restaurant-2', name: 'كشري التحرير', category: 'مصري', address: 'وسط البلد، القاهرة', governorate: 'القاهرة', coordinates: { lat: 30.0444, lng: 31.2357 }, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=85', priceLabel: 'اقتصادي' },
  { id: 'restaurant-3', name: 'مطعم بيتزا مارينا', category: 'بيتزا', address: 'المعادي، القاهرة', governorate: 'القاهرة', coordinates: { lat: 29.9637, lng: 31.2567 }, image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=700&q=85', priceLabel: 'متوسط' },
  { id: 'restaurant-4', name: 'كافيه كنيسة مار جرجس', category: 'كافيه', address: 'مصر القديمة، القاهرة', governorate: 'القاهرة', coordinates: { lat: 30.0038, lng: 31.2328 }, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=85', priceLabel: 'اقتصادي' },
  { id: 'restaurant-5', name: 'مخبوزات دمياط', category: 'مخبوزات', address: 'وسط المدينة، دمياط', governorate: 'دمياط', coordinates: { lat: 31.4178, lng: 31.8123 }, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=700&q=85', priceLabel: 'اقتصادي' }
];
export const governorates = ['الكل', 'القاهرة', 'دمياط', 'الإسكندرية', 'الجيزة', 'البحيرة', 'المنيا', 'أسيوط', 'سوهاج', 'الأقصر', 'أسوان'];
export const denominations = ['الأرثوذكسية القبطية', 'الكاثوليكية', 'الإنجيلية', 'الروم الأرثوذكس'];
export const sampleNotice = 'بيانات توضيحية للتجربة وليست دليلًا موثقًا أو معلومات مباشرة.';
