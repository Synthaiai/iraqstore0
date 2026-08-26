import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    print('Step 1: Visiting Storefront...')
    page.goto('http://127.0.0.1:5173/', wait_until='networkidle')
    time.sleep(1)

    print('Step 2: Adding product to cart...')
    add_buttons = page.locator('.pcard__add')
    if add_buttons.count() > 0:
        add_buttons.first.click()
        time.sleep(1)

    # If quick add modal opens, pick size and click add
    qa_btn = page.locator('.qa__sheet .btn--burgundy')
    if qa_btn.is_visible():
        size_opts = page.locator('.qa__row .opt')
        if size_opts.count() > 0:
            size_opts.first.click()
        qa_btn.click()
        time.sleep(1)

    print('Step 3: Going to Checkout...')
    page.goto('http://127.0.0.1:5173/checkout', wait_until='networkidle')
    time.sleep(1)

    print('Step 4: Filling Checkout Form...')
    page.fill('input[data-field="name"]', 'احمد العراقي')
    page.fill('input[data-field="phone"]', '07701234567')
    page.select_option('select[data-field="governorate"]', 'بغداد')
    page.fill('input[data-field="city"]', 'المنصور')
    page.fill('textarea[data-field="address"]', 'شارع الاميرات قرب مول المنصور')

    print('Step 5: Submitting Order...')
    submit_btn = page.locator('button[type="submit"]')
    submit_btn.click()
    time.sleep(2)

    print('Current URL:', page.url)
    assert 'order-confirmed' in page.url, f'Expected order-confirmed in URL, got {page.url}'
    print('PASS: Order successfully confirmed on storefront!')

    print('Step 6: Visiting Admin Panel...')
    page.goto('http://127.0.0.1:5173/admin', wait_until='networkidle')
    time.sleep(1)

    # If login page, enter credentials
    if page.locator('input[type="email"]').is_visible():
        print('Logging in to Admin...')
        page.fill('input[type="email"]', 'adminiraq@gmail.com')
        page.fill('input[type="password"]', '123456')
        page.locator('button[type="submit"]').click()
        time.sleep(2)

    # Click Orders tab
    orders_tab = page.locator('nav.admin-tabs button:has-text("الطلبات")')
    if orders_tab.is_visible():
        orders_tab.click()
        time.sleep(1)

    page_text = page.content()
    assert '07701234567' in page_text or 'احمد العراقي' in page_text, 'Expected customer in Admin Orders!'
    print('PASS: Customer order verified in Admin Orders panel!')

    print('Waiting 4 seconds to verify order DOES NOT disappear...')
    time.sleep(4)
    page_text_after = page.content()
    assert '07701234567' in page_text_after or 'احمد العراقي' in page_text_after, 'Order disappeared after 4 seconds!'
    print('PASS CONFIRMED: Order remained permanently in Admin Orders list!')

    browser.close()
