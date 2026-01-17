# ChurchConnect V1 - Setup Verification Guide

This guide will help you verify that everything is configured correctly.

## ✅ What You've Already Done

Based on your setup, you have:
- ✅ Created Supabase project
- ✅ Configured .env with URL and anon key
- ✅ Pushed database migrations (5 files)
- ✅ Deployed edge functions (3 functions)

## 🔍 Verification Steps

### Step 1: Verify Database Migrations

1. Go to your Supabase project dashboard: https://hxeqqgwcdnzxpwtsuuvv.supabase.co
2. Navigate to **SQL Editor**
3. Open the file `/workspaces/churchconnect-v1/verify-database.sql`
4. Copy and paste the SQL queries one by one into the SQL Editor
5. Run each query and check the results

**Expected Results:**
- Query 1: Should return **13 tables**
- Query 2: All 13 tables should have `rowsecurity = true`
- Query 3: Should show enum types with values
- Query 4: Should show multiple RLS policies per table
- Query 5: Should show indexes for performance
- Query 6: Should show all columns for the people table

**If any query fails or returns unexpected results, paste the output here and I'll help troubleshoot.**

---

### Step 2: Verify Edge Functions

Run this command in your terminal:

```bash
cd /workspaces/churchconnect-v1
./verify-edge-functions.sh
```

Or manually run:

```bash
supabase functions list
supabase secrets list
```

**Expected Results:**
- `supabase functions list` should show:
  - ✅ send-sms
  - ✅ send-group-call
  - ✅ vapi-webhook

**Secrets (Environment Variables) that need to be set:**

```bash
# For SMS functionality (Twilio)
supabase secrets set TWILIO_ACCOUNT_SID=your_twilio_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_twilio_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890

# For AI calling functionality (VAPI)
supabase secrets set VAPI_API_KEY=your_vapi_api_key
supabase secrets set VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id
supabase secrets set VAPI_WEBHOOK_SECRET=your_vapi_webhook_secret
```

**Note:** If you don't have Twilio or VAPI accounts yet, that's OK! The app will work without them, but SMS and AI calling features won't function until configured.

---

### Step 3: Start the Application

```bash
cd /workspaces/churchconnect-v1
npm run dev
```

The app should start at: http://localhost:8080

---

### Step 4: Run System Tests in the App

1. **First, create a test account:**
   - Navigate to http://localhost:8080
   - You should see the login page
   - Click "Don't have an account? Sign up"
   - Fill in:
     - First Name: Test
     - Last Name: User
     - Church Name: Test Church
     - Email: test@church.com
     - Password: password123
   - Click "Create Account"
   - Check your email for confirmation link (Supabase sends this)
   - Click the confirmation link
   - Log in with your credentials

2. **Run the built-in system test:**
   - Once logged in, manually navigate to: http://localhost:8080/system-test
   - Click "Run All Tests"
   - All tests should pass with green checkmarks

**Expected Test Results:**
- ✅ Environment Variables - Should pass
- ✅ Supabase Connection - Should pass
- ✅ Database Tables - Should pass
- ✅ Authentication - Should pass
- ✅ Organization Data - Should pass
- ✅ Edge Functions - Should pass (even if Twilio/VAPI not configured yet)

---

## 📋 Verification Checklist

Copy this checklist and mark what's complete:

```
Backend Setup:
[ ] Database has 13 tables
[ ] RLS is enabled on all tables
[ ] Enums are created (status_enum, etc.)
[ ] RLS policies exist
[ ] Indexes are created
[ ] Edge functions are deployed (send-sms, send-group-call, vapi-webhook)
[ ] Edge function secrets are configured (optional for now)

Frontend Setup:
[ ] App starts without errors (npm run dev)
[ ] Can access login page
[ ] Can create new account
[ ] Receive confirmation email
[ ] Can log in after confirmation
[ ] Dashboard loads with stats
[ ] System Test page shows all green checkmarks

Feature Testing:
[ ] Can add a person manually (People → Add Person)
[ ] Can upload CSV (People → Bulk Import)
[ ] Can create a group (Groups → Create Group)
[ ] Can add members to group
[ ] Can view Communications page (even if SMS not configured yet)
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Failed to connect to Supabase"
**Solution:**
- Check .env file has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Restart dev server after changing .env
- Verify URL doesn't have trailing slash

### Issue 2: "No tables found"
**Solution:**
- Migrations may not have run
- Go to Supabase Dashboard → Database → Migrations
- Manually run each migration file in order

### Issue 3: "RLS policy violation" or "403 Forbidden"
**Solution:**
- Check that user is in organization_members table
- Run this SQL in Supabase:
```sql
SELECT * FROM organization_members WHERE user_id = 'your_user_id';
```
- If no record, sign up flow may have failed

### Issue 4: "Edge function not found"
**Solution:**
```bash
cd /workspaces/churchconnect-v1
supabase functions deploy send-sms
supabase functions deploy send-group-call
supabase functions deploy vapi-webhook
```

### Issue 5: SMS sending fails
**Solution:**
- This is expected if Twilio credentials aren't configured
- Set Twilio secrets (see Step 2)
- Get Twilio credentials from: https://console.twilio.com

---

## 📤 Send Me This Information

Once you've run all verification steps, send me:

1. **Database verification results** (from Step 1)
   - How many tables were found?
   - Are all RLS policies enabled?

2. **Edge functions status** (from Step 2)
   - Output of `supabase functions list`
   - Which secrets are set?

3. **System test results** (from Step 4)
   - Screenshot or copy of test results
   - Any red X's or errors?

4. **Checklist status** (from above)
   - Which items are checked?
   - Where did you get stuck?

I'll use this to determine exactly what's working and what needs attention!

---

## 🎯 Next Steps After Verification

Once everything passes:

1. **Add Sample Data**
   - Add 2-3 test members
   - Create 1-2 test groups
   - Assign members to groups

2. **Test SMS** (if Twilio configured)
   - Send test SMS to yourself
   - Verify message delivery

3. **Configure Production**
   - Update organization details in Settings
   - Add real member data
   - Set up real groups

4. **Train Your Team**
   - Show them how to add people
   - Demonstrate CSV upload
   - Walk through SMS sending

---

## Need Help?

If anything doesn't work:
1. Copy the error message
2. Copy the relevant verification output
3. Send it back to me
4. I'll help troubleshoot immediately!
