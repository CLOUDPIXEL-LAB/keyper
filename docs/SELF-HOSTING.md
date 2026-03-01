# 🏠 Keyper Self-Hosting Guide

> **Complete guide to self-hosting Keyper with your own Supabase instance**
>
> Made with ❤️ by Pink Pixel - Dream it, Pixel it ✨

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [📦 Installation Methods](#-installation-methods)
- [🗄️ Supabase Setup](#️-supabase-setup)
- [⚙️ Configuration](#️-configuration)
- [📱 PWA Installation](#-pwa-installation)
- [🔧 Troubleshooting](#-troubleshooting)
- [🛡️ Security Considerations](#️-security-considerations)
- [🔄 Updates & Maintenance](#-updates--maintenance)

---

## 🚀 Quick Start

Get Keyper running on your own infrastructure in under 5 minutes!

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works great!)
- Modern web browser

### 1-Minute Setup

```bash
# Install Keyper globally
npm install -g @pinkpixel/keyper

# Start the server
keyper

# Open in browser
# http://localhost:4173
```

That's it! Now follow the in-app setup wizard to configure your Supabase instance.

---

## 📦 Installation Methods

### Method 1: Global NPM Installation (Recommended)

```bash
npm install -g @pinkpixel/keyper
```

**Available Commands:**

- `keyper` - Start Keyper server
- `credential-manager` - Alternative command
- `keyper-dashboard` - Another alternative

### Method 2: NPX (No Installation)

```bash
npx @pinkpixel/keyper
```

### Method 3: Local Development

```bash
git clone https://github.com/pinkpixel-dev/keyper.git
cd keyper
npm install
npm run build
npm start
```

---

## 🗄️ Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/login to your account
3. Click **"New Project"**
4. Choose your organization
5. Enter project details:
   - **Name**: `keyper-db` (or your preference)
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your location
6. Click **"Create new project"**
7. Wait 1-2 minutes for setup to complete

### Step 2: Get Your Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

⚠️ **Important**: Use the **anon/public** key, NOT the service_role key!

### Step 3: Run Database Setup

1. In Supabase dashboard, go to **SQL Editor**
2. In Keyper app, go to Settings → Database Setup
3. Click **"Copy Complete SQL Script"**
4. Paste the script in Supabase SQL Editor
5. Click **"Run"** to execute the script
6. Verify success (should see "Success. No rows returned")

---

## ⚙️ Configuration

### Initial Configuration

1. Start Keyper: `keyper`
2. Open [http://localhost:4173](http://localhost:4173)
3. You'll see the Settings screen automatically
4. Enter your Supabase credentials:
   - **Supabase Project URL**: Your project URL
   - **Supabase Anon or Publishable Key**: Your anon/publishable key
5. Click **"Test Connection"**
6. If successful, click **"Refresh App"**
7. Start managing your credentials! 🎉

### Reconfiguration

- Click the **Settings** button (top-right corner)
- Update your Supabase credentials
- Test connection and refresh

### Data Storage

- Credentials are stored in **your** Supabase database
- Configuration is saved in browser localStorage
- No data is sent to Pink Pixel servers

---

## 📱 PWA Installation

Keyper works as a Progressive Web App for a native app experience!

### Desktop Installation

1. Open Keyper in Chrome/Edge/Firefox
2. Look for the install icon in the address bar
3. Click to install as a desktop app
4. Access from your applications menu

### Mobile Installation

1. Open Keyper in your mobile browser
2. Tap the browser menu (⋮)
3. Select **"Add to Home Screen"** or **"Install App"**
4. Confirm installation
5. Access from your home screen

### PWA Benefits

- 📱 Native app experience
- 🚀 Faster loading
- 🌐 Offline functionality (cached data)
- 🔄 Background updates
- 📲 Push notifications (future feature)

---

## 🔧 Troubleshooting

### Connection Issues

**❌ "Connection failed: Database connection failed"**

- Verify your Supabase URL format: `https://your-project.supabase.co`
- Ensure you're using the **anon/public** key, not service_role
- Check that your Supabase project is active (not paused)

**❌ "Missing required environment variables"**

- This error is normal for self-hosted setups
- Configure your credentials in the Settings UI

**❌ "relation 'credentials' does not exist"**

- The database setup script hasn't been run
- Go to Supabase SQL Editor and run the complete setup script

### Dashboard Issues

**❌ Dashboard shows "No credentials found" after setup**

- Click the **"Refresh App"** button
- Clear browser cache and reload
- For PWA: Uninstall and reinstall the app

**❌ Can't add credentials**

- Verify RLS policies are enabled
- Check that you're authenticated (should happen automatically)
- Ensure the setup script completed without errors

**❌ Can't enter new credentials after clearing configuration**

- Refresh the page after clearing configuration
- Ensure you're typing the correct URL format: `https://your-project.supabase.co`
- Try clearing browser cache if form inputs appear stuck
- The form should accept empty fields after clearing - if not, refresh the page

**❌ Categories dropdown is empty when using custom username**

- This issue has been resolved in the latest version
- Default categories should now appear for all usernames (both default and custom)
- Custom categories remain isolated to their respective users
- If still experiencing issues, try refreshing the page after setting your username

### Performance Issues

**❌ Slow loading**

- Check your internet connection to Supabase
- Consider choosing a Supabase region closer to you
- Clear browser cache

**❌ PWA not working offline**

- Ensure you've used the app online first
- Check that service worker is registered
- Try reinstalling the PWA

### Master Passphrase Reset

**Forgot your master passphrase?** Don't worry! Your encrypted data is completely safe and you can securely reset your passphrase.

**Important**: It's not possible to _view_ your current master passphrase, but you can _update/change_ it using our secure bcrypt-based reset system.

📖 **Complete Reset Guide**: For detailed step-by-step instructions, see our comprehensive [Emergency Passphrase Reset Guide](./docs/EMERGENCY_PASSPHRASE_RESET.md)

**Quick Overview:**

1. Access your Supabase dashboard and navigate to the `vault_config` table
2. Generate a new bcrypt hash using your desired new passphrase
3. Replace the `bcrypt_hash` value in your database
4. Login with your new passphrase

**Security Benefits:**

- ✅ **No Backdoors**: Complete elimination of admin override capabilities
- ✅ **User Control**: Only you can reset your own passphrase
- ✅ **Data Safety**: Your encrypted credentials remain completely safe
- ✅ **Industry Standard**: Uses proven bcrypt hashing technology
- ✅ **Zero Knowledge**: Hash-only storage ensures maximum security

### Getting Help

1. **Check the SQL Script**: Ensure it ran without errors
2. **Verify Credentials**: Double-check your Supabase URL and key
3. **Browser Console**: Check for error messages (F12 → Console)
4. **Supabase Logs**: Check your Supabase project logs
5. **Master Passphrase**: Use the secure reset process above for password issues
6. **GitHub Issues**: Report bugs at [github.com/pinkpixel-dev/keyper](https://github.com/pinkpixel-dev/keyper)

---

## 🛡️ Security Considerations

### Database Security

- ✅ **Row Level Security (RLS)** enabled by default
- ✅ **User isolation** - each user only sees their own data
- ✅ **Encrypted connections** - all data encrypted in transit
- ✅ **Supabase encryption** - data encrypted at rest

### Best Practices

1. **Use strong Supabase passwords**
2. **Keep your anon/publishable key secure** (don't share publicly)
3. **Regular backups** of your Supabase database
4. **Monitor access logs** in Supabase dashboard
5. **Update Keyper regularly** for security patches

### What Pink Pixel Can't See

- ❌ Your stored credentials
- ❌ Your Supabase data
- ❌ Your database credentials
- ❌ Your usage patterns

### What's Stored Where

- **Your Credentials**: Your Supabase database (encrypted)
- **App Configuration**: Browser localStorage
- **Authentication**: Supabase Auth (secure)

---

## 🔄 Updates & Maintenance

### Updating Keyper

```bash
# Update to latest version
npm update -g @pinkpixel/keyper

# Or reinstall
npm uninstall -g @pinkpixel/keyper
npm install -g @pinkpixel/keyper
```

### Database Maintenance

- **Backups**: Use Supabase's backup features
- **Monitoring**: Check Supabase dashboard regularly
- **Scaling**: Upgrade Supabase plan if needed

### Supabase Free Tier Limits

- **Database size**: 500MB
- **Bandwidth**: 5GB/month
- **API requests**: 50,000/month
- **Authentication**: 50,000 MAUs

_These limits are generous for personal use!_

---

## 🎉 You're All Set!

Congratulations! You now have your own private, secure credential management system.

### What's Next?

- 📝 Start adding your credentials
- 🏷️ Organize with categories and tags
- 📱 Install the PWA for mobile access
- 🔄 Set up regular backups
- 🌟 Enjoy secure credential management!

### Need Help?

- 📖 Check this guide again
- 🐛 Report issues on GitHub
- 💬 Join our Discord community
- 📧 Email us at admin@pinkpixel.dev

---

**Made with ❤️ by Pink Pixel**  
_Dream it, Pixel it_ ✨

[🌐 Website](https://pinkpixel.dev) | [📧 Email](mailto:admin@pinkpixel.dev) | [💬 Discord](https://discord.com) | [☕ Buy me a coffee](https://www.buymeacoffee.com/pinkpixel)
