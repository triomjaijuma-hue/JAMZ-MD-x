# JAMZ-MD-x Troubleshooting Guide

## 🔴 Common Issues & Solutions

### 1. **Bot Crashes Immediately After Starting**

**Error**: `TypeError: makeInMemoryStore is not a function`

✅ **Solution**:
- This is fixed in v1.2.0
- Update: `git pull origin main`
- Clear session: `rm -rf session`
- Restart bot

**Error**: `Cannot find module '@whiskeysockets/baileys'`

✅ **Solution**:
```bash
npm install
npm cache clean --force
npm install
npm start
```

---

### 2. **Railway Deployment Keeps Failing**

**Error**: `Railway build/deploy failed`

✅ **Solutions**:
1. Check Procfile exists (Railway might not detect Node.js)
   ```
   echo "web: npm start" > Procfile
   git add Procfile && git commit -m "Add Procfile"
   ```

2. Ensure package.json has all dependencies:
   ```bash
   npm install
   git add package-lock.json && git commit -m "Update dependencies"
   git push
   ```

3. Check Railway environment variables are set:
   - Go to Railway Dashboard → Variables
   - Ensure `OWNER_NUMBERS` and `BOT_NUMBER` are set

4. Clear Railway build cache:
   - Delete deployment and redeploy

---

### 3. **Memory Limit Exceeded - Bot Restarts Every Few Minutes**

**Error**: `[CRITICAL] Memory limit exceeded: 450MB. Restarting...`

✅ **Solutions**:
```env
# For Railway free tier (512MB RAM)
MEMORY_LIMIT=350

# Disable auto-read/typing features
AUTO_READ=false
AUTO_TYPING=false

# Reduce store saving frequency (modify in index.js if needed)
```

---

### 4. **Bot Not Responding to Commands**

**Issue**: Bot connects but doesn't respond to commands

✅ **Checklist**:
- [ ] Command prefix correct (default: `.`)
  - Try: `.help` or `.hello`
  
- [ ] Your number in `OWNER_NUMBERS`
  - Format must include country code: `256706106326`
  
- [ ] Plugins directory exists: `bot/plugins/`
  - Create if missing: `mkdir -p bot/plugins`
  
- [ ] Check plugin syntax - create a test plugin:
  ```bash
  cat > bot/plugins/test.js << 'EOF'
  export default {
      name: 'test',
      execute: async (sock, m, context) => {
          await m.reply('✅ Bot is working!');
      }
  };
  EOF
  ```

- [ ] Restart bot and try: `.test`

---

### 5. **QR Code Not Appearing (First Time Setup)**

**Issue**: No QR code shown, bot stuck connecting

✅ **Solutions**:
1. If `BOT_NUMBER` is set, remove it first:
   ```env
   # Remove this line temporarily
   # BOT_NUMBER=256706106326
   ```

2. Clear session:
   ```bash
   rm -rf session
   npm start
   ```

3. Check logs for QR code output

4. If still stuck, manually set with pairing number:
   ```env
   BOT_NUMBER=your_whatsapp_number
   ```

---

### 6. **"Connection Lost" - Bot Keeps Disconnecting**

**Error**: `[SYSTEM] ❌ Connection closed. Status: undefined`

✅ **Solutions**:
- Increase retry attempts:
  ```env
  MAX_RETRIES=8
  CONNECTION_TIMEOUT=90000
  ```

- Reduce auto-features:
  ```env
  AUTO_READ=false
  AUTO_TYPING=false
  ```

- Ensure stable internet connection on Railway

- Check if WhatsApp account is blocked (log in manually to verify)

---

### 7. **"Logged Out" - Session Lost**

**Error**: `[SYSTEM] 🚪 Logged out. Session destroyed.`

✅ **Solutions**:
- Clear session and re-authenticate:
  ```bash
  rm -rf session
  npm start
  ```

- Session will be recreated from QR code
- Save pairing code if you have one (show in logs)

---

### 8. **Port Already in Use**

**Error**: `EADDRINUSE: address already in use :::3000`

✅ **Solutions**:
```bash
# Change port
export PORT=3001
npm start

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm start
```

In Railway, just set `PORT` variable.

---

### 9. **Plugin Not Loading**

**Issue**: Plugin in `bot/plugins/` but not recognized

✅ **Checklist**:
```javascript
// Check your plugin has:

export default {               // ✅ REQUIRED: default export
    name: 'mycommand',        // ✅ REQUIRED: unique name
    execute: async (...) => { // ✅ REQUIRED: async function
        // code
    },
    // OPTIONAL:
    category: 'general',      // 'general', 'owner', 'admin', 'group', 'botAdmin'
    description: 'Does something',
    alias: ['cmd', 'command'] // Alternative names
};
```

---

### 10. **Database Not Persisting on Railway**

**Issue**: Settings reset after Railway restart

**Explanation**: Railway uses ephemeral storage (clears on restart)

✅ **Solutions**:

Option 1: Use Railway Volumes (free tier):
- Railway Dashboard → Bot → Data
- Add Volume: `/app/database` → 1GB

Option 2: Use external database:
- MongoDB Atlas (free tier available)
- Modify `lib/database.js` to use MongoDB

Option 3: Accept ephemeral data:
- Some settings will reset - this is normal

---

### 11. **"Cannot read property of undefined"**

**Error**: `TypeError: Cannot read property 'chat' of undefined`

✅ **Solution**:
- Check message handler has null checks
- Update to v1.2.0 which has improved error handling
- Add try-catch in your plugin:
  ```javascript
  try {
      // your code
  } catch (error) {
      console.error('Plugin error:', error);
      await m.reply('❌ Error: ' + error.message);
  }
  ```

---

### 12. **Media Download Failing**

**Error**: `Error downloading media`

✅ **Solutions**:
- Ensure `ffmpeg` is installed
- For Railway, it's included in build
- Check file type compatibility
- Verify media file isn't corrupted

---

## 🛠️ Debug Mode

Enable detailed logging:

```env
DEBUG=true
```

Then check logs for detailed error traces.

---

## 📊 Performance Tips

1. **Reduce memory usage**:
   ```env
   MEMORY_LIMIT=300
   AUTO_READ=false
   AUTO_TYPING=false
   ```

2. **Optimize database**:
   - Regular cleanup of old data
   - Use volumes on Railway for persistence

3. **Plugin optimization**:
   - Avoid heavy operations in handlers
   - Use async/await properly

---

## 🆘 Still Having Issues?

1. **Check logs**:
   - Railway: Dashboard → Bot → Logs
   - Local: Terminal output

2. **Common error codes**:
   - `401`: WhatsApp credentials invalid
   - `403`: Account blocked
   - `502/503`: Network/connection issue

3. **Ask for help**:
   - [GitHub Issues](https://github.com/triomjaijuma-hue/JAMZ-MD-x/issues)
   - Include full error message and logs

---

## 📝 Log Interpretation

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ | Success/Working | None needed |
| ⚠️ | Warning (non-critical) | Monitor |
| ❌ | Error | Check logs |
| 🚨 | Critical error | Fix immediately |

---

**Last Updated**: 2026-04-24  
**Version**: 1.2.0
