# 🔐 Emergency Master Passphrase Reset Guide

## Overview

**Can't remember your master passphrase?** Don't panic! This guide will help you reset it securely.

> ⚠️ **Important:** It's **IMPOSSIBLE** to view or recover your current master passphrase - this is by design for security! However, you can **UPDATE/CHANGE** it using the steps below.

---

## 🚨 Emergency Reset Instructions

### Step 1: Access Your Database
1. **Login to your Supabase Dashboard** at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to **Table Editor** → **vault_config** table
4. Find the row with your `user_id` (usually "self-hosted-user")

### Step 2: Generate New Passphrase Hash
1. **Visit:** [https://bcrypt-generator.com/](https://bcrypt-generator.com/)
2. **Under "Text to Hash"** - Enter your **NEW** master passphrase
3. **Set Rounds to 12** (recommended security level)
4. **Click "Generate"**
5. **Copy the generated hash** (starts with `$2b$12$...`)

### Step 3: Update Database
1. **Back in Supabase**, find the `bcrypt_hash` column in your vault_config row
2. **Replace the old hash** with your newly generated hash
3. **Save the changes**

### Step 4: Test Your New Passphrase
1. **Return to Keyper**
2. **Enter your NEW passphrase** (the text you typed in the bcrypt generator)
3. **Booyah!** 🎉 Your passphrase is now updated!

---

## 🔒 Security Notes

### Why This Is Safe
- ✅ **Hash-only storage:** Only bcrypt hashes are stored, never actual passphrases
- ✅ **One-way encryption:** It's **IMPOSSIBLE** to convert a hash back to the original string
- ✅ **Your data stays safe:** All your encrypted credentials remain fully accessible
- ✅ **No backdoors:** Only YOU can reset your passphrase using your database access

### Important Reminders
- 📝 **Write down your new passphrase** in a secure location
- 🔄 **This only changes your master passphrase** - all your saved credentials stay the same
- 🚫 **No admin or support can help** - this is intentionally user-controlled for security
- 💻 **Client-side processing:** The bcrypt generator processes everything in your browser

---

## 🆘 Troubleshooting

### "Hash doesn't work after updating"
- ✅ Make sure you copied the **complete hash** (starts with `$2b$12$`)
- ✅ Verify you're entering the **exact passphrase** you used in the generator
- ✅ Check for extra spaces or characters

### "Can't find bcrypt_hash column"
- ✅ Make sure you've run the latest database migration
- ✅ Check you're looking at the `vault_config` table (not `credentials`)
- ✅ Your installation might use the legacy system - contact support for migration help

### "Still can't access vault"
- ✅ Try refreshing the Keyper app completely
- ✅ Clear browser cache and reload
- ✅ Double-check the passphrase matches exactly what you generated

---

## 🎯 Quick Reference

**Need to reset? Just remember:**
1. **Supabase Dashboard** → vault_config table
2. **bcrypt-generator.com** → Generate hash from NEW passphrase  
3. **Replace hash** in database → Save
4. **Login with NEW passphrase** → Done! ✨

---

## 🛡️ Why Keyper Uses This System

This bcrypt-based reset system provides:
- **Maximum security** - No backdoors or admin overrides
- **User control** - Only you can reset your passphrase
- **Data protection** - Your encrypted credentials remain safe
- **Industry standard** - Uses proven bcrypt hashing technology

---

*Made with ❤️ by Pink Pixel - Keeping your secrets safe! ✨*

> **Remember:** The best security is user-controlled security. You own your data, you control your access! 🔐
