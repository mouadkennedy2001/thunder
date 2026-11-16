// Test by accessing the CATALOG functions
const e = require('../lib/engines.js');

(async () => {
  const q = 'privacy tools';
  
  // Test ddgWeb directly via CATALOG
  const ddgWebFn = e.CATALOG.web.find(x => x.id === 'ddg').fn;
  try {
    const results = await ddgWebFn(q, {safe:true, t:'wt-wt'});
    console.log('ddgWeb via CATALOG →', results.length, 'results');
    if (results[0]) console.log('  first:', results[0].url);
  } catch(err) {
    console.log('ddgWeb via CATALOG → ERROR:', err.message);
  }
  
  // Test ddgLite directly via CATALOG
  const ddgLiteFn = e.CATALOG.web.find(x => x.id === 'ddg-lite').fn;
  try {
    const results = await ddgLiteFn(q, {safe:true, t:'wt-wt'});
    console.log('ddgLite via CATALOG →', results.length, 'results');
    if (results[0]) console.log('  first:', results[0].url);
  } catch(err) {
    console.log('ddgLite via CATALOG → ERROR:', err.message);
  }
})();