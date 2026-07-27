const http = require('http');

async function runLoadSimulation(concurrency = 20, totalRequests = 200) {
  console.log(`🚀 Starting k6 Load Simulation: ${concurrency} Virtual Users, ${totalRequests} Requests...`);
  
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  const latencies = [];

  const makeRequest = () => {
    return new Promise((resolve) => {
      const reqStart = Date.now();
      const postData = JSON.stringify({
        name: `Sim Student ${Math.floor(Math.random() * 10000)}`,
        phone: `+96650${Math.floor(1000000 + Math.random() * 9000000)}`,
        channel: 'web',
        grade: 'Grade 2',
        score: 85,
        status: 'new'
      });

      const options = {
        hostname: '127.0.0.1',
        port: 3001,
        path: '/api/leads',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        const duration = Date.now() - reqStart;
        latencies.push(duration);
        if (res.statusCode >= 200 && res.statusCode < 400) {
          successCount++;
        } else {
          failCount++;
        }
        res.resume();
        resolve();
      });

      req.on('error', () => {
        failCount++;
        resolve();
      });

      req.write(postData);
      req.end();
    });
  };

  const pool = [];
  for (let i = 0; i < totalRequests; i++) {
    pool.push(makeRequest);
  }

  // Run in concurrent chunks
  while (pool.length > 0) {
    const chunk = pool.splice(0, concurrency);
    await Promise.all(chunk.map(fn => fn()));
  }

  const totalTime = Date.now() - startTime;
  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1));

  console.log(`=================== k6 LOAD TEST RESULTS ===================`);
  console.log(`Total Requests Sent : ${totalRequests}`);
  console.log(`Successful Requests  : ${successCount}`);
  console.log(`Failed Requests      : ${failCount}`);
  console.log(`Average Latency      : ${avg} ms`);
  console.log(`p(95) Latency        : ${p95} ms`);
  console.log(`Total Duration       : ${totalTime} ms`);
  console.log(`Throughput (RPS)     : ${Math.round((totalRequests / (totalTime || 1)) * 1000)} req/sec`);
  console.log(`============================================================`);

  if (failCount > 0 || p95 > 500) {
    process.exit(1);
  }
}

if (require.main === module) {
  runLoadSimulation().catch(console.error);
}

module.exports = { runLoadSimulation };
