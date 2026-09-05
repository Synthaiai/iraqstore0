import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = 'http://127.0.0.1:5173'
PHOTO = (Path(__file__).parent.parent / 'public/brand-logo.jpg').read_bytes()
PRODUCTS = [dict(id='loader-shirt', gender='men', category='clothing', sub='shirts', name='قميص اختبار', price=25000,
    images=[f'/fixture-{i}.jpg' for i in range(8)], sizes=['M'], colors=[dict(name='أسود', hex='#111111')])]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width':390, 'height':844})
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        slow, broken = True, False
        async def assets(route):
            if route.request.resource_type == 'image':
                if slow and 'fixture-' in route.request.url:
                    await asyncio.sleep(1.2)
                if broken and 'fixture-7' in route.request.url:
                    await route.fulfill(status=404)
                else:
                    await route.fulfill(body=PHOTO, content_type='image/jpeg', headers={'cache-control':'public,max-age=86400'})
            elif '/api/catalog' in route.request.url:
                await route.fulfill(json={'products':PRODUCTS, 'settings':{}, 'catalog':None})
            elif route.request.url.startswith('https:'):
                await route.abort()
            else:
                await route.continue_()
        await page.route('**/*', assets)
        await page.goto(BASE + '/g/men/all', wait_until='domcontentloaded')
        await expect(page.locator('.store-loading')).to_be_visible()
        await page.screenshot(path='test/loading-mobile-preview.png')
        await expect(page.get_by_role('progressbar')).not_to_have_attribute('aria-valuenow','100')
        await expect(page.locator('.store-loading')).to_have_count(0, timeout=15000)
        assert await page.evaluate('document.body.style.overflow') != 'hidden'
        assert await page.locator('header .logo__badge img').get_attribute('src') == '/brand-logo.jpg'
        assert not await page.locator('main').evaluate('(el) => el.inert')

        # Repeated fast visit must finish without ever mounting the loader.
        slow = False
        await page.add_init_script("window.loaderSeen = false; new MutationObserver(() => { if(document.querySelector('.store-loading')) window.loaderSeen = true; }).observe(document, {childList:true,subtree:true});")
        await page.reload(wait_until='networkidle')
        assert not await page.evaluate('window.loaderSeen'), 'Loader flashed on a ready visit'

        # Changed/missing assets are not hidden by the obsolete permanent flag.
        broken = True
        await page.evaluate("localStorage.setItem('iraqstore-assets-ready','1')")
        await page.reload(wait_until='domcontentloaded')
        await expect(page.get_by_role('button', name='إعادة المحاولة')).to_be_visible(timeout=15000)
        assert int(await page.get_by_role('progressbar').get_attribute('aria-valuenow')) < 100
        await page.set_viewport_size({'width':1440, 'height':960})
        await page.screenshot(path='test/loading-desktop-preview.png')
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        broken = False
        await page.get_by_role('button', name='إعادة المحاولة').click()
        await expect(page.locator('.store-loading')).to_have_count(0, timeout=10000)

        # No catalogue and offline cannot leave an endless modal without controls.
        offline = await browser.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce')
        other = await offline.new_page()
        await other.route('**/*', lambda r: r.fulfill(status=503, json={'ok':False}) if '/api/catalog' in r.request.url or r.request.url.startswith('https:') else r.continue_())
        await other.goto(BASE, wait_until='domcontentloaded')
        await expect(other.get_by_role('button', name='إعادة المحاولة')).to_be_visible(timeout=15000)
        assert await other.locator('.store-loading__tag').evaluate('(el) => getComputedStyle(el).animationName') == 'none'
        await other.get_by_role('button', name='تصفّح المتاح').click()
        await expect(other.locator('.store-loading')).to_have_count(0)
        assert not errors, errors
        await browser.close()
        print('PASS: slow images, decoded completion, no repeat flash, stale flag, failed images, retry, offline, mobile/desktop, reduced motion')

asyncio.run(main())
