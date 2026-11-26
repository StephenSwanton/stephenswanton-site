"""Build /blog and /blog/<slug> pages from posts/*.html. Run: python3 tools/blog.py"""
import os, re, json, glob, datetime, html
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
import importlib.util
spec = importlib.util.spec_from_file_location('pages', 'tools/pages.py'); pages = importlib.util.module_from_spec(spec); spec.loader.exec_module(pages)

STYLE = '''<style>
.post{max-width:760px}.post h2{font-size:1.45rem;color:var(--cb-blue);margin:30px 0 8px;font-weight:400}
.post p{font-weight:300;margin-bottom:14px}.post .note{font-size:.8rem;color:var(--smoky);margin-top:30px}
.post .btn{margin:6px 8px 6px 0}.byline{display:flex;gap:14px;align-items:center;margin:4px 0 26px;color:var(--ink-soft);font-size:.92rem}
.byline img{width:48px;height:48px;border-radius:50%;object-fit:cover;object-position:top}
.posts{display:grid;gap:22px;max-width:860px}.posts a{display:block;padding:22px;border:1px solid var(--glacier);border-top:3px solid var(--cb-blue);text-decoration:none;color:inherit}
.posts a:hover{box-shadow:0 8px 22px rgba(10,23,48,.12)}.posts h2{font-size:1.4rem;color:var(--cb-blue);margin:6px 0}.posts p{font-weight:300;color:var(--ink-soft)}
.meta{font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--celestial)}
</style>'''

posts = []
for f in sorted(glob.glob('posts/*.html')):
    raw = open(f).read()
    meta = json.loads(re.match(r'<!--(.*?)-->', raw, re.S).group(1))
    meta['slug'] = os.path.basename(f)[:-5]
    meta['body'] = raw.split('-->', 1)[1].strip()
    posts.append(meta)
posts.sort(key=lambda p: p['date'], reverse=True)
nice = lambda d: datetime.date.fromisoformat(d).strftime('%B %-d, %Y')

os.makedirs('blog', exist_ok=True)
for p in posts:
    ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p['title'], "description": p['description'],
          "datePublished": p['date'], "dateModified": p.get('updated', p['date']),
          "url": f"https://stephenswanton.realtor/blog/{p['slug']}", "image": "https://stephenswanton.realtor/headshot.png",
          "author": {"@type": "Person", "name": "Stephen Swanton", "url": "https://stephenswanton.realtor/",
                     "jobTitle": "REALTOR", "worksFor": {"@type": "RealEstateAgent", "name": "Coldwell Banker St. Croix Realty"}},
          "publisher": {"@type": "Person", "name": "Stephen Swanton"}}
    body = f'''{STYLE}
<script type="application/ld+json">{json.dumps(ld)}</script>
<div class="page-head"><div class="wrap"><div class="eyebrow">{html.escape(p['tag'])}</div><h1>{html.escape(p['title'])}</h1></div></div>
<main><section class="block"><div class="wrap post">
<div class="byline"><img src="/headshot.png" alt="Stephen Swanton"><div>By <a href="/">Stephen Swanton</a>, REALTOR&reg;, Coldwell Banker St.&nbsp;Croix Realty<br>{nice(p['date'])}</div></div>
{p['body']}
<p style="margin-top:34px"><a href="/blog">&larr; All posts</a></p>
</div></section></main>'''
    out = pages.page(f"blog/{p['slug']}", f"{p['title']} | Stephen Swanton", p['description'], body, 'Blog')
    out = out.replace('href="/assets', 'href="/assets').replace('src="/cb-logo', 'src="/cb-logo')
    open(f"blog/{p['slug']}.html", 'w').write(re.sub(r'\n\n+', '\n', out))

items = ''.join(f'''<a href="/blog/{p['slug']}"><div class="meta">{html.escape(p['tag'])} &middot; {nice(p['date'])}</div><h2>{html.escape(p['title'])}</h2><p>{html.escape(p['description'])}</p></a>''' for p in posts)
body = f'''{STYLE}
<div class="page-head"><div class="wrap"><div class="eyebrow">Stephen's blog</div><h1>St.&nbsp;Croix real estate and island life</h1><p>Monthly market updates from the MLS, guides for buyers and sellers, and what is happening around St.&nbsp;Croix, from Stephen Swanton, REALTOR&reg;.</p></div></div>
<main><section class="block"><div class="wrap"><div class="posts">{items}</div></div></section></main>'''
open('blog.html', 'w').write(re.sub(r'\n\n+', '\n', pages.page('blog', 'Blog: St. Croix Real Estate and Island Life | Stephen Swanton', 'St. Croix, USVI real estate market updates, buyer and seller guides, and island events from Stephen Swanton, Coldwell Banker St. Croix Realty.', body, 'Blog')))

urls = ['', 'listings', 'buy', 'sell', 'contact', 'blog'] + [f"blog/{p['slug']}" for p in posts] + ['privacy', 'terms']
today = datetime.date.today().isoformat()
open('sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>https://stephenswanton.realtor/{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n')
print('built', [p['slug'] for p in posts])
