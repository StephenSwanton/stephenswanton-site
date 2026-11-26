import os,re
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def form(fn):
    s=open(f'_forms/{fn}').read()
    s=re.sub(r'<!--.*?-->\n','',s)
    h=re.search(r'data-height="(\d+)"',s).group(1)
    return s.replace('height:100%',f'height:{h}px')
NAV=[('/','Home'),('/listings','Search Listings'),('/listings#rentals','Rentals'),('/buy','Buy'),('/sell','Sell'),('/blog','Blog'),('/contact','Contact')]
def page(slug,title,desc,body,active=None,script='',index=True,canon=True):
    nav=''.join(f'<li><a href="{h}"{" aria-current=\"page\"" if t==active else ""}>{t}</a></li>' for h,t in NAV)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
{f'<link rel="canonical" href="https://stephenswanton.realtor/{slug}">' if canon else ''}
{'' if index else '<meta name="robots" content="noindex">'}
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" href="/favicon.png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<header class="site"><div class="wrap">
  <div class="logo-zone"><a href="/"><img src="/cb-logo-white.png" alt="Coldwell Banker St. Croix Realty"></a></div>
  <nav class="main" aria-label="Main"><ul>{nav}</ul></nav>
</div></header>
{body}
<footer class="site"><div class="wrap">
  <div class="row"><div>Stephen Swanton, REALTOR&reg; | Coldwell Banker St. Croix Realty | 5030 Anchor Way STE 12, Christiansted, VI 00820 | <a href="tel:+13402774771">(340) 277-4771</a></div>
  <div><a href="/privacy">Privacy Policy</a> &nbsp;|&nbsp; <a href="/terms">Terms</a> &nbsp;|&nbsp; Equal Housing Opportunity</div></div>
  <p>&copy;2026 Coldwell Banker. All Rights Reserved. Coldwell Banker and the Coldwell Banker logos are trademarks of Coldwell Banker Real Estate LLC. The Coldwell Banker&reg; System is comprised of company owned offices which are owned by a subsidiary of Anywhere Advisors LLC and franchised offices which are independently owned and operated. The Coldwell Banker System fully supports the principles of the Fair Housing Act and the Equal Opportunity Act.</p>
</div></footer>
{script}
</body>
</html>
'''
JS='<script src="/assets/listings.js"></script>'
pages={}
pages['listings']=page('listings','St. Croix Homes, Land and Condos for Sale | Stephen Swanton','Search every St. Croix, USVI home, condo, land and commercial listing on the MLS, updated throughout the day, with Stephen Swanton of Coldwell Banker St. Croix Realty.',f'''
<div class="page-head"><div class="wrap"><div class="eyebrow">St. Croix MLS search</div><h1>St.&nbsp;Croix property for sale and rent</h1><p>Every St. Croix listing on the MLS, updated throughout the day. Stephen can show you any property here, whichever brokerage has it listed.</p></div></div>
<main>
<section class="block" id="featured-block"><div class="wrap">
  <h2>Stephen's listings</h2><p class="sub">Properties Stephen currently represents on St.&nbsp;Croix.</p>
  <div class="lgrid" id="featured"></div>
</div></section>
<section class="block" style="padding-top:0"><div class="wrap">
  <h2>Search St.&nbsp;Croix</h2><p class="sub">Filter by property type, price and bedrooms.</p>
  <div class="tabs" role="tablist"><button role="tab" data-mode="sale" aria-selected="true">For sale</button><button role="tab" data-mode="rent" aria-selected="false">Long-term rentals</button></div>
  <form class="filters" id="filters" onsubmit="return false">
    <label>Property type<select name="type"><option value="">All types</option><option value="A1">Homes</option><option value="B1">Condos</option><option value="C1">Land</option><option value="D1">Commercial</option></select></label>
    <label>Min price<select name="min"><option value="">No min</option><option>1000</option><option>100000</option><option>250000</option><option>500000</option><option>750000</option><option>1000000</option><option>2000000</option></select></label>
    <label>Max price<select name="max"><option value="">No max</option><option>2000</option><option>3000</option><option>5000</option><option>250000</option><option>500000</option><option>750000</option><option>1000000</option><option>2000000</option><option>5000000</option></select></label>
    <label>Bedrooms<select name="beds"><option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option><option value="5">5+</option></select></label>
    <label>Sort<select name="sort"><option value="newest">Newest</option><option value="price-desc">Price, high to low</option><option value="price-asc">Price, low to high</option></select></label>
  </form>
  <div class="count" id="count"></div>
  <div class="lgrid" id="results"></div>
  <div class="more" id="more" hidden><button class="btn btn-outline" type="button">Show more</button></div>
  <div class="disclaimer" id="disclaimer"></div>
</div></section>
</main>''','Search Listings',JS+'<script>SSListings.featured(document.getElementById("featured"),12);SSListings.search();</script>')
pages['listing']=page('listing','St. Croix Listing | Stephen Swanton','St. Croix, USVI property details from the MLS, presented by Stephen Swanton, Coldwell Banker St. Croix Realty.','<main><section class="block"><div class="wrap" id="listing"><div class="gallery"><div class="main"></div></div></div></section></main>',None,JS+'<script>SSListings.detail();</script>',canon=False)
def formpage(slug,title,desc,eyebrow,h1,lead,fn,active):
    return page(slug,title,desc,f'''
<div class="page-head"><div class="wrap"><div class="eyebrow">{eyebrow}</div><h1>{h1}</h1><p>{lead}</p></div></div>
<main><section class="block"><div class="wrap" style="max-width:860px">
{form(fn)}
<p class="sub" style="margin-top:18px">Prefer to talk? Call or text Stephen at <a href="tel:+13402774771">(340) 277-4771</a>.</p>
</div></section></main>''',active)
pages['buy']=formpage('buy','Buy a Home or Land on St. Croix | Stephen Swanton','Tell Stephen Swanton what you are looking for on St. Croix, USVI: homes, condos, land, waterfront and commercial property.','Buying on St. Croix','Tell me what you are looking for','Share what matters to you, from property type and areas of the island to price range and timing, and Stephen will follow up personally within one business day.','buyer-inquiry.html','Buy')
pages['sell']=formpage('sell','Sell Your St. Croix Property | Stephen Swanton','Thinking of selling a home, condo, land or commercial property on St. Croix, USVI? Request a consultation with Stephen Swanton, Coldwell Banker St. Croix Realty.','Selling on St. Croix','Thinking about selling?','Tell Stephen about your property and your timing. He will prepare a pricing review based on current St.&nbsp;Croix market data and follow up personally within one business day.','seller-inquiry.html','Sell')
pages['contact']=formpage('contact','Contact Stephen Swanton | St. Croix Real Estate','Contact Stephen Swanton, REALTOR, Coldwell Banker St. Croix Realty, 5030 Anchor Way STE 12, Christiansted, VI. Call or text (340) 277-4771.','Contact','Let\'s talk','Questions about St.&nbsp;Croix real estate, a listing, or property management? Send a note and Stephen will reply within one business day.','contact.html','Contact')
for k,v in list(pages.items()):
    v=re.sub(r'<option>(\d+)</option>',lambda m:f'<option value="{m.group(1)}">${int(m.group(1)):,}</option>',v)
    pages[k]=v
for k,v in pages.items():
    v=re.sub(r'\n\n+','\n',v)
    open(f'{k}.html','w').write(v)
print(list(pages))
