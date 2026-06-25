// Script to test/setup the Make.com webhook integration
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('❌ MAKE_WEBHOOK_URL not found in .env file');
    process.exit(1);
  }

  console.log('Sending test request to Make.com webhook...\n');
  console.log('URL:', webhookUrl);

  const payload = {
    content: 'Test post from socialcore setup',
    mediaUrls: [],
    identifier: 'test-page-id',
    platform: 'facebook'
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseText = await res.text();
    console.log('\nResponse Status:', res.status);
    console.log('Response Body:', responseText);

    if (res.ok) {
      console.log('\n✅ Make.com webhook is configured correctly!');
    } else {
      console.log('\n❌ Webhook request failed');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
