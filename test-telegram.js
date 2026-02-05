/**
 * Test Telegram Notification
 * Quick test to verify Telegram bot is configured correctly
 */

// Load environment variables
require('dotenv').config();

const telegramNotifier = require('./src/utils/telegramNotifier');

async function testNotification() {
    console.log('🧪 Testing Telegram notification...\n');
    
    console.log('📋 Configuration:');
    console.log(`   Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? '✓ Configured' : '✗ Missing'}`);
    console.log(`   Chat ID: ${process.env.TELEGRAM_CHAT_ID ? '✓ Configured' : '✗ Missing'}`);
    
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
        console.log('\n❌ Please configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env file');
        process.exit(1);
    }
    
    console.log('\n📤 Sending test notification...');
    
    // Test with sample data
    const testStats = {
        availableIps: 150,
        availableFingerprints: 45,
        totalUrls: 100,
        usedIps: 10,
        usedFingerprints: 5,
        invalidIps: 2
    };
    
    const success = await telegramNotifier.notifyResourcesExhausted(testStats, 'ips_exhausted');
    
    if (success) {
        console.log('\n✅ Test notification sent successfully!');
        console.log('   Check your Telegram to see the message.');
    } else {
        console.log('\n❌ Failed to send notification.');
        console.log('   Please check your bot token and chat ID.');
    }
}

testNotification();
