# Fixing SMS Send Error - Missing Twilio Configuration

## Problem
The `send-sms` edge function is returning a 500 error because the Twilio environment variables are not set in your Supabase project.

## Solution

### Step 1: Set Environment Variables in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **ChurchCommunication** (hxeqqgwcdnzxpwtsuuvv)
3. Navigate to **Settings** → **Edge Functions** → **Manage secrets**
4. Add the following environment variables:

   ```
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

   **Note:** You can find these credentials in your [Twilio Console](https://console.twilio.com/)

### Step 2: Deploy the Updated Edge Function

I've updated the `send-sms` edge function with better error handling that will now give you a specific error message about which environment variables are missing.

To deploy the updated function, you have two options:

#### Option A: Deploy via Supabase Dashboard
1. Go to **Functions** in your Supabase Dashboard
2. Find the `send-sms` function
3. Click **Deploy new version**
4. Upload the file from: `c:\apps\ChurchComm-main\supabase\functions\send-sms\index.ts`

#### Option B: Deploy via Supabase CLI (If installed)
```bash
supabase functions deploy send-sms
```

### Step 3: Test Again

After setting the environment variables and deploying the updated function:

1. Try sending an SMS message again from the Communications page
2. If there are still missing variables, the error message will now tell you exactly which ones

### Additional Notes

The updated function now includes:
- **Better logging**: Console logs to help debug issues
- **Specific error messages**: Tells you exactly which environment variables are missing
- **Helpful hints**: Guides you to fix the configuration in Supabase

### What Changed in the Code

The edge function now:
1. Validates environment variables early
2. Provides detailed error messages with missing variable names
3. Returns a 500 status with actionable guidance instead of a generic error

### Troubleshooting

If you continue to get errors after setting the variables:
1. Check that the variable names match exactly (case-sensitive)
2. Ensure there are no extra spaces in the values
3. Redeploy the edge function after changing secrets
4. Check the edge function logs in Supabase Dashboard under **Logs**
