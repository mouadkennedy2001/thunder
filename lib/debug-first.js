const e = require('../lib/engines.js');

(async () => {
  const q = 'privacy tools';
  const engines = e.CATALOG.web.filter(e => e.id !== 'ddg-ia');
  console.log('Engines for lucky:', engines.map(x => x.id));
  
  for (const eng of engines) {
    try {
      const results = await eng.fn(q, {safe:true, t:'wt-wt', lang:'en'});
      console.log(eng.id, '→', results.length, 'results');
      if (results[0]) {
        console.log('  first:', results[0].url);
      }
    } catch(err) {
      console.log(eng.id, '→ ERROR:', err.message);
    }
  }
})();