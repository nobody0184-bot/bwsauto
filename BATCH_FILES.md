# BWS Automation - Batch Files

Quick launch scripts for different automation scenarios:

## 📱 Basic Modes

- **start-visible.bat** - Run with visible browser (watch on screen)
- **start-headless.bat** - Run with headless browser (screen off, faster)

## 🔄 Parallel Sessions

- **start-parallel-5.bat** - Run 5 browsers in parallel (visible)
- **start-parallel-10.bat** - Run 10 browsers in parallel (visible)
- **start-parallel-50.bat** - Run 50 browsers in parallel (headless)
- **start-parallel-100.bat** - Run 100 browsers in parallel (headless)

## 🔄 Reset & Start

- **start-reset.bat** - Reset all state files and start
- **start-reset-parallel-10.bat** - Reset state and run 10 parallel browsers

## 🧪 Testing

- **test-telegram.bat** - Test Telegram notification

## Usage

Just double-click any `.bat` file to launch!

### System Requirements for Parallel Sessions:

- **5-10 parallel**: 8GB+ RAM recommended
- **50 parallel**: 16GB+ RAM recommended
- **100 parallel**: 32GB+ RAM recommended
- Use `--headless` for better performance with many parallel sessions

## Custom Commands

To create your own custom command, copy any `.bat` file and modify the `node run.js` line with your desired options:

```bat
node run.js --parallel 20 --headless
```

Available options:
- `--parallel N` - Run N browsers simultaneously
- `--headless` - Hide browser windows
- `--visible` - Show browser windows (default)
- `--reset` - Reset state files before starting
- `--help` - Show all options
