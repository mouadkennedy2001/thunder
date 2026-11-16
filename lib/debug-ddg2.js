const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

(async () => {
  const q = 'fresh query test ' + Date.now();
  
  // Try GET first
  console.log('--- GET request ---');
  let res = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q) + '&kp=-2&kl=wt-wt', {
    headers: { 'User-Agent': UA, Referer: 'https://duckduckgo.com/' },
    signal: AbortSignal.timeout(9000)
  });
  console.log('GET status:', res.status);
  let html = await res.text();
  console.log('GET length:', html.length);
  console.log('has result__a:', html.includes('result__a'));
  
  // Check regex
  const re = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m, count = 0;
  while ((m = re.exec(html)) && count < 3) {
    console.log('match:', m[1].slice(0,60), m[2].slice(0,40));
    count++;
  }
  if (!count) console.log('NO MATCHES');
})().catch(e=>console.error(e));