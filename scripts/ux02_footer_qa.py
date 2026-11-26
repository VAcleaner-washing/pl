"""UX-02 public footer contract; called by existing Chromium/WebKit hydration QA.

Only local exported artifacts with intercepted fixture APIs are used by callers.
Contacts are clicked normally; default external navigation is prevented without
stopping propagation, so the existing document analytics handler remains real.
"""
from playwright.sync_api import expect

NAVIGATION = {
    'Підібрати': ['/pidbir/', '/rishennia/', '/komplekty/', '/bronuvannia/'],
    'Довіра': ['/yak-tse-pratsiuie/', '/vidhuky/', '/pro-nas/', '/blog/'],
    'Сервіс': ['/dostavka/', '/faq/', '/kontakty/'],
    'Інформація': ['/umovy/', '/polityka-konfidenciynosti/'],
}


def footer_geometry(page):
    return page.evaluate('''() => {
        const footer=document.querySelector('footer.v4-footer');
        const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
        const bar=document.querySelector('.mobile-booking');
        return {width:innerWidth,documentWidth:document.documentElement.clientWidth,
            scrollWidth:document.documentElement.scrollWidth,
            footer:rect(footer), copyright:rect(footer.querySelector('.footer-bottom')),
            banner:rect(footer.querySelector('.v4-vahome-banner')),
            bar:bar?rect(bar):null,
            ctaVisible:!!bar && getComputedStyle(bar).display!=='none'
                && document.documentElement.classList.contains('v4-mobile-cta-visible'),
            overflow:[...footer.querySelectorAll('*')].filter(e=>{
                if(!e.getClientRects().length || getComputedStyle(e).position==='absolute')return false;
                const r=e.getBoundingClientRect();return r.x < -1 || r.right > document.documentElement.clientWidth+1;
            }).map(e=>e.className?.baseVal || e.className || e.tagName)};
    }''')


def check_geometry(page):
    page.evaluate('scrollTo(0, document.documentElement.scrollHeight)')
    # Wait on the actual CSS transition, not an arbitrary screenshot delay.
    if page.locator('html.v4-mobile-cta-visible').count():
        page.wait_for_function("getComputedStyle(document.querySelector('.mobile-booking')).opacity === '1'")
    result = footer_geometry(page)
    assert result['scrollWidth'] <= result['documentWidth'] + 1, result
    assert not result['overflow'], result
    if result['ctaVisible']:
        assert result['copyright']['bottom'] + 8 <= result['bar']['y'], result
        assert result['banner']['bottom'] + 8 <= result['bar']['y'], result
    return result


def check_footer(page, width):
    footer = page.locator('footer.v4-footer')
    expect(footer).to_have_count(1)
    expect(footer.locator('.footer-brand')).to_have_count(1)
    expect(footer.locator('.brand-mark')).to_have_text('VA')
    expect(footer.locator('.brand-copy strong')).to_have_text('CLEANER')
    expect(footer.locator('.brand-copy small')).to_have_text('POLTAVA')
    groups = footer.locator('.v4-footer-navigation > details')
    expect(groups).to_have_count(4)
    page.wait_for_selector('footer[data-v4-navigation-ready="1"]', state='attached')
    actual = groups.evaluate_all('nodes => Object.fromEntries(nodes.map(d => [d.querySelector("summary").textContent,[...d.querySelectorAll("a")].map(a=>a.getAttribute("href"))]))')
    assert actual == NAVIGATION, actual
    open_before = groups.evaluate_all('nodes=>nodes.map(d=>d.open)')
    assert open_before == [width > 620] * 4, open_before
    if width <= 620:
        # Closed links must be hidden; click and keyboard both use native details.
        for group in groups.all():
            expect(group.locator('a').first).not_to_be_visible()
            group.locator('summary').click()
            expect(group.locator('a').first).to_be_visible()
        # Existing body mutation observer must not close an expanded category.
        page.evaluate('''() => {const n=document.createElement('span');document.body.append(n);n.remove()}''')
        expect(groups.first).to_have_attribute('open', '')
        summary = groups.first.locator('summary')
        summary.focus()
        summary.press('Enter')
        expect(groups.first.locator('a').first).not_to_be_visible()
        summary.press('Enter')
        expect(groups.first.locator('a').first).to_be_visible()
    expanded_geometry = check_geometry(page)
    if width <= 620:
        for group in groups.all():
            group.locator('summary').click()
    collapsed_geometry = check_geometry(page)
    simulated_safe_area = None
    overlap_negative = None
    if width <= 620:
        # Both declarations model the SAME inset: Chromium's env() is zero on
        # Linux. This is a CSS simulation, never physical-iPhone evidence.
        simulation = page.add_style_tag(content='.mobile-booking{bottom:34px!important}footer.v4-footer{padding-bottom:54px!important}')
        try:
            simulated_safe_area = check_geometry(page)
        finally:
            simulation.evaluate('(style)=>style.remove()')
        # A real occluded final row must fail this same geometry assertion.
        mutation = page.add_style_tag(content='footer.v4-footer .footer-bottom{position:relative;top:160px}')
        try:
            try:
                check_geometry(page)
            except AssertionError:
                overlap_negative = 'rejected occluded final row'
            assert overlap_negative, 'Footer clearance assertion accepted an occluded copyright'
        finally:
            mutation.evaluate('(style)=>style.remove()')
        check_geometry(page)
    phone = footer.locator('.v4-footer-phone')
    instagram = footer.locator('.v4-footer-instagram')
    home = footer.locator('.v4-vahome-banner')
    expect(phone).to_have_attribute('href', 'tel:+380953919569')
    expect(phone).to_have_text('+38 (095) 391 95 69')
    expect(instagram).to_have_attribute('href', 'https://www.instagram.com/vacleaner_washing.pl/')
    for external in (instagram, home):
        expect(external).to_have_attribute('target', '_blank')
        expect(external).to_have_attribute('rel', 'noreferrer')
    expect(home).to_have_attribute('href', 'https://vahome.com.ua/')
    expect(home.locator('img')).to_have_attribute('alt', '')
    home.scroll_into_view_if_needed()
    page.wait_for_function("document.querySelector('.v4-vahome-art').complete && document.querySelector('.v4-vahome-art').naturalWidth > 0")
    # Prevent real dialing/social navigation, without suppressing real bubbling.
    page.evaluate('''() => {
        window.__ux02ClickRows=[];
        window.__ux02PreventExternal=e=>{const a=e.target.closest('footer.v4-footer a');
            if(a && /^(tel:|https:)/.test(a.getAttribute('href'))){
                window.__ux02ClickRows.push(a.getAttribute('href'));e.preventDefault();}};
        document.addEventListener('click',window.__ux02PreventExternal,true);
    }''')
    contacts = []
    try:
        for control, method in [(phone, 'phone'), (instagram, 'instagram')]:
            before = page.evaluate('(window.dataLayer||[]).filter(e=>e.event==="contact_click").length')
            control.click()
            events = page.evaluate('(window.dataLayer||[]).filter(e=>e.event==="contact_click")')
            assert len(events) == before + 1, events
            event = events[-1]
            assert event['contact_method'] == method and event['link_url'] == control.get_attribute('href'), event
            contacts.append(event)
        home.click()
        clicks = page.evaluate('window.__ux02ClickRows')
        assert clicks == ['tel:+380953919569', 'https://www.instagram.com/vacleaner_washing.pl/', 'https://vahome.com.ua/'], clicks
    finally:
        page.evaluate("document.removeEventListener('click',window.__ux02PreventExternal,true)")
    return {'navigation': actual, 'initialOpen': open_before,
            'expanded': expanded_geometry, 'compact': collapsed_geometry,
            'simulatedSafeArea': simulated_safe_area, 'overlapNegative': overlap_negative,
            'contacts': contacts, 'externalClicks': clicks}
