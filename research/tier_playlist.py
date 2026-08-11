import re,json,sys,urllib.request,urllib.parse,concurrent.futures as cf
sys.path.insert(0,'.')
from extract import get
UA={'User-Agent':'Mozilla/5.0'}
PL=re.compile(r'\b((?:PL|OLAK5uy_)[A-Za-z0-9_-]{10,40})\b')

def playlist_videos(pid):
    try:
        h=urllib.request.urlopen(urllib.request.Request(
            f"https://www.youtube.com/playlist?list={pid}",headers=UA),timeout=30).read().decode('utf-8','replace')
    except Exception: return []
    return list(dict.fromkeys(re.findall(r'"videoId":"([A-Za-z0-9_-]{11})"',h)))

def scan(site):
    html=get(site); blob=html
    base=re.match(r"https?://[^/]+",site).group(0)
    for a in re.findall(r'(?:src|href)="([^"]+\.js)"',html)[:10]:
        if a.startswith("http") and not a.startswith(base): continue
        blob+="\n"+get(urllib.parse.urljoin(site+"/",a))
    cands=[c for c in dict.fromkeys(PL.findall(blob)) if not re.fullmatch(r'[A-Z_0-9]+',c)]
    best=[]
    for c in cands[:6]:
        v=playlist_videos(c)
        if len(v)>=3: best.append((c,v))
    return best

sites=[l.strip() for l in open('sites.txt') if l.strip()]
tot=0; hits=[]
for s in sites:
    try: b=scan(s)
    except Exception: b=[]
    if b:
        n=sum(len(v) for _,v in b)
        tot+=n; hits.append((s,n,[p for p,_ in b]))
        print(f"  {s:46} PLAYLIST -> {n} videos {b[0][0]}")
print(f"\nplaylist-tier: {len(hits)}/{len(sites)} sites, {tot} videos")
json.dump({s:(n,p) for s,n,p in hits},open('playlist_tier.json','w'),indent=1)
