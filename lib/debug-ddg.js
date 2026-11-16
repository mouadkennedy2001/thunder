const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

(async () => {
  const q = 'privacy tools';
  
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
  
  // Try POST fallback
  console.log('\n--- POST request ---');
  res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 
      'User-Agent': UA, 
      Referer: 'https://duckduckgo.com/',
      'Content-Type': 'application/x-www-form-urlencoded' 
    },
    body: 'q=' + encodeURIComponent(q) + '&kp=-2&kl=wt-wt',
    signal: AbortSignal.timeout(9000)
  });
  console.log('POST status:', res.status);
  html = await res.text();
  console.log('POST length:', html.length);
  console.log('has result__a:', html.includes('result__a'));
  // check for links
  const links = html.match(/href="([^"]+)"/g) || [];
  console.log('links:', links.slice(0, 10));
})().catch(e=>console.error(e));