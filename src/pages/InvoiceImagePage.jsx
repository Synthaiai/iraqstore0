import { Link, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { readRememberedInvoiceImage } from '../utils/invoiceSave';

export default function InvoiceImagePage() {
  const [params] = useSearchParams();
  const invoice = useMemo(() => readRememberedInvoiceImage(params.get('key')), [params]);

  if (!invoice?.dataUrl) {
    return (
      <section className="shell section invoice-save-page">
        <div className="invoice-save-page__card">
          <h1>تعذر فتح صورة الفاتورة</h1>
          <p>ارجع إلى صفحة تأكيد الطلب وافتح الصورة مرة ثانية.</p>
          <Link className="btn btn--burgundy" to="/">العودة للمتجر</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="shell section invoice-save-page">
      <div className="invoice-save-page__card">
        <h1>حفظ الفاتورة في الصور</h1>
        <p className="invoice-save-page__note">
          <span className="invoice-save-page__important">ملاحظة مهمة</span>: على الآيفون اضغط مطولاً على صورة الفاتورة ثم اختر “<span className="invoice-save-page__important">Save to Photos</span>” أو “<span className="invoice-save-page__important">حفظ إلى الصور</span>”.
        </p>
        <a className="btn btn--ghost" href={invoice.dataUrl} download={invoice.filename || 'iraq-store-invoice.png'}>
          تنزيل للملفات
        </a>
      </div>
      <div className="invoice-save-page__image-wrap">
        <img src={invoice.dataUrl} alt="فاتورة الطلب للحفظ في الاستديو" />
      </div>
    </section>
  );
}
