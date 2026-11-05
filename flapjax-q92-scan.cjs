#!/usr/bin/env node
/* FlapJax Q92 reproduction: FLAPJAX transfers out of treasury during 2026-11-04 COT.
   Usage: node flapjax-q92-scan.cjs [rpcUrl]
   Day = 2026-11-04 05:00:00Z .. 2026-11-05 04:59:59Z (COT = UTC-5). */
const { execFileSync } = require('child_process');
const fs = require('fs');
const TOKEN = '0x90c8889f428F9Ebb77BB8f15CAD3a50a9aC680df';
const TREASURY = '0x7C34E9e21eE28A49Ff0b84B61774119E6633359f';
const TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const START = 131565092, END = 131757034;
const rpc = process.argv[2] || 'https://bsc-rpc.publicnode.com';
function call(method, params) {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
  const out = execFileSync('curl', ['-sS', '--max-time', '30', '-X', 'POST', rpc,
    '-H', 'content-type: application/json', '--data', body], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const j = JSON.parse(out);
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result;
}
(async () => {
  let all = [];
  for (let a = START; a <= END; a += 10000) {
    const b = Math.min(a + 9999, END);
    const logs = call('eth_getLogs', [{ address: TOKEN, fromBlock: '0x' + a.toString(16),
      toBlock: '0x' + b.toString(16),
      topics: [TOPIC, '0x' + TREASURY.toLowerCase().replace(/^0x/, '').padStart(64, '0')] }]);
    all = all.concat(logs);
  }
  const transfers = all.map(l => ({
    tx: l.transactionHash, block: parseInt(l.blockNumber, 16),
    to: '0x' + l.topics[2].slice(-40), wei: BigInt(l.data).toString(),
  }));
  const total = transfers.reduce((s, t) => s + BigInt(t.wei), 0n);
  console.log(JSON.stringify({ rpc, start: START, end: END, count: transfers.length,
    distinctRecipients: new Set(transfers.map(t => t.to)).size,
    totalWei: total.toString(), totalFlapjax: (total / 10n ** 18n).toString(), transfers }, null, 1));
})();
