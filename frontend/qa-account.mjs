// Logs in as the admin user, opens the Account page, screenshots it.
export default async function run(page, ui) {
  // Seed a logged-in admin user into localStorage, matching what the app expects.
  await page.evaluate(() => {
    localStorage.setItem('cbt_user', JSON.stringify({
      user_id: 1,
      username: 'Admin',
      email: 'emmanuellilypondu33@gmail.com',
      profile_image: '',
    }))
  })

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem('cbt_user', JSON.stringify({
      user_id: 1,
      username: 'Admin',
      email: 'emmanuellilypondu33@gmail.com',
      profile_image: '',
    }))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  await page.evaluate(() => {
    const findAndClick = (text) => {
      const els = [...document.querySelectorAll('button, a, [role=button]')]
      const el = els.find(e => e.textContent.trim().toLowerCase().includes(text))
      if (el) el.click()
      return !!el
    }
    findAndClick('get started') || findAndClick('account')
  })
  await page.waitForTimeout(1000)

  // Try to reach the account page directly through the app's nav
  const snap = await ui.snapshot({ full: true })
  await page.screenshot({ path: 'account-page.png', fullPage: true })
  return { snapshot: snap }
}
