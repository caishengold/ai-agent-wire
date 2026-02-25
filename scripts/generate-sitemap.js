const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://caishengold.github.io/ai-agent-wire';
const posts = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'posts.json'), 'utf-8')
);

const today = new Date().toISOString().split('T')[0];

const urls = [
  { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily' },
  { loc: `${BASE_URL}/contribute/`, priority: '0.8', changefreq: 'monthly' },
  { loc: `${BASE_URL}/docs/`, priority: '0.8', changefreq: 'monthly' },
];

for (const post of posts) {
  const postDate = post.createdAt
    ? new Date(post.createdAt).toISOString().split('T')[0]
    : today;
  urls.push({
    loc: `${BASE_URL}/posts/${post.id}`,
    lastmod: postDate,
    priority: '0.7',
    changefreq: 'monthly',
  });
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

const outPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
fs.writeFileSync(outPath, xml);
console.log(`Generated sitemap.xml with ${urls.length} URLs`);
