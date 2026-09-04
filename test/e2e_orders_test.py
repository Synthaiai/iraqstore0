import time
import os
from playwright.sync_api import sync_playwright

base_url = os.environ.get('E2E_BASE_URL', '').rstrip('/')
if not base_url:
    raise RuntimeError('Set E2E_BASE_URL to a deployed Preview environment with D1, Firebase, and Turnstile test keys configured')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    print('Step 1: Visiting Storefront...')
    page.goto(f'{base_url}/', wait_until='networkidle')

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
    page.goto(f'{base_url}/checkout', wait_until='networkidle')

    print('Step 4: Filling Checkout Form...')
    page.fill('input[data-field="name"]', 'احمد العراقي')
    page.fill('input[data-field="phone"]', '07701234567')
    page.select_option('select[data-field="governorate"]', 'بغداد')
    page.fill('input[data-field="city"]', 'المنصور')
    page.fill('textarea[data-field="address"]', 'شارع الاميرات قرب مول المنصور')

    print('Step 5: Submitting Order...')
    submit_btn = page.locator('button[type="submit"]')
    submit_btn.first.wait_for(state='visible')
    page.wait_for_function("!document.querySelector('button[type=submit]').disabled", timeout=15000)
    submit_btn.first.click()
    page.wait_for_url('**/order-confirmed', timeout=15000)

    print('Current URL:', page.url)
    assert 'order-confirmed' in page.url, f'Expected order-confirmed in URL, got {page.url}'
    print('PASS: Order successfully confirmed on storefront!')

    print('Step 6: Visiting Admin Panel...')
    page.goto(f'{base_url}/admin', wait_until='networkidle')

    # If login page, enter credentials
    if page.locator('input[type="email"]').is_visible():
        print('Logging in to Admin...')
        admin_email = os.environ.get('E2E_ADMIN_EMAIL')
        admin_password = os.environ.get('E2E_ADMIN_PASSWORD')
        if not admin_email or not admin_password:
            raise RuntimeError('Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD before running the admin E2E test')
        page.fill('input[type="email"]', admin_email)
        page.fill('input[type="password"]', admin_password)
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
