import puppeteer from 'puppeteer';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());

async function fetchRateMyProf(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const content = await page.content();
    await browser.close();
    return content;
}

app.get('/fetch', async (req, res) => {
    const { url } = req.query; // Extract URL from query parameters
    if (!url) {
        return res.status(400).send('URL parameter is required');
    }
    try {
        const content = await fetchRateMyProf(url);
        res.send(content);
    } catch (error) {
        console.error('Failed to fetch page:', error);
        res.status(500).send('Error fetching page');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// example use:
// http://localhost:3000/fetch?url=http://www.ratemyprofessors.com/search/professors/1072?q=denero