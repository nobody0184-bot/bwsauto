/**
 * BWS Automation - Main Entry Point
 * 
 * Automated browsing system using Playwright
 * Simulates realistic human browsing behavior with SOCKS5 proxies and fingerprints
 * 
 * Usage: node run.js [options]
 * 
 * Options:
 *   --reset      Reset all state files (done_ip.txt, done_fp.txt, invalid_ip.txt)
 *   --sessions   Maximum number of sessions to run (default: unlimited)
 *   --visible    Run browser in visible mode (watch live on screen) [DEFAULT]
 *   --headless   Run browser in headless mode (no window, faster)
 *   --help       Show help
 */

// Load environment variables
require('dotenv').config();

const config = require('./src/config');
const fileManager = require('./src/managers/fileManager');
const proxyManager = require('./src/managers/proxyManager');
const fingerprintManager = require('./src/managers/fingerprintManager');
const BrowserSession = require('./src/session/browserSession');
const logger = require('./src/utils/logger');
const telegramNotifier = require('./src/utils/telegramNotifier');

/**
 * Parse command line arguments
 * @returns {object} Parsed arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        reset: false,
        headless: false,  // Default: visible mode (live screen)
        noProxy: false,   // Skip proxy, run directly
        parallel: 1,      // Number of parallel browsers
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--reset':
                options.reset = true;
                break;
            case '--parallel':
            case '-p':
                options.parallel = parseInt(args[++i], 10) || 1;
                break;
            case '--headless':
            case '--hidden':
            case '-h':
                if (args[i] === '-h' && (args[i+1] === undefined || args[i+1].startsWith('-'))) {
                    // -h alone means help
                    options.help = true;
                } else if (args[i] !== '-h') {
                    options.headless = true;
                }
                break;
            case '--visible':
            case '--live':
            case '--show':
                options.headless = false;
                break;
            case '--no-proxy':
            case '--noproxy':
            case '--direct':
                options.noProxy = true;
                break;
            case '--help':
                options.help = true;
                break;
        }
    }

    return options;
}

/**
 * Display help message
 */
function showHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              BWS AUTOMATION - BROWSING SYSTEM                ║
╚══════════════════════════════════════════════════════════════╝

Usage: node run.js [options]

Options:
  --visible      Run browser in VISIBLE mode - live on screen [DEFAULT]
  --headless     Run browser in HEADLESS mode - no window, faster
  --no-proxy     Skip proxy and use direct connection (for testing)
  --parallel N   Run N browsers in parallel (default: 1)
  --reset        Reset all state files and start fresh
  --help         Show this help message

Required Files in ./data/:
  - links.txt   Target URLs (one per line)
  - ip.txt      SOCKS5 proxies (host:port:username:password)
  - fp.txt      User-agent fingerprints (one per line)

Examples:
  node run.js                          Run with VISIBLE browser (default)
  node run.js --parallel 3             Run 3 browsers simultaneously
  node run.js --parallel 5 --sessions 20   Run 20 sessions with 5 parallel browsers
  node run.js --parallel 2 --no-proxy  Run 2 browsers without proxy
  node run.js --reset --parallel 3     Reset and run 3 parallel browsers
  node run.js --headless --parallel 4  Run 4 headless browsers
`);
}

/**
 * Random number helper
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep helper
 * @param {number} ms - Milliseconds to sleep
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get random subset of URLs
 * @param {string[]} urls - All available URLs
 * @returns {string[]} Random subset
 */
function getRandomUrls(urls) {
    const count = random(config.session.urlsPerSession.min, config.session.urlsPerSession.max);
    const shuffled = [...urls].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, urls.length));
}

/**
 * Run a single browser session
 * @param {number} sessionNum - Session number
 * @param {object} options - Runtime options
 * @param {string[]} allUrls - All available URLs
 * @returns {Promise<object>} Session result
 */
async function runSingleSession(sessionNum, options, allUrls) {
    console.log(`\n📌 SESSION ${sessionNum}`);
    
    const browserSession = new BrowserSession();
    let sessionStatus = 'failed';

    try {
        // Check resource availability
        const stats = await fileManager.getResourceStats();
        console.log(`   Resources: ${stats.availableIps} IPs, ${stats.availableFingerprints} fingerprints`);

        // Get valid proxy (or skip if --no-proxy)
        let proxy = null;
        
        if (options.noProxy) {
            console.log('   🔓 Running without proxy (direct connection)...');
        } else {
            console.log('   🔍 Obtaining valid proxy...');
            proxy = await proxyManager.getValidProxy();
            
            if (!proxy) {
                console.log('   ❌ Could not obtain valid proxy');
                const stats = await fileManager.getResourceStats();
                await telegramNotifier.notifySessionError('proxy_error', 'Could not obtain valid proxy. All proxies may be invalid or in use.', stats);
                return { success: false, status: 'no_proxy' };
            }
        }

        // Get fingerprint
        console.log('   🎭 Selecting fingerprint...');
        const fingerprint = await fingerprintManager.getRandomFingerprint();
        
        if (!fingerprint) {
            console.log('   ❌ No fingerprints available');
            return { success: false, status: 'no_fingerprint' };
        }

        // Select random URLs for this session
        const sessionUrls = getRandomUrls(allUrls);
        console.log(`   🔗 Selected ${sessionUrls.length} URLs for this session`);

        // Launch browser
        console.log('   🌐 Launching browser...');
        const launched = await browserSession.launch(proxy, fingerprint);

        if (!launched) {
            console.log('   ❌ Browser launch failed');
            // Unlock and mark proxy as invalid since it failed during launch
            if (!options.noProxy && proxy) {
                await proxyManager.markCurrentProxyInvalid();
            }
            await fingerprintManager.markCurrentFingerprintDone();
            
            const stats = await fileManager.getResourceStats();
            await telegramNotifier.notifySessionError('launch_failed', 'Browser failed to launch. Possible proxy or browser configuration issue.', stats);
            return { success: false, status: 'launch_failed' };
        }

        // Run session
        console.log('   ▶️  Running session...');
        const result = await browserSession.runSession(sessionUrls);
        
        sessionStatus = result.status;
        console.log(`   📊 Visited ${result.successful}/${result.visited} pages successfully`);
        console.log(`   ⏱️  Duration: ${Math.round(result.duration / 1000)}s`);

        // Close browser
        await browserSession.close();

        // End session logging
        const sessionLog = logger.endSession(sessionStatus);

        // Save session log
        if (sessionLog) {
            await fileManager.saveSessionLog(sessionLog.sessionId, sessionLog);
        }

        // Mark resources as used
        if (!options.noProxy && proxy) {
            await proxyManager.markCurrentProxyDone();
        }
        await fingerprintManager.markCurrentFingerprintDone();

        console.log(`   ✅ Session ${sessionStatus}`);
        
        return { success: true, status: sessionStatus, result };

    } catch (error) {
        logger.logError('Session error', error);
        console.log(`   ❌ Session error: ${error.message}`);
        
        // Ensure browser is closed
        await browserSession.close();
        
        // Unlock proxy so other sessions can try it
        if (!options.noProxy && proxy) {
            proxyManager.unlockProxy(proxy.raw);
        }
        
        // Send error notification
        const stats = await fileManager.getResourceStats();
        await telegramNotifier.notifySessionError('unknown_error', error.message, stats);
        
        return { success: false, status: 'error', error: error.message };
    }
}

/**
 * Run multiple sessions in parallel
 * @param {number} count - Number of parallel sessions
 * @param {object} options - Runtime options
 * @param {string[]} allUrls - All available URLs
 * @returns {Promise<Array>} Array of session results
 */
async function runParallelSessions(count, options, allUrls) {
    console.log(`\n🚀 Starting ${count} parallel browser sessions...\n`);
    
    const sessionPromises = [];
    
    for (let i = 1; i <= count; i++) {
        // Add random delay before starting each session (2-8 seconds)
        const delay = random(2000, 8000);
        console.log(`⏱️  Session ${i} will start in ${(delay / 1000).toFixed(1)}s...`);
        
        const sessionPromise = (async (sessionNum) => {
            await sleep(delay);
            return await runSingleSession(sessionNum, options, allUrls);
        })(i);
        
        sessionPromises.push(sessionPromise);
    }
    
    // Wait for all sessions to complete
    console.log(`\n⏳ Waiting for all ${count} sessions to complete...\n`);
    console.log('─'.repeat(60));
    
    const results = await Promise.all(sessionPromises);
    
    console.log('─'.repeat(60));
    console.log(`\n✅ Batch of ${count} sessions completed\n`);
    
    return results;
}

/**
 * Main automation orchestrator
 */
async function main() {
    const options = parseArgs();

    // Show help if requested
    if (options.help) {
        showHelp();
        process.exit(0);
    }

    // Apply runtime options to config
    config.browser.headless = options.headless;

    // Display mode indicator
    const modeText = options.headless 
        ? '🔇 HEADLESS MODE (no browser window)'
        : '🖥️  VISIBLE MODE (live browser on screen)';

    const parallelText = options.parallel > 1 
        ? `║  🔄 PARALLEL: ${options.parallel} browsers simultaneously`.padEnd(65) + '║'
        : '';

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              BWS AUTOMATION - STARTING                       ║
╠══════════════════════════════════════════════════════════════╣
║  ${modeText.padEnd(58)}║
${parallelText}
╚══════════════════════════════════════════════════════════════╝
`);

    try {
        // Initialize file manager
        await fileManager.initialize();

        // Reset state if requested
        if (options.reset) {
            console.log('🔄 Resetting state files...');
            await fileManager.resetState();
        }

        // Validate input files (just warn, don't exit)
        const validation = await fileManager.validateInputFiles();
        if (!validation.valid) {
            console.warn('\n⚠️  Input file validation warning:');
            validation.errors.forEach(err => console.warn(`   - ${err}`));
            console.log('\n📋 System will wait for resources to become available...');
            
            // Send Telegram notification about validation failure
            const stats = await fileManager.getResourceStats();
            const errorMessage = validation.errors.join('\n');
            await telegramNotifier.notifyProcessStopped(`Waiting for resources:\n${errorMessage}`, {
                totalSessions: 0,
                successfulSessions: 0,
                failedSessions: 0,
                availableIps: stats.availableIps,
                availableFingerprints: stats.availableFingerprints
            });
        }

        // Get initial resource stats
        let stats = await fileManager.getResourceStats();
        console.log('\n📊 Initial Resource Status:');
        console.log(`   URLs available:        ${stats.totalUrls}`);
        console.log(`   IPs available:         ${stats.availableIps}`);
        console.log(`   Fingerprints available: ${stats.availableFingerprints}`);
        console.log(`   Used IPs:              ${stats.usedIps}`);
console.log(`   Used fingerprints:     ${stats.usedFingerprints}`);
console.log(`   Invalid IPs:           ${stats.invalidIps}`);

// Get all URLs
        const allUrls = await fileManager.getUrls();

        // Main session loop
        let totalSessionsRun = 0;
        let successfulSessions = 0;
        let failedSessions = 0;

        console.log('\n🚀 Starting automation loop...\n');
        console.log('─'.repeat(60));

        let notificationSent = false;
        
        while (true) {
            // Check resource availability
            stats = await fileManager.getResourceStats();
            
            // In no-proxy mode, only check fingerprints
            const canContinue = options.noProxy 
                ? stats.availableFingerprints > 0 && stats.totalUrls > 0
                : stats.canContinue;
            
            if (!canContinue) {
                // Determine what resource is exhausted
                let reason = '';
                if (!options.noProxy && stats.availableIps === 0 && stats.availableFingerprints === 0) {
                    console.log('\n🔴 Both IPs and Fingerprints exhausted. Waiting...');
                    reason = 'both_exhausted';
                } else if (!options.noProxy && stats.availableIps === 0) {
                    console.log('\n🔴 No more available IPs. Waiting...');
                    reason = 'ips_exhausted';
                } else if (stats.availableFingerprints === 0) {
                    console.log('\n🔴 No more available Fingerprints. Waiting...');
                    reason = 'fingerprints_exhausted';
                }
                
                // Send Telegram notification only once
                if (!notificationSent) {
                    console.log('\n📱 Sending Telegram notification...');
                    await telegramNotifier.notifyResourcesExhausted(stats, reason);
                    notificationSent = true;
                }
                
                // Wait 30 seconds and retry
                console.log('\n⏳ Waiting 30 seconds before checking again...');
                await sleep(30000);
                continue;
            }
            
            // Reset notification flag when resources become available again
            notificationSent = false;

            // Calculate how many sessions to run in this batch
            const batchSize = Math.min(
                options.parallel,
                options.noProxy ? stats.availableFingerprints : Math.min(stats.availableIps, stats.availableFingerprints)
            );

            if (batchSize <= 0) {
                console.log('\n⚠️  Insufficient resources for next batch. Waiting...');
                await sleep(30000);
                continue;
            }

            console.log(`\n📦 BATCH: Running ${batchSize} parallel browser(s)...`);

            // Run parallel sessions
            const results = await runParallelSessions(batchSize, options, allUrls);

            // Update statistics
            results.forEach(result => {
                totalSessionsRun++;
                if (result.success) {
                    successfulSessions++;
                } else {
                    failedSessions++;
                }
            });

            console.log(`\n📊 Progress: ${totalSessionsRun} total | ${successfulSessions} success | ${failedSessions} failed`);
            console.log('─'.repeat(60));

            // Cooldown between batches - always continue the loop
            const cooldown = random(5000, 12000);
            console.log(`\n⏸️  Cooldown: ${(cooldown / 1000).toFixed(1)}s before next batch...\n`);
            await sleep(cooldown);
        }

        // This code will never be reached since the loop is infinite
        // Generate and save summary report
        console.log('\n📝 Generating summary report...');
        const summaryReport = logger.generateSummaryReport();
        await fileManager.saveSummaryReport(summaryReport);

        // Print summary to console
        logger.printSummary();

        // Final resource status
        stats = await fileManager.getResourceStats();
        console.log('\n📊 Final Resource Status:');
        console.log(`   IPs remaining:          ${stats.availableIps}`);
        console.log(`   Fingerprints remaining: ${stats.availableFingerprints}`);
        console.log(`   Total IPs used:         ${stats.usedIps}`);
        console.log(`   Total invalid IPs:      ${stats.invalidIps}`);

        console.log('\n✨ Automation completed!\n');
        console.log(`   Session logs: ${config.paths.sessionLogs}`);
        console.log(`   Summary report: ${config.paths.summaryReport}`);

    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        console.error(error.stack);
        
        // Send notification about fatal error
        const stats = await fileManager.getResourceStats();
        await telegramNotifier.notifyProcessStopped(`Fatal Error: ${error.message}`, {
            totalSessions: totalSessionsRun || 0,
            successfulSessions: successfulSessions || 0,
            failedSessions: failedSessions || 0,
            availableIps: stats.availableIps,
            availableFingerprints: stats.availableFingerprints
        });
        
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Received interrupt signal. Shutting down gracefully...');
    
    // Save current state
    try {
        const summaryReport = logger.generateSummaryReport();
        await fileManager.saveSummaryReport(summaryReport);
        logger.printSummary();
        
        // Send notification about manual stop
        const stats = await fileManager.getResourceStats();
        await telegramNotifier.notifyProcessStopped('Manual stop by user (Ctrl+C)', {
            totalSessions: summaryReport.totalSessions || 0,
            successfulSessions: summaryReport.successfulSessions || 0,
            failedSessions: summaryReport.failedSessions || 0,
            availableIps: stats.availableIps,
            availableFingerprints: stats.availableFingerprints
        });
    } catch (e) {
        console.error('Error saving state:', e.message);
    }
    
    process.exit(0);
});

process.on('uncaughtException', async (error) => {
    console.error('\n💥 Uncaught exception:', error.message);
    console.error(error.stack);
    
    try {
        const stats = await fileManager.getResourceStats();
        await telegramNotifier.notifyProcessStopped(`Uncaught Exception: ${error.message}`, {
            totalSessions: 0,
            successfulSessions: 0,
            failedSessions: 0,
            availableIps: stats.availableIps,
            availableFingerprints: stats.availableFingerprints
        });
    } catch (e) {
        // Ignore notification errors in exception handler
    }
    
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('\n💥 Unhandled rejection at:', promise, 'reason:', reason);
    
    try {
        const stats = await fileManager.getResourceStats();
        await telegramNotifier.notifyProcessStopped(`Unhandled Promise Rejection: ${reason}`, {
            totalSessions: 0,
            successfulSessions: 0,
            failedSessions: 0,
            availableIps: stats.availableIps,
            availableFingerprints: stats.availableFingerprints
        });
    } catch (e) {
        // Ignore notification errors in exception handler
    }
    
    process.exit(1);
});

// Run main
main();
