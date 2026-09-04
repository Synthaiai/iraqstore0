import { STORE_CONTACT } from '../data/contact';
import { usePrefs } from '../store/PrefsContext';
import Breadcrumbs from '../components/Breadcrumbs';

export default function PoliciesPage() {
  const { lang } = usePrefs();
  const en = lang === 'en';

  return (
    <>
      <Breadcrumbs items={[{ label: en ? 'Store policies' : 'سياسات المتجر' }]} />
      <header className="shell page-head">
        <span className="eyebrow">IRAQI STORE</span>
        <h1 className="page-head__title">{en ? 'Store policies' : 'سياسات المتجر'}</h1>
        <p className="page-head__sub">
          {en ? 'Clear information about ordering, delivery, returns, and privacy.' : 'معلومات واضحة عن الطلب والتوصيل والاستبدال والخصوصية.'}
        </p>
      </header>

      <section className="shell section section--tight" style={{ maxWidth: 920 }}>
        <div className="form-card" style={{ display: 'grid', gap: '1.5rem', lineHeight: 1.9 }}>
          <section>
            <h2>{en ? 'Orders and payment' : 'الطلبات والدفع'}</h2>
            <p>
              {en
                ? 'Prices are shown in Iraqi dinars. The server verifies the current price and available inventory when the order is submitted. Cash on delivery is available; card-payment requests are completed only through direct contact with the store. Never send card details in website notes.'
                : 'الأسعار معروضة بالدينار العراقي. يتحقق الخادم من السعر الحالي والمخزون عند إرسال الطلب. يتوفر الدفع عند الاستلام، أما طلب الدفع بالبطاقة فيُستكمل فقط بالتواصل المباشر مع المتجر. لا ترسل بيانات بطاقتك داخل ملاحظات الطلب.'}
            </p>
          </section>

          <section>
            <h2>{en ? 'Delivery' : 'التوصيل'}</h2>
            <p>
              {en
                ? 'The delivery fee is displayed before the final order button and depends on the selected governorate. Delivery timing is confirmed by phone or WhatsApp and may vary by location, courier availability, holidays, or exceptional conditions.'
                : 'تظهر أجور التوصيل قبل زر إتمام الطلب وتعتمد على المحافظة المختارة. يُؤكد وقت التسليم عبر الهاتف أو واتساب، وقد يختلف حسب المنطقة وتوفر شركة التوصيل والعطل والظروف الاستثنائية.'}
            </p>
          </section>

          <section>
            <h2>{en ? 'Exchange and returns' : 'الاستبدال والإرجاع'}</h2>
            <p>
              {en
                ? 'Contact the store as soon as possible if an item is incorrect, damaged, or not as described. Keep the order number, packaging, labels, and photos. Eligibility and delivery fees depend on the item condition and the applicable consumer rules; your mandatory legal rights are not limited by this policy.'
                : 'تواصل مع المتجر بأسرع وقت إذا وصلك منتج خاطئ أو متضرر أو مخالف للوصف. احتفظ برقم الطلب والتغليف والعلامات والصور. تعتمد أهلية الاستبدال أو الإرجاع وأجور التوصيل على حالة المنتج والقواعد الاستهلاكية النافذة، ولا تنتقص هذه السياسة من حقوقك القانونية الإلزامية.'}
            </p>
          </section>

          <section>
            <h2>{en ? 'Privacy' : 'الخصوصية'}</h2>
            <p>
              {en
                ? 'We collect the name, phone number, delivery address, order items, and optional notes only to process the order, provide support, and prevent abuse. Order data is handled by the store and its necessary infrastructure or delivery providers, is not sold, and is retained only as needed for operations and legal obligations.'
                : 'نجمع الاسم ورقم الهاتف وعنوان التوصيل وعناصر الطلب والملاحظات الاختيارية لمعالجة الطلب وخدمة الزبون ومنع الإساءة فقط. يتعامل مع البيانات المتجر ومزودو البنية أو التوصيل الضروريون، ولا تُباع، ويُحتفظ بها للمدة اللازمة للتشغيل والالتزامات القانونية.'}
            </p>
          </section>

          <section>
            <h2>{en ? 'Contact' : 'التواصل'}</h2>
            <p>
              {en ? 'For an order, privacy, or return request, contact us on WhatsApp:' : 'لطلب متعلق بالطلب أو الخصوصية أو الاستبدال، تواصل معنا عبر واتساب:'}{' '}
              <a className="link-underline" href={STORE_CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer" dir="ltr">
                {STORE_CONTACT.phone}
              </a>
            </p>
          </section>
        </div>
      </section>
    </>
  );
}
