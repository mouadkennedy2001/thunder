const e = require('../lib/engines.js');

(async () => {
  for (const q of ['privacy tools', 'lofi study', 'green tea', 'javascript tutorial']) {
    const r = await e.firstResult(q, {safe:true, t:'wt-wt', lang:'en'}).catch(err=>({err:String(err)}));
    console.log(q, '→', r?.url?.slice(0,60) || r?.err || 'NULL');
  }
})();