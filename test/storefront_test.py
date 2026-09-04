import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:5173'
PRODUCTS = [
    dict(id='test-shoe', gender='men', category='shoes', sub='formal', name='حذاء زارا لوفر جلد طبيعي', price=45000, stockQuantity=5, colors=[dict(name='كحلي', hex='#142542')], sizes=['43'], images=['/logo.jpg']),
    dict(id='test-sneaker', gender='men', category='shoes', sub='sneakers', name='سنيكر رياضي', price=35000, stockQuantity=4, colors=[dict(name='أبيض', hex='#ffffff')], sizes=['42'], images=['/missing-product.jpg']),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':390, 'height':844}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/catalog', lambda route: route.fulfill(json={'ok':True, 'products':PRODUCTS, 'settings':{}, 'catalog':None}))
    page.route('https://**', lambda route: route.abort())
    page.goto(BASE + '/product/test-shoe')
    expect(page.locator('h1')).to_contain_text('زارا')
    # Stock and option selection survive a refresh, including the original server color.
    page.goto(BASE + '/g/men/all')
    expect(page.locator('.pcard')).to_have_count(2)
    page.wait_for_function("Array.from(document.querySelectorAll('.pcard__img:not(.pcard__img--alt) img')).every(i => i.complete && i.naturalWidth > 0)")
    page.locator('.chip--action').click()
    expect(page.locator('.filters')).to_have_class(__import__('re').compile('is-open'))
    page.locator('.filters .filter-group').first.locator('button').first.click()
    expect(page.locator('.pcard')).to_have_count(1)
    page.locator('.filters__foot .btn--ghost').click()
    page.locator('.filters__foot .btn--burgundy').click()
    page.locator('.pcard__fav').first.click()
    page.reload()
    expect(page.locator('.pcard__fav').first).to_have_attribute('aria-pressed', 'true')
    page.locator('.pcard__add').first.click()
    expect(page.locator('.drawer .cart-line')).to_have_count(1)
    page.reload()
    page.goto(BASE + '/checkout')
    expect(page.locator('.summary-line')).to_have_count(1)
    page.locator('[data-field="name"]').fill('زبون اختبار')
    page.locator('[data-field="phone"]').fill('123')
    page.locator('[data-field="governorate"]').select_option('بغداد')
    page.locator('[data-field="city"]').fill('الكرادة')
    page.locator('[data-field="address"]').fill('شارع اختبار قرب الجامع')
    page.locator('button[type="submit"]').first.click()
    expect(page.locator('#ck-phone')).to_have_attribute('aria-invalid', 'true')
    page.locator('[data-field="phone"]').fill('٠٧٧٠١٢٣٤٥٦٧')
    def save_order(route):
        data = route.request.post_data_json
        assert data['cart'][0]['color'] == 'كحلي', data
        order = dict(data, orderNo='TEST-001', subtotal=45000, fee=3000, total=48000,
            cart=[dict(qty=1, size='43', color='كحلي', product=PRODUCTS[0])])
        route.fulfill(json={'ok':True, 'order':order})
    page.route('**/api/orders', lambda route: route.fulfill(status=503, json={'ok':False, 'error':{'message':'اختبار فشل حفظ الطلب'}}))
    page.locator('button[type="submit"]').first.click()
    expect(page.locator('.checkout-error')).to_be_visible()
    assert len(json.loads(page.evaluate("localStorage.getItem('iraqstore.cart.v1')"))) == 1
    page.unroute('**/api/orders')
    page.route('**/api/orders', save_order)
    page.locator('button[type="submit"]').first.click()
    page.wait_for_url('**/order-confirmed')
    expect(page.locator('button').filter(has_text='حفظ أو مشاركة')).to_be_enabled(timeout=15000)
    page.locator('summary').click()
    page.locator('img[alt="فاتورة الطلب كاملة"]').screenshot(path='test/invoice-preview.png')
    page.screenshot(path='test/confirmation-mobile.png', full_page=True)
    assert json.loads(page.evaluate("localStorage.getItem('iraqstore.cart.v1')")) == []
    assert not errors, errors
    page.set_viewport_size({'width':1440, 'height':1000})
    page.goto(BASE + '/g/men/shoes')
    expect(page.locator('.pcard')).to_have_count(2)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    # Direct confirmation URL must safely handle missing order state.
    page.goto(BASE + '/order-confirmed')
    assert not errors, errors
    print('PASS: direct product, image fallback, type filter, cart persistence, Arabic phone, checkout, invoice and no runtime errors')
    browser.close()
