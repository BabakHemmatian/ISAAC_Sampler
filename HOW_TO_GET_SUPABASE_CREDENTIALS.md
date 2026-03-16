# How to Get Supabase URL and Anon Key for Authentication

## Step-by-Step Guide

### Step 1: Log in to Supabase Dashboard
1. Go to **https://supabase.com/dashboard**
2. Log in with your Supabase account

### Step 2: Select Your Project
1. You should see a list of your projects
2. Click on your project (the one you're using for this app)
   - Based on the code, it should be: `bcaeugxhaokrankuwtsa`
   - Or look for a project that matches your app

### Step 3: Go to Project Settings
1. In the left sidebar, click on the **⚙️ Settings** icon (gear icon)
2. Click on **API** in the settings menu

### Step 4: Find Your Credentials
You'll see two important sections:

#### **Project URL** (Supabase URL)
- Located under **Project URL** section
- Format: `https://xxxxx.supabase.co`
- Example from your code: `https://bcaeugxhaokrankuwtsa.supabase.co`
- **Copy this URL** - this is your `supabaseUrl`

#### **API Keys** (Anon Key)
- Scroll down to **Project API keys** section
- You'll see several keys:
  - **`anon` `public`** - This is the one you need! ✅
  - `service_role` `secret` - Don't use this (it has admin access)
- Click the **👁️ eye icon** or **copy button** next to the `anon` `public` key
- **Copy this key** - this is your `supabaseAnonKey`

### Step 5: Update Your Code (if needed)
If you need to change the credentials in your code, they're located in:

**File: `src/App.js`** (around lines 123-124)
```javascript
const supabaseUrl = "https://bcaeugxhaokrankuwtsa.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

## Visual Guide

```
Supabase Dashboard
├── Projects
│   └── Your Project (bcaeugxhaokrankuwtsa)
│       └── Settings ⚙️
│           └── API
│               ├── Project URL ← Copy this
│               └── Project API keys
│                   └── anon public ← Copy this key
```

## Important Notes

1. **Anon Key is Safe**: The `anon` `public` key is safe to use in frontend code (it's designed for client-side use)
2. **Never Share Service Role Key**: The `service_role` key should NEVER be used in frontend code
3. **URL Format**: The URL always ends with `.supabase.co`
4. **Key Format**: The anon key is a JWT token (long string starting with `eyJ...`)

## If You Don't Have a Supabase Account

1. Go to **https://supabase.com**
2. Click **Start your project**
3. Sign up (free tier available)
4. Create a new project
5. Follow steps above to get your credentials

## Troubleshooting

- **Can't find the project?** Check if you're logged into the correct Supabase account
- **Key not visible?** Click the eye icon to reveal it
- **Wrong project?** Make sure you're in the project that matches your app's database
