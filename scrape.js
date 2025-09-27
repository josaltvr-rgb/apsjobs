import { chromium } from 'playwright';
import fs from 'fs';

const SEARCH = 'https://www.apsjobs.gov.au/s/job-search';

const txt = async (page, sel) =>
  (await page.locator(sel).first().innerText().catch(()=> '')||'').trim();

const after = async (page, label) => {
  const xp = `//*[normalize-space()="${label}"]/following::*[self::span or self::div][1]`;
  return (await page.locator(`xpath=${xp}`).first().innerText().catch(()=> '')||'').trim();
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();

  await p.goto(SEARCH, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);

  const links = new Set(
    await p.$$eval('a[href*="/s/job-details?Id="]', as => as.map(a => a.href))
  );

  const rows = [];
  for (const url of links) {
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);

    rows.push({
      title: await txt(p, 'h1, h2'),
      agency: await after(p, 'Department / Agency') || await after(p, 'Agency'),
      level:  await after(p, 'APS Classification') || await after(p, 'Classification'),
      salary: await after(p, 'Salary'),
      location: await after(p, 'Location'),
      status: await after(p, 'Employment Status') || await after(p, 'Work Type'),
      closing_date: await after(p, 'Closing Date') || await after(p, 'Application Closing Date'),
      url
    });
  }

  const headers = ['title','agency','level','salary','location','status','closing_date','url'];
  const csv = [headers.join(','), ...rows.map(r =>
    headers.map(h => `"${(r[h]||'').replace(/"/g,'""')}"`).join(',')
  )].join('\n');

  fs.writeFileSync('apsjobs.csv', csv);
  await b.close();
})();
