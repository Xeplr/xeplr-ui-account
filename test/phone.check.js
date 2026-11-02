// The nav at phone sizes — in a real browser, on the dev app (dev/).
//
//   npm run test:phone
//
// Not part of `npm test`: it needs a browser (`npx playwright install
// chromium-headless-shell`, once) and starts a dev server. Run it before
// releasing anything that changes how the nav is drawn.
//
// The dev app is signed in from localStorage like a real session, and the one
// call the nav makes — /auth/api/me — is answered here with the menus this
// person may see, exactly as @xeplr/auth would.
//
// At 360, 390 and 430px wide:
//   - closed, the drawer is a bar across the top, and the page starts below it;
//   - the bar's controls (menu, notifications, settings) are 44px targets;
//   - open, the menu is a sheet over the page with a backdrop;
//   - picking a page goes there AND closes the menu; tapping beside it closes it;
//   - settings opens downward, on screen;
//   - the page never scrolls sideways.
// And at 1280px, that the rail is still the 48px rail down the left.
//
// Plain script: prints its checks, exits non-zero on failure. No framework.
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const results = []
const check = (name, cond, detail) => { results.push([name, cond]); console.log((cond ? '  ok   ' : '  FAIL ') + name + (!cond && detail ? ' — ' + detail : '')) }

const PAGES = ['Home', 'Tasks', 'Employees', 'Journey']
const user = { id: 1, name: 'Ada Admin', email: 'ada@example.com' }
const access = { menus: [...PAGES, 'Notifications'], menuItems: PAGES.map((name) => ({ name, label: name })) }

const server = await createServer({ configFile: root + 'vite.config.js', server: { port: 0, strictPort: false }, logLevel: 'error' })
await server.listen()
const url = server.resolvedUrls.local[0]
const browser = await chromium.launch()

async function open(width) {
  const phone = width < 700
  const page = await browser.newPage({ viewport: { width, height: 800 }, isMobile: phone, hasTouch: phone })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript((s) => {
    localStorage.setItem('accessToken', 'dev-token')
    localStorage.setItem('refreshToken', 'dev-refresh')
    localStorage.setItem('user', JSON.stringify(s.user))
    localStorage.setItem('access', JSON.stringify(s.access))
  }, { user, access })
  await page.route('**/auth/api/me', (r) => r.fulfill({ json: { user, access } }))
  await page.goto(url + 'home', { waitUntil: 'networkidle' })
  return { page, errors }
}

const box = (page, sel) => page.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right } }).catch(() => null)
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

try {
  for (const width of [360, 390, 430]) {
    console.log(`\n${width}px`)
    const { page, errors } = await open(width)
    check('no script errors', errors.length === 0, errors.join('; '))
    check('page does not scroll sideways', await noSideways(page))

    // ── closed: a bar across the top ─────────────────────────────────────
    const bar = await box(page, '.xeplr-nav-drawer')
    check('closed: the drawer is a bar across the top', bar && bar.top === 0 && Math.abs(bar.width - width) < 1 && bar.height <= 60, JSON.stringify(bar))
    const links = await page.$$eval('.xeplr-nav-drawer-link', (els) => els.filter((el) => el.getBoundingClientRect().height > 0).length)
    check('closed: no menu items on the bar', links === 0, String(links))
    const heading = await box(page, '.dev-main h1')
    check('closed: the page starts below the bar', heading && heading.top >= bar.bottom, JSON.stringify(heading))
    const targets = await page.$$eval('.xeplr-nav-drawer-toggle, .xeplr-nav-drawer .xeplr-nav-bell, .xeplr-nav-drawer .xeplr-nav-settings-trigger',
      (els) => els.map((el) => { const r = el.getBoundingClientRect(); return { h: r.height, right: r.right } }))
    check('closed: menu, notifications and settings are 44px targets', targets.length === 3 && targets.every((t) => t.h >= 44), JSON.stringify(targets))
    check('closed: all three are on screen', targets.every((t) => t.right <= width))

    // ── settings opens down, on screen ───────────────────────────────────
    await page.getByRole('button', { name: 'Settings' }).click()
    const menu = await box(page, '.xeplr-nav-account-menu')
    check('settings: opens below the bar, on screen', menu && menu.top >= bar.bottom && menu.bottom <= 800 && menu.left >= 0 && menu.right <= width, JSON.stringify(menu))
    await page.getByRole('button', { name: 'Settings' }).click()

    // ── open: a sheet over the page ──────────────────────────────────────
    await page.getByRole('button', { name: 'Expand menu' }).click()
    const sheet = await box(page, '.xeplr-nav-drawer')
    check('open: the menu is a sheet down the left', sheet && sheet.left === 0 && sheet.top === 0 && sheet.height >= 799 && sheet.width <= width * 0.86 && sheet.width >= 240, JSON.stringify(sheet))
    check('open: a backdrop covers the rest', Boolean(await box(page, '.xeplr-nav-drawer-backdrop')))
    const items = await page.$$eval('.xeplr-nav-drawer-link', (els) => els.map((el) => el.getBoundingClientRect().height))
    check('open: every page is listed, 44px tall', items.length === PAGES.length && items.every((h) => h >= 44), items.join(','))

    // ── going somewhere closes it ────────────────────────────────────────
    await page.locator('.xeplr-nav-drawer-link', { hasText: 'Tasks' }).click()
    await page.waitForURL('**/tasks')
    await page.waitForFunction(() => document.querySelector('.dev-main h1')?.textContent === 'Tasks', null, { timeout: 3000 }).catch(() => {})
    check('picking a page goes there', (await page.textContent('.dev-main h1')) === 'Tasks')
    check('picking a page closes the menu', (await page.$('.xeplr-nav-drawer-expanded')) === null && (await page.$('.xeplr-nav-drawer-backdrop')) === null)

    // ── tapping beside it closes it ──────────────────────────────────────
    await page.getByRole('button', { name: 'Expand menu' }).click()
    await page.mouse.click(width - 10, 400)
    check('tapping beside the menu closes it', (await page.$('.xeplr-nav-drawer-expanded')) === null)
    await page.close()
  }

  // ── a desktop, unchanged ─────────────────────────────────────────────────
  console.log('\n1280px')
  {
    const { page } = await open(1280)
    const rail = await box(page, '.xeplr-nav-drawer')
    check('desktop: the rail is 48px down the left, full height', rail && rail.left === 0 && rail.width === 48 && rail.height >= 799, JSON.stringify(rail))
    const links = await page.$$eval('.xeplr-nav-drawer-link', (els) => els.filter((el) => el.getBoundingClientRect().height > 0).length)
    check('desktop: the rail shows every page', links === PAGES.length, String(links))
    check('desktop: no menu button', (await box(page, '.xeplr-nav-drawer-burger'))?.width === 0)
    await page.close()
  }
} finally {
  await browser.close()
  await server.close()
}

const failed = results.filter(([, ok]) => !ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
