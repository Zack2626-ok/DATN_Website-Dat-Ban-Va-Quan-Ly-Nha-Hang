const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', async (response) => {
    if (response.url().includes('/api/auth/login')) {
      console.log('Login API Response:', response.url(), response.status());
      try {
        console.log('Body:', await response.text());
      } catch (e) {
        console.log('Could not read body');
      }
    }
  });

  await page.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle2' });
  
  // Log env
  const apiUrl = await page.evaluate(() => {
    return window.__VITE_API_URL__ || "unknown"; // We can't access import.meta.env easily, let's just log what axios uses
  });
  
  await page.type('input[type="email"]', 'waiter1@gmail.com');
  await page.type('input[type="password"]', '123456');
  
  await page.click('button[type="submit"]');
  
  await new Promise(r => setTimeout(r, 3000));
  
  console.log("Current URL after click:", page.url());
  
  const errorText = await page.evaluate(() => {
    const p = document.querySelector('form p.text-red-400');
    return p ? p.textContent : null;
  });
  console.log("Error shown on UI:", errorText);
  
  await browser.close();
})();
