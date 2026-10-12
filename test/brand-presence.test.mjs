import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const bytes = async (path) => (await stat(new URL(path, root))).size;

/**
 * Two things a customer uses to recognise the shop: the logos of the places
 * they can reach it, and the icon it leaves on their phone. Both were wrong in
 * ways nobody would report as a bug — three grey outlines that could have been
 * any site, and a home-screen icon that was a screenshot of the header.
 */

test('the social links carry the real marks, not tinted outlines', async () => {
  const marks = await read('src/components/BrandIcons.jsx');

  // The brand colours, exactly. These are the point of the component: an icon
  // that inherits currentColor is not a logo.
  assert.match(marks, /#25D366/, 'WhatsApp green');
  assert.match(marks, /#1877F2/, 'Facebook blue');
  assert.match(marks, /#FFDD55/, 'Instagram gradient starts warm');
  assert.match(marks, /#C837AB/, 'Instagram gradient ends magenta');
  // Checked against the markup only — the file's own comment explains why it
  // avoids currentColor, and that sentence is not a stroke colour.
  const markup = marks.slice(marks.indexOf('const box ='));
  assert.doesNotMatch(markup, /currentColor/, 'a brand mark must not take the theme colour');

  // Instagram's gradient is referenced by id. Two copies on one page with the
  // same id means the second one paints with the first one's fill, so the ids
  // have to be generated per instance.
  assert.match(marks, /useId\(\)/);
  assert.match(marks, /ig-warm-\$\{id\}/);

  // Every place that links out uses them, and the old outlines are gone.
  for (const file of ['src/components/Header.jsx', 'src/components/Footer.jsx']) {
    const source = await read(file);
    assert.match(source, /FacebookMark, InstagramMark, WhatsappMark/, `${file} imports the marks`);
  }
  const icons = await read('src/components/Icons.jsx');
  for (const dead of ['Instagram', 'Facebook', 'Whatsapp']) {
    assert.doesNotMatch(icons, new RegExp(`export const ${dead} =`), `${dead} outline should be gone`);
  }
});

test('the drawer offers every way of reaching the shop', async () => {
  const header = await read('src/components/Header.jsx');
  const strings = await read('src/i18n/strings.js');

  assert.match(header, /className="mobile-nav__contact"/);
  // All three socials plus a number that dials.
  assert.match(header, /mobile-nav__socials[\s\S]{0,1600}WhatsappMark/);
  assert.match(header, /mobile-nav__socials[\s\S]{0,1600}InstagramMark/);
  assert.match(header, /mobile-nav__socials[\s\S]{0,1600}FacebookMark/);
  assert.match(header, /href=\{`tel:\$\{STORE_CONTACT\.phone\}`\}[\s\S]{0,400}mobile-nav__call|mobile-nav__call[\s\S]{0,200}href=\{`tel:/);

  // Both languages, because the drawer is where the language switch lives.
  assert.match(strings, /contactUs: 'للتواصل معنا'/);
  assert.match(strings, /contactUs: 'Contact us'/);
  assert.match(strings, /callStore: 'اتصل بنا'/);
  assert.match(strings, /callStore: 'Call us'/);

  // It sits at the foot of a drawer that can now overflow a short screen.
  const css = await read('src/styles/global.css');
  assert.match(css, /\.mobile-nav__contact \{[\s\S]{0,120}margin-top: auto;/);
  assert.match(css, /\.mobile-nav \{[\s\S]{0,400}overflow-y: auto;/);
});

test('adding the store to a phone gives it the shop logo', async () => {
  const html = await read('index.html');
  const manifest = JSON.parse(await read('public/manifest.webmanifest'));

  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest" \/>/);
  // iOS reads this link and ignores the manifest's icons entirely, so losing
  // it means iPhone users go back to a screenshot of the page.
  assert.match(html, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png" \/>/);
  assert.match(html, /apple-mobile-web-app-title" content="عراقي ستور"/);

  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  // A name that fits under a home-screen icon rather than being cut in half.
  assert.ok(manifest.short_name.length <= 14, 'short_name has to fit under an icon');

  // Android wants a 192 and a 512 to install at all, and a maskable one so the
  // launcher does not paste the square onto its own shape.
  const byPurpose = Object.fromEntries(manifest.icons.map((i) => [`${i.sizes} ${i.purpose}`, i.src]));
  assert.ok(byPurpose['192x192 any'], 'needs a 192 icon');
  assert.ok(byPurpose['512x512 any'], 'needs a 512 icon');
  assert.ok(byPurpose['512x512 maskable'], 'needs a maskable icon');

  // The files exist and are real images, not empty placeholders.
  for (const icon of manifest.icons) {
    assert.ok(await bytes(`public${icon.src}`) > 2000, `${icon.src} is missing or empty`);
  }
  assert.ok(await bytes('public/apple-touch-icon.png') > 2000);
});
