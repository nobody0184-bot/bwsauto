# BWS Automation - Automated Browsing System

A backend-only automated browsing system using Node.js and Playwright that simulates realistic human browsing behavior using SOCKS5 proxies and browser fingerprints.

## Features

- 🌐 **SOCKS5 Proxy Support** - Route traffic through SOCKS5 proxies with authentication
- 🎭 **Browser Fingerprinting** - Rotate user-agents and browser profiles
- 🖱️ **Realistic Human Behavior** - Natural mouse movements using Bezier curves
- 📜 **Smart Scrolling** - Partial, variable-depth page scrolling
- 🎯 **CTA Detection** - Detect and interact with buttons and links
- 📊 **Detailed Logging** - JSON session logs and summary reports
- ⚡ **Anti-Detection** - Built-in evasion techniques

## Project Structure

```
bwsAutomotion/
├── run.js                      # Main entry point
├── package.json                # Dependencies
├── data/                       # Input and state files
│   ├── links.txt              # Target URLs
│   ├── ip.txt                 # SOCKS5 proxies
│   ├── fp.txt                 # Fingerprints/user-agents
│   ├── done_ip.txt            # Used proxies (auto-generated)
│   ├── done_fp.txt            # Used fingerprints (auto-generated)
│   └── invalid_ip.txt         # Failed proxies (auto-generated)
├── logs/                       # Output logs
│   ├── sessions/              # Individual session logs
│   └── summary_report.json    # Final summary
└── src/
    ├── config/
    │   └── index.js           # Configuration settings
    ├── managers/
    │   ├── fileManager.js     # File operations
    │   ├── proxyManager.js    # Proxy handling
    │   └── fingerprintManager.js  # Fingerprint handling
    ├── behavior/
    │   ├── humanBehavior.js   # Mouse/scroll simulation
    │   └── ctaDetector.js     # CTA detection
    ├── session/
    │   └── browserSession.js  # Browser session management
    └── utils/
        ├── logger.js          # Logging utilities
        └── testProxy.js       # Proxy test utility
```

## Installation

1. **Clone or copy the project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

## Configuration

### Input Files (in `./data/`)

#### `links.txt` - Target URLs
```
https://example.com
https://example.org/page1
https://example.org/page2
```

#### `ip.txt` - SOCKS5 Proxies
```
# Format: host:port:username:password
192.168.1.100:1080:user:password

# Or without auth: host:port
proxy.example.com:1080
```

#### `fp.txt` - Browser Fingerprints
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
```

### Settings (in `./src/config/index.js`)

Key configurable options:

| Setting | Description | Default |
|---------|-------------|---------|
| `session.maxSessions` | Max sessions (0=unlimited) | 0 |
| `session.urlsPerSession.min/max` | URLs per session | 3-8 |
| `browser.headless` | Run without UI | false |
| `behavior.idleTime.min/max` | Idle time per page (ms) | 5000-11000 |
| `behavior.ctaInteraction.clickProbability` | Click probability | 0.3 |

## Usage

### Basic Run
```bash
node run.js
```

### With Options
```bash
# Reset state and start fresh
node run.js --reset

# Run specific number of sessions
node run.js --sessions 5

# Run in headless mode
node run.js --headless

# Combine options
node run.js --reset --sessions 10 --headless
```

### Test a Proxy
```bash
node src/utils/testProxy.js 192.168.1.100:1080:user:password
```

### Show Help
```bash
node run.js --help
```

## How It Works

### Session Flow

1. **Resource Selection**
   - Randomly select an unused IP from `ip.txt`
   - Randomly select an unused fingerprint from `fp.txt`

2. **Proxy Validation**
   - Test SOCKS5 connectivity
   - If fails: move to `invalid_ip.txt`, try another

3. **Browser Launch**
   - Configure Playwright with proxy and fingerprint
   - Inject anti-detection scripts
   - Enable JavaScript, cookies, localStorage

4. **Page Browsing** (for each of 3-8 random URLs)
   - Navigate and wait for load
   - Idle for 5-11 seconds
   - Perform realistic mouse movements
   - Scroll partially (20-80% depth)
   - Detect CTAs (buttons, links)
   - Optionally hover/click CTAs
   - Browse for 3-8 more seconds

5. **Session Cleanup**
   - Close browser
   - Move IP → `done_ip.txt`
   - Move fingerprint → `done_fp.txt`
   - Log session details

6. **Cooldown**
   - Wait 5-15 seconds before next session

### Human Behavior Simulation

- **Mouse Movement**: Uses cubic Bezier curves with random control points, easing functions, and micro-jitter for natural trajectories
- **Scrolling**: Variable scroll amounts, occasional scroll-back, smooth animation
- **Timing**: Bell-curve distribution for delays, avoiding bot-like patterns
- **Reading**: Simulated pause patterns with occasional mouse drift

## Output

### Session Logs (`./logs/sessions/session_*.json`)
```json
{
  "sessionId": "session_lx5k2m_abc123",
  "startTime": "2024-01-15T10:30:00.000Z",
  "config": {
    "proxy": { "host": "192.168.1.100", "port": 1080 },
    "fingerprint": { "browser": "Chrome", "os": "Windows" }
  },
  "pages": [
    {
      "url": "https://example.com",
      "loadTime": 1234,
      "timeSpent": 8500,
      "scrollStats": { "depthPercentage": 45 },
      "ctaStats": { "total": 5, "aboveFold": 3 },
      "interaction": { "hovered": true, "clicked": false }
    }
  ],
  "status": "completed",
  "duration": 45000
}
```

### Summary Report (`./logs/summary_report.json`)
```json
{
  "summary": {
    "totalSessions": 10,
    "successfulSessions": 9,
    "failedSessions": 1,
    "totalPagesVisited": 52,
    "invalidIpCount": 2
  },
  "pageStatistics": {
    "averageLoadTime": "1250ms",
    "averageTimePerPage": "8.5s",
    "averageScrollDepth": "48%"
  },
  "ctaStatistics": {
    "totalDetected": 156,
    "totalClicked": 12,
    "clickRate": "23%"
  }
}
```

## Stop Conditions

The automation will stop when:
- No unused valid IPs remain
- No unused fingerprints remain
- Session limit reached (if specified)
- Manual interrupt (Ctrl+C)

## Error Handling

- **Proxy failures**: Automatically retries with new proxy
- **Navigation failures**: Logs error, continues to next URL
- **Browser crashes**: Closes session, marks as failed, continues
- **Graceful shutdown**: Ctrl+C saves current state and summary

## Requirements

- Node.js 18.0.0 or higher
- Windows/macOS/Linux
- Valid SOCKS5 proxies
- Target URLs to visit

## License

MIT

## Disclaimer

This tool is for educational and legitimate automation purposes only. Ensure you have permission to automate browsing on target websites and comply with their Terms of Service.
