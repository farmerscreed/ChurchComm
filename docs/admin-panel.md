# KeepFlock Admin Panel - Feature Specification

## Overview

The Admin Panel is an internal dashboard for KeepFlock platform administrators to manage organizations, monitor usage, handle billing, and maintain system health.

---

## 1. Organization Management

### Organization List
- Search by name, email, or ID
- Filter by: plan type, status (active/trial/churned), date range
- Sort by: name, created date, usage, revenue
- Quick stats: total orgs, active trials, premium customers

### Organization Details
- **Profile**: Name, contact info, website, logo
- **Members**: List of users, roles, last active
- **Subscription**: Current plan, billing history, usage
- **Settings**: View/edit org settings
- **Activity Log**: Recent actions, calls made, campaigns
- **Impersonation**: "Login as org" for troubleshooting (with audit trail)

### Bulk Actions
- Mass email to org admins
- Bulk plan changes
- Export org data to CSV

---

## 2. Billing & Subscriptions

### Revenue Dashboard
- **MRR** (Monthly Recurring Revenue)
- **ARR** (Annual Recurring Revenue)
- **Churn Rate**: Monthly/quarterly trends
- **LTV** (Lifetime Value) per plan tier
- **Upgrade/Downgrade** trends

### Subscription Management
- View all subscriptions by status
- Upgrade/downgrade organizations
- Apply discounts or credits
- Extend trial periods
- Cancel subscriptions

### Invoice & Payments
- Invoice history per org
- Resend invoices
- Issue refunds
- Handle payment disputes
- Failed payment retry queue

### Coupon Management
- Create promo codes (% off, fixed amount, free months)
- Set expiration dates and usage limits
- Track redemptions

---

## 3. Phone Number Management

### Number Inventory
| Field | Description |
|-------|-------------|
| Phone Number | The actual number (+1 xxx xxx xxxx) |
| VAPI Phone ID | VAPI's internal identifier |
| Type | Shared (KeepFlock) or Dedicated |
| Assigned To | Organization name or "Shared Pool" |
| CNAM | Caller ID name displayed |
| Status | Active, Suspended, Available |
| Monthly Cost | Twilio cost for this number |

### Actions
- **Provision New Number**: Purchase from Twilio, register in VAPI
- **Assign to Org**: Link dedicated number to premium org
- **Update CNAM**: Change caller ID display name
- **Release Number**: Reclaim from churned org, return to pool
- **Check Health**: Spam score, carrier status

### Default Phone Number
- Set the default VAPI phone number ID for shared/free tier
- Current: `4bbb7357-7ea4-4cb2-ae29-244466d5d0ec`

---

## 4. Usage Analytics

### Platform Overview
- Total calls made (today/week/month/all-time)
- Total minutes consumed
- Total messages sent
- Active campaigns running

### Call Analytics
- Success rate (completed vs failed/busy/no-answer)
- Average call duration
- Peak usage times
- Geographic distribution

### Top Organizations
- By call volume
- By minutes used
- By revenue generated
- By growth rate

### Cost Analysis
- VAPI/Twilio costs vs revenue
- Margin per organization
- Cost per minute trends

---

## 5. Trust & Safety

### Content Moderation
- Review flagged call scripts
- Block abusive content
- Suspend orgs violating terms

### Spam Prevention
- Monitor high-volume callers
- Detect suspicious patterns
- Carrier complaint tracking

### Compliance
- TCPA compliance status
- Opt-out list management
- Do-not-call registry checks

### Blocklist
- Global blocklist (numbers never to call)
- Per-org blocklists
- Import/export blocklists

---

## 6. System Operations

### Health Dashboard
- Edge function status (green/yellow/red)
- API response times
- Error rates by function
- Database connection status

### Queue Monitor
- Pending calls in queue
- Scheduled campaigns
- Processing status
- Retry queue

### Error Logs
- Failed calls with reasons
- Webhook delivery failures
- Integration errors
- Searchable by org, date, error type

### Feature Flags
- Enable/disable features globally
- Per-org feature toggles
- A/B test configurations

### Maintenance Mode
- Pause all outgoing calls
- Display maintenance message
- Scheduled maintenance windows

---

## 7. Customer Support

### Support Tools
- Search org by any field
- View full activity timeline
- Quick actions:
  - Reset password
  - Resend verification email
  - Clear cache
  - Force sync

### Announcements
- In-app notifications
- Scheduled maintenance alerts
- Feature launch announcements

### Feedback
- NPS survey results
- Feature requests backlog
- Bug reports

---

## 8. Security & Audit

### Admin Users
- List of admin accounts
- Roles: Super Admin, Support, Billing, Read-Only
- Last login, IP address

### Audit Logs
- All admin actions logged
- Timestamp, admin user, action, target org
- IP address, user agent
- Searchable and exportable

### API Keys
- Manage integration API keys
- Usage statistics per key
- Revoke compromised keys

### Security Settings
- Enforce 2FA for admins
- Session timeout settings
- IP allowlist for admin access

---

## 9. Growth & Marketing

### Trial Management
- Active trials list
- Days remaining
- Engagement score (calls made, features used)
- At-risk trials (low engagement)
- Convert/extend actions

### Referral Program
- Referral links per org
- Track successful referrals
- Manage rewards/credits

### Email Campaigns
- Onboarding sequences status
- Re-engagement campaigns
- Announcement emails

---

## Implementation Priority

### Phase 1 (MVP)
1. Organization List + Details
2. Phone Number Management (including default number setting)
3. Basic Usage Stats
4. Error Logs

### Phase 2
5. Billing Dashboard
6. Subscription Management
7. Audit Logs
8. Admin User Management

### Phase 3
9. Advanced Analytics
10. Trust & Safety Tools
11. Feature Flags
12. Marketing Tools

---

## Access Control

| Role | Permissions |
|------|-------------|
| Super Admin | Full access to everything |
| Support | View orgs, impersonate, basic troubleshooting |
| Billing | Subscriptions, invoices, refunds |
| Read-Only | View all, modify nothing |

---

## Technical Notes

- Admin panel should be a separate route (`/admin/*`)
- Protected by role check (user must have `is_super_admin` flag)
- All actions logged to `admin_audit_logs` table
- Consider separate admin database connection for isolation

---

## Future Considerations

- Mobile admin app for on-the-go monitoring
- Slack/Discord integration for alerts
- Automated anomaly detection
- AI-powered support suggestions
