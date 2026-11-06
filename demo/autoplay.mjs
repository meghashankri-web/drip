// Self-driving Drip demo. Opens a visible Chrome window and clicks through the whole story,
// paced to DEMO_SCRIPT.md. Start your screen recording (⌘⇧5), then run:  npm run demo
// Set HEADLESS=1 to dry-run without a window.
import puppeteer from 'puppeteer-core'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const BASE = 'http://localhost:5173'
const PHOTO = path.join(here, 'sample-photo.png')
const RESUME = path.join(here, '..', 'samples', 'resumes', 'nadia-farouk-resume.pdf')
const headless = process.env.HEADLESS === '1'
const SPEED = Number(process.env.SPEED ?? 1) // >1 = faster pauses

const pause = (ms) => new Promise((r) => setTimeout(r, ms / SPEED))
const log = (s) => console.log(`[demo] ${s}`)

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless,
  defaultViewport: null,
  args: ['--window-size=1280,900', '--window-position=60,40', '--no-first-run', '--no-default-browser-check'],
  userDataDir: path.join(here, '.chrome-demo-profile'),
})
const [page] = await browser.pages()
if (headless) await page.setViewport({ width: 1280, height: 900 })

async function clickText(label, scope = 'button, a, [role="menuitem"]') {
  const want = label.toLowerCase()
  for (const el of await page.$$(scope)) {
    const t = (await el.evaluate((x) => x.innerText.trim().toLowerCase())) || ''
    if (t === want || t.startsWith(want)) {
      const inMenu = await el.evaluate((x) => x.getAttribute('role') === 'menuitem')
      await el.evaluate((x, inMenu) => x.scrollIntoView({ block: inMenu ? 'nearest' : 'center', behavior: inMenu ? 'auto' : 'smooth' }), inMenu)
      await pause(inMenu ? 600 : 400)
      if (inMenu) await el.evaluate((x) => x.click()) // menus scroll internally; click the element itself
      else await el.click()
      return
    }
  }
  throw new Error(`Couldn't find "${label}"`)
}
async function type(sel, text, delay = 35) {
  await page.$eval(sel, (e) => e.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  await pause(250)
  await page.click(sel)
  await page.type(sel, text, { delay: delay / SPEED })
}
async function scrollTo(sel) {
  await page.$eval(sel, (e) => e.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  await pause(700)
}
const scrollTop = () => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))

try {
  // ---- 1–2. Inspiration & purpose: welcome screen
  await page.goto(BASE + '/feed')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.goto(BASE + '/feed', { waitUntil: 'networkidle0' })
  log('Welcome screen (inspiration + purpose)')
  await pause(40000)

  // ---- 3. Sign up
  await clickText('sign up')
  await pause(1500)
  await (await page.$('input[data-testid="photo-input"]')).uploadFile(PHOTO)
  await type('input[autocomplete="given-name"]', 'Nadia')
  await type('input[autocomplete="family-name"]', 'Farouk')
  await type('input[autocomplete="email"]', 'nadia.farouk@example.com', 25)
  await type('input[autocomplete="new-password"]', 'coffee-chats', 25)
  await type('input[autocomplete="postal-code"]', '94720', 80)
  await page.click('[role="combobox"]'); await pause(500)
  await page.$eval('li[data-value="1988"]', (li) => li.scrollIntoView({ block: 'center' })); await pause(300)
  await page.click('li[data-value="1988"]'); await pause(400)
  await type('input[placeholder^="e.g. Indian"]', 'Egyptian American')
  for (const l of await page.$$('label')) {
    const t = await l.evaluate((x) => x.innerText)
    if (t.includes('18 years or older') || t.includes('identify as a woman')) { await l.click(); await pause(400) }
  }
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled, { timeout: 10000 })
  await pause(1200)
  await clickText('next')
  log('Resume upload')
  await pause(1500)
  await (await page.$('input[data-testid="resume-input"]')).uploadFile(RESUME)
  await page.waitForFunction(() => document.body.innerText.includes('Analyzed by Claude'), { timeout: 90000 })
  await pause(2500)
  await scrollTo('[role="group"][aria-label="Experience tags"]')
  await pause(6000)
  await clickText('next')

  log('Interests')
  await page.waitForSelector('[role="group"][aria-label="Suggested interests"] .MuiChip-root', { timeout: 40000 })
  await pause(2500)
  const sugg = await page.$$eval('[role="group"][aria-label="Suggested interests"] .MuiChip-label', (els) => els.map((e) => e.textContent))
  for (const s of sugg.slice(0, 3)) { await page.click(`[aria-label="Add ${s}"]`); await pause(900) }
  await page.click(`[aria-label="Move ${sugg[2]} up"]`); await pause(900)
  await page.click(`[aria-label="Move ${sugg[1]} up"]`); await pause(2500)
  await clickText('next')

  log('Personality')
  await pause(1000)
  await type('[placeholder^="e.g. Pottery"]', 'Pottery, hiking, and trying every coffee shop in Oakland')
  await type('[placeholder^="e.g. Ask the question"]', 'You don’t need permission to change careers.')
  await type('[placeholder^="e.g. Dolores"]', 'My grandmother, a pharmacist in Cairo')
  await type('[placeholder^="e.g. Switching careers"]', 'Moving from pharmacy into product management')
  await page.click('button[aria-label="Either"]'); await pause(600)
  await page.focus('input[aria-label="Coffee chats per month"]')
  await page.keyboard.press('ArrowRight'); await pause(300); await page.keyboard.press('ArrowRight'); await pause(1200)
  await clickText('next')
  await pause(1500)
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }))
  await pause(3000)
  await clickText('create account')
  await page.waitForFunction(() => location.pathname === '/profile', { timeout: 15000 })
  log('Profile created')
  await pause(5000)

  // ---- 4. Feed & matching
  await clickText('feed', 'nav[aria-label="Main"] button')
  await page.waitForSelector('[data-testid="feed-card"]', { timeout: 15000 })
  log('Feed')
  await pause(9000)
  const top = await page.$('[data-testid="feed-card"]')
  const topName = await top.$eval('a[href^="/profile/"]', (a) => a.innerText.trim())
  const topFirst = topName.split(' ')[0]
  await page.click('[data-testid="feed-card"] [aria-label^="Ask"]')
  log(`Request to ${topName}`)
  await page.waitForSelector('[data-testid="insight-source"]', { timeout: 45000 })
  await pause(12000)
  await type('textarea[aria-label="Message"]', `Hi ${topFirst}! I'd love to hear how you got started. Coffee soon?`.slice(0, 100), 30)
  for (const slot of ['Sat Morning', 'Wed Lunch', 'Thu Evening']) { await page.click(`button[aria-label="${slot}"]`); await pause(500) }
  await pause(1500)
  await clickText('send')
  await pause(4000)

  // ---- 5. Connecting: switch to her
  log(`Switching to ${topName}`)
  await page.click('button[aria-label="Switch demo profile"]'); await pause(1500)
  await clickText(topName, '[role="menuitem"]')
  await pause(1500)
  await clickText('messages', 'nav[aria-label="Main"] button')
  await page.waitForSelector('[data-testid="message"]', { timeout: 15000 })
  await pause(7000)
  await clickText('accept')
  await pause(1200)
  await page.$eval('input[aria-label="Date and time"]', (el) => {
    const d = new Date(Date.now() + 3 * 24 * 3600 * 1000); d.setHours(10, 0, 0, 0)
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, local)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await pause(1000)
  await type('input[aria-label="Location"]', 'Blue Bottle Coffee, Oakland')
  await pause(1000)
  await clickText('confirm')
  await page.waitForSelector('[data-testid="gcal-link"]', { timeout: 10000 })
  await scrollTo('[data-testid="gcal-link"]')
  await page.hover('[data-testid="gcal-link"]')
  await pause(6000)

  // ---- back to Nadia
  log('Switching back to Nadia')
  await scrollTop(); await pause(600)
  await page.click('button[aria-label="Switch demo profile"]'); await pause(1500)
  await clickText('nadia farouk', '[role="menuitem"]')
  await pause(1500)
  await clickText('messages', 'nav[aria-label="Main"] button')
  await page.waitForSelector('[data-testid="gcal-link"]', { timeout: 15000 })
  await pause(6000)

  // ---- 6. Ripples
  log('Ripple')
  await clickText('demo: simulate meeting passed')
  await page.waitForSelector('[data-testid="prompt"]', { timeout: 15000 })
  await scrollTo('[data-testid="prompt"]')
  await pause(4000)
  const prompt = await page.$('[data-testid="prompt"]')
  for (const b of await prompt.$$('button')) if ((await b.evaluate((x) => x.innerText.trim().toLowerCase())) === 'yes') { await b.click(); break }
  await page.waitForSelector('[data-testid="ripple-made"]', { timeout: 10000 })
  await pause(4000)
  await (await page.$('input[data-testid="post-photo"]')).uploadFile(PHOTO)
  await pause(1000)
  await type('textarea[aria-label="Kind words"]', `${topFirst} showed me exactly how she got started. I left with a plan and a new mentor! ☕`, 25)
  await pause(1000)
  await clickText('post')
  await pause(2500)
  await clickText('profile', 'nav[aria-label="Main"] button')
  await pause(5000)
  await clickText('posts')
  await pause(1500)
  await scrollTo('[data-testid="posts-list"]')
  log('Close')
  await pause(15000)
  await scrollTop()
  await pause(3000)
  log('Done — stop your recording (⌘⌃Esc).')
} catch (e) {
  console.error('[demo] stopped:', e instanceof Error ? e.message : e)
  if (process.env.DEBUG_SHOT) await page.screenshot({ path: process.env.DEBUG_SHOT }).catch(() => {})
  process.exitCode = 1
} finally {
  if (!headless) await pause(4000)
  await browser.close()
}
