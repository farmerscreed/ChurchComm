#!/bin/bash

echo "========================================="
echo "CHURCHCONNECT V1 - EDGE FUNCTIONS VERIFICATION"
echo "========================================="
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "1. Checking deployed functions..."
echo "-----------------------------------"
supabase functions list 2>&1 || echo "Failed to list functions. Are you logged in? Run: supabase login"
echo ""

echo "2. Expected functions:"
echo "   ✓ send-sms"
echo "   ✓ send-group-call"
echo "   ✓ vapi-webhook"
echo ""

echo "3. Checking function secrets (environment variables)..."
echo "-----------------------------------"
echo "Run this command to check if secrets are set:"
echo ""
echo "   supabase secrets list"
echo ""
echo "Expected secrets:"
echo "   - TWILIO_ACCOUNT_SID"
echo "   - TWILIO_AUTH_TOKEN"
echo "   - TWILIO_PHONE_NUMBER"
echo "   - VAPI_API_KEY"
echo "   - VAPI_PHONE_NUMBER_ID"
echo "   - VAPI_WEBHOOK_SECRET"
echo ""

echo "4. To set missing secrets, use:"
echo "-----------------------------------"
echo "   supabase secrets set TWILIO_ACCOUNT_SID=your_value"
echo "   supabase secrets set TWILIO_AUTH_TOKEN=your_value"
echo "   supabase secrets set TWILIO_PHONE_NUMBER=+1234567890"
echo "   supabase secrets set VAPI_API_KEY=your_value"
echo "   supabase secrets set VAPI_PHONE_NUMBER_ID=your_value"
echo "   supabase secrets set VAPI_WEBHOOK_SECRET=your_value"
echo ""

echo "========================================="
echo "Copy the output above and send it back to verify!"
echo "========================================="
