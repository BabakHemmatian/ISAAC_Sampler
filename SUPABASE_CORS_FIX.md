# Fixing Supabase Authentication "Failed to fetch" Error

## Problem
The login and signup are failing with "Failed to fetch" error. This is typically a CORS (Cross-Origin Resource Sharing) issue.

## Solution

### Step 1: Check Supabase Dashboard
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project: `bcaeugxhaokrankuwtsa`
3. Go to **Settings** → **API**
4. Scroll down to **CORS Configuration**

### Step 2: Add Your Domain to Allowed Origins
In the **CORS Configuration** section, add your VM's public IP:
```
http://141.142.219.201
https://141.142.219.201
```

If you have a custom domain, also add:
```
http://yourdomain.com
https://yourdomain.com
```

### Step 3: Verify Anon Key
Make sure the anon key in the code matches the one in your Supabase dashboard:
- Dashboard: **Settings** → **API** → **Project API keys** → **anon public**

Current key in code:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYWV1Z3hoYW9rcmFua3V3dHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMjA0NTksImV4cCI6MjA1Nzc5NjQ1OX0.3YJB_NLsvIl2fF_EGivT2I8N26TXyirpVnX06BPRbg4
```

### Step 4: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Try to login/signup
4. Check for detailed error messages (the updated code now shows more specific errors)

### Step 5: Verify Network Connectivity
If CORS is configured correctly but still failing:
1. Check if your browser can access Supabase directly
2. Open browser console and run:
   ```javascript
   fetch('https://bcaeugxhaokrankuwtsa.supabase.co/auth/v1/health')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   ```

## Alternative: Use Environment Variables
If you need to change the Supabase URL or key, you can use environment variables:

1. Create `.env` file in the frontend root:
   ```
   REACT_APP_SUPABASE_URL=https://bcaeugxhaokrankuwtsa.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. Update `src/App.js` to use environment variables:
   ```javascript
   const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://bcaeugxhaokrankuwtsa.supabase.co";
   const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "your_key_here";
   ```

## What Was Fixed
1. ✅ Improved error handling - now shows specific error messages
2. ✅ Added better Supabase client configuration with PKCE flow
3. ✅ Added console logging for debugging
4. ✅ Deployed updated frontend to VM

## Next Steps
1. Add your VM IP to Supabase CORS settings
2. Test login/signup again
3. Check browser console for detailed error messages if it still fails
