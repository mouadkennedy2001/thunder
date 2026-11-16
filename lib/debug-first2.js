const e = require('../lib/engines.js');

(async () => {
  const q = 'privacy tools';
  
  // Test ddgWeb directly
  try {
    const results = await e.ddgWeb(q, {safe:true, t:'wt-wt'});
    console.log('ddgWeb direct →', results.length, 'results');
    if (results[0]) console.log('  first:', results[0].url);
  } catch(err) {
    console.log('ddgWeb direct → ERROR:', err.message);
  }
  
  // Test ddgLite directly
  try {
    const results = await e.ddgLite(q, {safe:true, t:'wt-wt'});
    console.log('ddgLite direct →', results.length, 'results');
    if (results[0]) console.log('  first:', results[0].url);
  } catch(err) {
    console.log('ddgLite direct → ERROR:', err.message);
  }
})();