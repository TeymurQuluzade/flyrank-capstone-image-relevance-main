const { execSync } = require('child_process');
console.log('Waiting 300 seconds (5 min) for rate limit reset...');
setTimeout(() => {
  console.log('Running batch processor...');
  execSync('npx ts-node src/jobs/processBatch.ts', { cwd: __dirname + '/..', stdio: 'inherit' });
}, 300000);
