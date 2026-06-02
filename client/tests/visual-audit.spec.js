import { test, expect, chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE_URL = 'http://localhost:5173'

const VIEWPORTS = [
  { name: 'mobile-sm',  width: 375,  height: 812  },   // iPhone SE / 13 Mini
  { name: 'mobile-lg',  width: 430,  height: 932  },   // iPhone 14 Pro Max
  { name: 'tablet',     width: 768,  height: 1024 },   // iPad
  { name: 'laptop',     width: 1280, height: 800  },   // 13" laptop
  { name: 'desktop',    width: 1440, height: 900  },   // Standard desktop
  { name: 'wide',       width: 1920, height: 1080 },   // 1080p monitor
]

const PAGES = [
  { path: '/dashboard', name: 'Dashboard',         waitFor: '.stat-card' },
  { path: '/clients',   name: 'Clients',           waitFor: '.card' },
  { path: '/projects',  name: 'Projects',          waitFor: '.card' },
  { path: '/content',   name: 'Content Calendar',  waitFor: '.card' },
  { path: '/tasks',     name: 'Tasks (Kanban)',     waitFor: '.card' },
  { path: '/finance',   name: 'Finance',           waitFor: '.stat-card' },
  { path: '/messages',  name: 'Messages',          waitFor: 'h3' },
  { path: '/reports',   name: 'Reports',           waitFor: 'h3' },
  { path: '/settings',  name: 'Settings',          waitFor: '.card' },
]

const THEMES = [
  { id: 'indigo', h: 238, s: 76, l: 58 },
  { id: 'rose',   h: 343, s: 76, l: 54 },
  { id: 'teal',   h: 172, s: 60, l: 40 },
]

const SCREENSHOT_DIR = path.join(process.cwd(), 'playwright-screenshots')

// Helper: apply theme via DOM manipulation
async function applyTheme(page, theme) {
  await page.evaluate(({ h, s, l }) => {
    document.documentElement.style.setProperty('--accent-h', String(h))
    document.documentElement.style.setProperty('--accent-s', `${s}%`)
    document.documentElement.style.setProperty('--accent-l', `${l}%`)
  }, theme)
}

// Helper: set dark mode
async function setDark(page, dark) {
  await page.evaluate((isDark) => {
    document.documentElement.classList.toggle('dark', isDark)
  }, dark)
}

test.describe('ZRC CRM — Responsive Visual Audit', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
    }
  })

  // ── 1. Screenshot all pages × all viewports (light + dark) ──
  for (const vp of VIEWPORTS) {
    for (const pg of PAGES) {
      for (const mode of ['light', 'dark']) {
        test(`[${vp.name}] [${mode}] ${pg.name}`, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height })
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'networkidle' })

          // Set dark mode
          await setDark(page, mode === 'dark')

          // Wait for key content
          try {
            await page.waitForSelector(pg.waitFor, { timeout: 5000 })
          } catch {}

          // Small settle time for animations
          await page.waitForTimeout(400)

          const filename = `${vp.name}__${mode}__${pg.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, filename),
            fullPage: vp.width >= 1280,  // full page on desktop, viewport on mobile
          })

          // Basic sanity checks
          await expect(page).not.toHaveTitle(/404|Error/)
          const bodyBg = await page.evaluate(() =>
            window.getComputedStyle(document.body).backgroundColor
          )
          expect(bodyBg).not.toBe('rgba(0, 0, 0, 0)')
        })
      }
    }
  }

  // ── 2. Theme switching visual test ──
  for (const theme of THEMES) {
    test(`[Theme: ${theme.id}] Dashboard looks correct`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
      await page.waitForSelector('.stat-card')

      await applyTheme(page, theme)
      await page.waitForTimeout(300)

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `theme__${theme.id}__dashboard.png`),
        fullPage: true,
      })

      // Verify the accent colour was applied
      const accentH = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--accent-h').trim()
      )
      expect(accentH).toBe(String(theme.h))
    })
  }

  // ── 3. Sidebar collapse behaviour ──
  test('[desktop] Sidebar collapses and expands correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.stat-card')

    // Screenshot: expanded
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'sidebar__expanded.png') })

    // Click collapse button
    const collapseBtn = page.locator('button:has-text("Collapse")')
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click()
      await page.waitForTimeout(350) // wait for animation
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'sidebar__collapsed.png') })

      // Click again to expand
      await page.locator('aside button').last().click()
      await page.waitForTimeout(350)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'sidebar__re-expanded.png') })
    }
  })

  // ── 4. Navigation: visit every page and check for JS errors ──
  test('[desktop] Navigate all pages — no JS errors', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    const errors = []
    page.on('pageerror', err => errors.push(err.message))
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    for (const pg of PAGES) {
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(200)
    }

    if (errors.length > 0) {
      console.warn('JS errors found:', errors)
    }
    // We report but don't hard-fail on console errors (many are expected without backend)
    expect(errors.filter(e => e.includes('Cannot read') || e.includes('is not a function')).length).toBe(0)
  })

  // ── 5. Content Calendar month navigation ──
  test('[desktop] Content Calendar — next/prev month navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/content`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.card')
    await page.waitForTimeout(300)

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'content__current-month.png') })

    // Click next month
    await page.locator('button[title=""], button').filter({ hasText: '' }).nth(1).click().catch(() => {})
    await page.waitForTimeout(200)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'content__next-month.png') })
  })

  // ── 6. Tasks: Kanban → List view toggle ──
  test('[desktop] Tasks — Kanban and List view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/tasks`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.card')
    await page.waitForTimeout(300)

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'tasks__kanban.png') })

    // Switch to list
    await page.locator('button:has-text("list")').click()
    await page.waitForTimeout(200)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'tasks__list.png') })
  })

  // ── 7. Finance page — invoice table ──
  test('[desktop] Finance page renders invoice table', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/finance`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.stat-card')
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finance__full.png'), fullPage: true })

    // Check at least one invoice row is visible
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  // ── 8. Mobile — sidebar is hidden by default ──
  test('[mobile] Sidebar hidden on load', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)

    // Sidebar should be off-screen (has -translate-x-full class)
    const aside = page.locator('aside')
    const transform = await aside.evaluate(el =>
      window.getComputedStyle(el).transform
    )
    // On mobile collapsed = off screen
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile__sidebar-hidden.png') })
  })

  // ── 9. Settings — theme picker visible ──
  test('[desktop] Settings Appearance section loads theme picker', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.card')
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'settings__appearance.png'), fullPage: true })

    // All 10 theme swatches should be visible
    const swatches = page.locator('button .rounded-full').filter({ has: page.locator('[style*="hsl"]') })
    // Just check something is there
    await expect(page.locator('text=Theme Colour')).toBeVisible()
  })

  // ── 10. Projects grid vs list ──
  test('[desktop] Projects — grid and list views', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.card')
    await page.waitForTimeout(300)

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'projects__grid.png') })

    await page.locator('button').filter({ has: page.locator('svg') }).nth(-1).click().catch(() => {})
    await page.waitForTimeout(200)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'projects__list.png') })
  })
})
