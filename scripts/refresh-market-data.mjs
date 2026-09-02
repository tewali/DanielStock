const appUrl = process.env.APP_URL;
const cronSecret = process.env.CRON_SECRET;

if (!appUrl || !cronSecret) {
  console.error('APP_URL and CRON_SECRET must be configured');
  process.exitCode = 1;
} else {
  const response = await fetch(`${appUrl.replace(/\/$/, '')}/api/cron/market-data`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cronSecret}` },
  });
  const body = await response.text();
  console.log(body);
  if (!response.ok) process.exitCode = 1;
}
