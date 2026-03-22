#!/bin/bash

echo "========================================="
echo "CHURCHCONNECT V1 - QUICK STATUS CHECK"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check .env file
echo "1. Environment Configuration"
echo "-----------------------------------"
if [ -f .env ]; then
    if grep -q "VITE_SUPABASE_URL" .env && grep -q "VITE_SUPABASE_ANON_KEY" .env; then
        echo -e "${GREEN}✓${NC} .env file exists with required variables"
        echo "   URL: $(grep VITE_SUPABASE_URL .env | cut -d'=' -f2 | cut -c1-40)..."
    else
        echo -e "${RED}✗${NC} .env missing required variables"
    fi
else
    echo -e "${RED}✗${NC} .env file not found"
fi
echo ""

# Check migrations
echo "2. Database Migrations"
echo "-----------------------------------"
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
if [ $MIGRATION_COUNT -eq 5 ]; then
    echo -e "${GREEN}✓${NC} All 5 migration files present"
    ls -1 supabase/migrations/*.sql | while read file; do
        echo "   - $(basename $file)"
    done
else
    echo -e "${RED}✗${NC} Expected 5 migrations, found $MIGRATION_COUNT"
fi
echo ""

# Check edge functions
echo "3. Edge Functions"
echo "-----------------------------------"
if [ -d "supabase/functions/send-sms" ] && [ -d "supabase/functions/send-group-call" ] && [ -d "supabase/functions/vapi-webhook" ]; then
    echo -e "${GREEN}✓${NC} All 3 edge function directories exist"
    echo "   - send-sms"
    echo "   - send-group-call"
    echo "   - vapi-webhook"
else
    echo -e "${RED}✗${NC} Missing edge function directories"
fi
echo ""

# Check if functions are deployed (requires supabase CLI)
if command -v supabase &> /dev/null; then
    echo "4. Deployed Functions (requires auth)"
    echo "-----------------------------------"
    echo -e "${YELLOW}ℹ${NC} Run: ${YELLOW}supabase functions list${NC} to check deployed status"
else
    echo "4. Supabase CLI"
    echo "-----------------------------------"
    echo -e "${YELLOW}ℹ${NC} Supabase CLI not installed (optional for this check)"
    echo "   Install: npm install -g supabase"
fi
echo ""

# Check node_modules
echo "5. Dependencies"
echo "-----------------------------------"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists (dependencies installed)"
else
    echo -e "${RED}✗${NC} node_modules not found - run: npm install"
fi
echo ""

# Check build
echo "6. Frontend Build"
echo "-----------------------------------"
if [ -d "dist" ]; then
    echo -e "${GREEN}✓${NC} Build directory exists (last build successful)"
else
    echo -e "${YELLOW}ℹ${NC} No build directory - run: npm run build"
fi
echo ""

# Summary
echo "========================================="
echo "NEXT STEPS:"
echo "========================================="
echo ""
echo "1. Open VERIFICATION-GUIDE.md for detailed verification steps"
echo ""
echo "2. Start the dev server:"
echo "   ${YELLOW}npm run dev${NC}"
echo ""
echo "3. Navigate to system test page after logging in:"
echo "   ${YELLOW}http://localhost:8080/system-test${NC}"
echo ""
echo "4. Run database verification SQL:"
echo "   Open verify-database.sql in Supabase SQL Editor"
echo ""
echo "========================================="
