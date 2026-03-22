# Deploy Updated send-sms Edge Function

## Quick Fix Guide

The `send-sms` function is returning a 500 error because **Twilio credentials are not configured** in your Supabase project. Follow these steps to fix it:

---

## Step 1: Configure Twilio Environment Variables

### Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**: Go to https://supabase.com/dashboard
2. **Select Project**: Click on **ChurchCommunication** project
3. **Navigate to Secrets**:
   - Click **Project Settings** (gear icon in sidebar)
   - Click **Edge Functions** in the left menu
   - Scroll down to **Secrets** section
   - Click **Add new secret**

4. **Add these three secrets**:

   ```
   Name: TWILIO_ACCOUNT_SID
   Value: [Your Twilio Account SID]
   ```

   ```
   Name: TWILIO_AUTH_TOKEN
   Value: [Your Twilio Auth Token]
   ```

   ```
   Name: TWILIO_PHONE_NUMBER
   Value: [Your Twilio Phone Number in E.164 format, e.g., +1234567890]
   ```

5. **Get Twilio Credentials**:
   - Go to https://console.twilio.com/
   - Find your **Account SID** and **Auth Token** on the dashboard
   - Get your **Phone Number** from Phone Numbers → Manage → Active Numbers

---

## Step 2: Deploy the Updated Edge Function

The updated function includes better error messages and logging. You have three deployment options:

### Option A: Via Supabase Dashboard (Easiest)

1. Go to **Edge Functions** in your Supabase Dashboard
2. Find `send-sms` in the function list
3. Click the **⋮** menu → **Edit function**
4. Copy the entire content from: `c:\apps\ChurchComm-main\supabase\functions\send-sms\index.ts`
5. Paste it into the editor
6. Click **Deploy**

### Option B: Via Supabase CLI (Command Line)

If you have Supabase CLI installed:

```bash
cd c:\apps\ChurchComm-main
supabase functions deploy send-sms
```

### Option C: Install Supabase CLI First

If you don't have Supabase CLI:

```bash
# Install via npm
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref hxeqqgwcdnzxpwtsuuvv

# Deploy the function
supabase functions deploy send-sms
```

---

## Step 3: Test the Function

After deploying and configuring secrets:

1. **Refresh your app** in the browser
2. Go to **Communications** page
3. Try sending an SMS
4. **Expected Results**:
   - ✅ **If configured correctly**: SMS will send successfully
   - ❌ **If still missing variables**: You'll see a detailed error message like:
     ```
     Twilio configuration incomplete
     Missing environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
     Tip: Please set these variables in your Supabase project settings
     ```

---

## What's Different in the Updated Function?

The new version includes:

1. **Console Logging**: 
   - Logs when the function is invoked
   - Logs request data for debugging
   - Logs environment variable status

2. **Better Error Messages**:
   - Tells you exactly which variables are missing
   - Provides hints on where to set them
   - Returns structured error objects with `error`, `details`, and `hint` fields

3. **Early Validation**:
   - Checks environment variables before attempting to send
   - Returns helpful 500 errors instead of crashing

---

## Troubleshooting

### Still Getting 500 Error?

1. **Check Logs in Supabase Dashboard**:
   - Go to **Edge Functions** → `send-sms` → **Logs**
   - Look for console output showing which variables are missing

2. **Verify Secret Names Match Exactly**:
   - `TWILIO_ACCOUNT_SID` (not `TWILIO_SID`)
   - `TWILIO_AUTH_TOKEN` (not `TWILIO_TOKEN`)
   - `TWILIO_PHONE_NUMBER` (not `TWILIO_FROM_NUMBER`)

3. **Check Phone Number Format**:
   - Must include country code: `+12345678901`
   - No spaces or special characters except `+`

4. **Redeploy After Adding Secrets**:
   - Secrets only take effect after redeployment
   - Deploy the function again after adding/changing secrets

### Console Showing Detailed Errors Now

After deploying the updated function, check the browser console. You should see:

```javascript
// Before: Generic error
Error sending SMS: FunctionsHttpError: Edge Function returned a non-2xx status code

// After: Detailed error
Error sending SMS: {
  error: "Twilio configuration incomplete",
  details: "Missing environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN",
  hint: "Please set these variables in your Supabase project settings"
}
```

---

## Quick Reference: File Locations

- **Edge Function**: `c:\apps\ChurchComm-main\supabase\functions\send-sms\index.ts`
- **CORS Config**: `c:\apps\ChurchComm-main\supabase\functions\_shared\cors.ts`
- **Client Code**: `c:\apps\ChurchComm-main\src\pages\Communications.tsx`

---

## Need More Help?

If you continue to experience issues:

1. Check the **Edge Function Logs** in Supabase Dashboard
2. Look at the **Browser Console** for detailed error messages
3. Verify your Twilio account is active and has credits
4. Test Twilio credentials directly via Twilio Console

---

**Last Updated**: 2026-02-01  
**Project**: ChurchComm V2
