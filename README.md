# Ulimo Website

Our company website

---

## 🚀 Overview

---

## ✨ Features

---

## ⚙️ Installation

1. **Clone the repository:**
   ```bash
   https://github.com/ULimoDev/WebsiteDevelopment.git
   cd WebsiteDevelopment
   ```

2. **Install dependencies**
    a. Install Node.js
    visit and install https://nodejs.org/en

    b. Restart terminal

    c. Check for correct node version
    ```bash
    node -v
    npm -v
    ```
    You should have these versions or higher
    node: v22.16.0
    npm: 11.4.1

    d. Install Supabase
    https://supabase.com/docs/guides/local-development
    ```bash
    npm install supabase --save-dev
    npx supabase init
    npx supabase start
    ```

    e. Check for correct Supabase version
    ```bash
    supabase --version
    ```
    You should have this version or higher
    Supabase: 2.23.4


3 **Install The ULimo Website**
    ```bash
    npm install
    npm run dev
    ```

---

## 🛠️ Configuration

- **Seed accounts:**
  - Add initial seeds to `seeds.json` or use the provided scripts.
- **Settings:**
  - Edit `src/config/settings.json` to set follower limits, target locations, professions, and batch sizes.
- **Cookies:**
  - The tool manages `cookies.json` automatically after first login.

---

## 🚦 Usage

### Start Scraping
```bash
npm run start
```
- Authenticates, loads seeds, scrapes following lists, qualifies leads, and appends to Google Sheets.

**Alternative commands if you encounter Node.js compatibility issues:**
```bash
npm run start:tsx     # Uses tsx (recommended for Node.js v20+)
npm run start:alt     # Uses custom loader (fallback option)
```

### Add Manual Seeds
```bash
npm run add-seeds
```
- Adds a batch of manually verified seed accounts (edit `src/scripts/addManualSeeds.ts`).

### Add a Single Seed
```bash
npm run add-single-seed
```
- Adds a single seed (edit `src/scripts/addSingleSeed.ts`).

### Reset Seed Usage
```bash
npm run reset-seeds
```
- Resets all seed usage stats (does not delete seeds or checked accounts).

### Log Statistics
```bash
npm run stats
# Or if you encounter issues:
npm run stats:tsx
```
- Prints current seed, session, and storage stats.

### Test Profile Scraping
```bash
npm run debug-profile
```
- Debugs scraping for a set of test profiles.

### Test Lead Criteria
```bash
npm run test-criteria
```
- Tests your qualification logic on sample accounts.

### Test Discord Webhook
```bash
npm run test-discord
```
- Sends test notifications to your Discord webhook.

### Test Enhanced Detection
```bash
npm run test-detection
```
- Runs unit tests for the profession detection logic.

---

## 📋 Available Commands

| Command                | Description                                                      |
|------------------------|------------------------------------------------------------------|
| `npm start`            | Run the main scraper (full session)                              |
| `npm run start:tsx`    | Alternative start command using tsx (recommended for Node.js v20+) |
| `npm run start:alt`    | Alternative start command using custom loader                    |
| `npm run add-seeds`    | Add a batch of manual seeds (edit script to customize)           |
| `npm run add-single-seed` | Add a single manual seed (edit script to customize)           |
| `npm run reset-seeds`  | Reset all seed usage stats                                       |
| `npm run stats`        | Print statistics (seeds, session, storage)                       |
| `npm run stats:tsx`    | Alternative stats command using tsx                               |
| `npm run debug-profile`| Debug scraping for test profiles                                 |
| `npm run test-criteria`| Test lead qualification logic                                    |
| `npm run test-discord` | Test Discord webhook integration                                 |
| `npm run test-detection`| Test enhanced profession detection logic                        |

---

## 🏆 Best Practices

- **Use high-quality, relevant seed accounts** to maximize discovery.
- **Keep your `.env` and `service_account.json` secure**—never commit them to public repos.
- **Run during off-peak hours** to minimize detection and avoid rate limits.
- **Regularly update your seeds** with new, high-performing accounts.
- **Monitor Google Sheets and Discord notifications** for lead quality and errors.
- **Respect Instagram's terms of service** and use ethical scraping limits.
- **Test your settings and detection logic** with the provided scripts before running large sessions.

---

## 🔧 Troubleshooting

**Q: I'm getting Node.js module errors when running `npm start`**
A: Try the alternative commands:
- `npm run start:tsx` (recommended for Node.js v20+)
- `npm run start:alt` (uses custom loader)

**Q: How do I add new seed accounts?**
A: Use `npm run add-seeds` or `npm run add-single-seed` and edit the corresponding script files.

**Q: Why do I need a Google service account?**
A: To append leads to your Google Sheet automatically. Share your sheet with the service account email.

**Q: What if Instagram blocks or rate-limits me?**
A: The tool has built-in delays and rate limiting, but you should avoid running too aggressively. If blocked, wait 24 hours and try again.

**Q: How does the tool detect professions?**
A: It uses advanced keyword/context matching and can optionally use OpenAI for ambiguous cases.

**Q: Can I use this for commercial purposes?**
A: Yes, but you are responsible for complying with Instagram's terms and all applicable laws.

**Q: Where are checked accounts tracked?**
A: In `src/config/leadCheckpoint.json` to avoid duplicates and optimize discovery.

**Q: How do I get Discord notifications?**
A: Set `DISCORD_WEBHOOK_URL` in your `.env` file. Use `npm run test-discord` to verify.

**Q: What if I get errors with Google Sheets?**
A: Ensure your `SHEET_ID` is correct, your service account has access, and the sheet/tab exists (default: `Leads`).

**Q: How do I update the qualification criteria?**
A: Edit `src/config/settings.json` to change follower limits, locations, professions, and batch sizes.

---

## 📞 Support
For issues, open an issue on GitHub or contact the maintainer.