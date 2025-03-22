
const Apify = require('apify');
const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');

Apify.main(async () => {
    const input = await Apify.getInput();
    const { otpCode } = input;

    const browser = await Apify.launchPuppeteer({ headless: true });
    const page = await browser.newPage();

    // Go to login page
    await page.goto('https://www.ofbusiness.com/prices/mild-steel/hrc', { waitUntil: 'networkidle2' });

    // Click login button
    await page.click('button:has-text("Login")');

    // Wait for popup and input mobile (pre-filled)
    await page.waitForSelector('input[type="tel"]', { visible: true });

    // Enter OTP
    await page.type('input[type="tel"]', otpCode, { delay: 100 });

    // Submit OTP
    const submitBtn = await page.$('button:has-text("Verify OTP")');
    if (submitBtn) await submitBtn.click();

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    const scrapeFrom = async (url, category) => {
        await page.goto(url, { waitUntil: 'networkidle2' });

        const results = await page.evaluate(() => {
            const rows = [];
            const cards = document.querySelectorAll('[class*="styles__ProductInfo"]');

            cards.forEach(card => {
                const product = card.querySelector('[class*="ProductName"]')?.innerText || '';
                const dimension = card.querySelector('[class*="Dimension"]')?.innerText || '';
                const brand = card.querySelector('[class*="Brand"]')?.innerText || '';
                const location = card.querySelector('[class*="Location"]')?.innerText || '';
                const price = card.querySelector('[class*="Price"]')?.innerText || '';
                const updated = card.querySelector('[class*="Updated"]')?.innerText || '';
                rows.push({ product, dimension, brand, location, price, updated });
            });

            return rows;
        });

        return results.map(item => ({
            "Product name": item.product,
            "Dimension": item.dimension,
            "Brand": item.brand,
            "Location": item.location,
            "Price": item.price,
            "Last updated": item.updated,
            "Date": new Date().toISOString().split("T")[0],
            "Time": new Date().getHours() < 15 ? "Morning" : "Evening",
            "Category": category
        }));
    };

    const hrcData = await scrapeFrom('https://www.ofbusiness.com/prices/mild-steel/hrc', 'hrc');
    const tmtData = await scrapeFrom('https://www.ofbusiness.com/prices/mild-steel/primary-tmt', 'primary-tmt');

    const allData = [...hrcData, ...tmtData];

    // Append to Google Sheet (stubbed for now, see helper to integrate)
    console.log("Data ready to be pushed to Google Sheets:", allData);

    await browser.close();
});
