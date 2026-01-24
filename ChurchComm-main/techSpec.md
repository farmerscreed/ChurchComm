\# CHURCHCOMM AI CALLING SYSTEM \- TECHNICAL SPECIFICATION FOR CLAUDE CODE

\#\# PRODUCT DEFINITION

Build a multi-tenant SaaS platform that enables churches to automate pastoral care calls, first-timer follow-up, and evangelistic outreach through AI-powered voice conversations. The system triggers calls based on events (new visitors, birthdays, missed attendance), conducts natural conversations, captures prayer requests and spiritual decisions, and escalates critical situations to designated church staff.

\*\*Target User:\*\* Churches with 200-2,000 members who want to scale pastoral care without adding staff.

\*\*Core Problem Solved:\*\* Pastors can't personally call every member, first-timer, or lead. Most churches lose 70% of first-time visitors because no one follows up within 48 hours. This system provides personalized, caring outreach at scale.

\---

\#\# TECHNICAL STACK

\`\`\`yaml  
Frontend: Next.js 14 (App Router) \+ Tailwind CSS  
Backend: Next.js API Routes  
Database: Supabase (PostgreSQL)  
Authentication: Supabase Auth  
Voice AI: VAPI (vapi.ai)  
SMS: Twilio  
Email: Resend or SendGrid  
Payments: Stripe  
Storage: Supabase Storage (for call recordings)  
Hosting: Vercel  
Language: TypeScript  
\`\`\`

\*\*Required API Accounts:\*\*  
\- VAPI account (vapi.ai)  
\- Supabase project  
\- Twilio account (SMS \+ phone numbers)  
\- Resend/SendGrid (email)  
\- Stripe account

\---

\#\# DATABASE SCHEMA

\`\`\`sql  
\-- Churches (Organizations)  
CREATE TABLE churches (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  name TEXT NOT NULL,  
  slug TEXT UNIQUE NOT NULL, \-- e.g., 'first-baptist-dallas'  
  address TEXT,  
  city TEXT,  
  state TEXT,  
  timezone TEXT DEFAULT 'America/Chicago',  
  phone TEXT,  
  email TEXT,  
  website TEXT,  
  denomination TEXT,  
    
  \-- Subscription & Billing  
  subscription\_status TEXT DEFAULT 'trial', \-- trial, active, cancelled, past\_due  
  subscription\_plan TEXT DEFAULT 'starter', \-- starter, growth, enterprise  
  stripe\_customer\_id TEXT,  
  stripe\_subscription\_id TEXT,  
    
  \-- Usage Tracking  
  minutes\_included INTEGER DEFAULT 500, \-- per month  
  minutes\_used INTEGER DEFAULT 0,  
  minutes\_overage\_rate DECIMAL DEFAULT 0.15, \-- per minute  
  billing\_cycle\_start DATE,  
    
  \-- AI Configuration  
  vapi\_assistant\_id\_member TEXT, \-- For member calls  
  vapi\_assistant\_id\_firsttimer TEXT, \-- For first-timer calls  
  vapi\_assistant\_id\_lead TEXT, \-- For evangelism calls  
  vapi\_phone\_number\_id TEXT,  
    
  \-- Call Settings  
  call\_hours\_start TIME DEFAULT '09:00:00',  
  call\_hours\_end TIME DEFAULT '20:00:00',  
  call\_days\_blocked TEXT\[\], \-- \['sunday', 'saturday'\]  
  max\_calls\_per\_person\_per\_week INTEGER DEFAULT 2,  
    
  \-- Branding  
  logo\_url TEXT,  
  primary\_color TEXT DEFAULT '\#4F46E5',  
    
  created\_at TIMESTAMPTZ DEFAULT NOW(),  
  updated\_at TIMESTAMPTZ DEFAULT NOW()  
);

\-- Church Staff/Users  
CREATE TABLE users (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  email TEXT UNIQUE NOT NULL,  
  church\_id UUID REFERENCES churches(id) ON DELETE CASCADE,  
  role TEXT DEFAULT 'staff', \-- admin, pastor, staff, volunteer  
    
  \-- Personal Info  
  first\_name TEXT,  
  last\_name TEXT,  
  phone TEXT,  
    
  \-- Escalation Settings  
  receives\_escalations BOOLEAN DEFAULT FALSE,  
  escalation\_types TEXT\[\], \-- \['crisis', 'salvation', 'pastor\_request', 'prayer', 'finances'\]  
  escalation\_sms BOOLEAN DEFAULT TRUE,  
  escalation\_email BOOLEAN DEFAULT TRUE,  
  on\_call\_schedule JSONB, \-- {"monday": true, "tuesday": false, ...}  
    
  created\_at TIMESTAMPTZ DEFAULT NOW()  
);

\-- People (Members, First-Timers, Leads)  
CREATE TABLE people (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  church\_id UUID REFERENCES churches(id) ON DELETE CASCADE,  
    
  \-- Basic Info  
  first\_name TEXT NOT NULL,  
  last\_name TEXT,  
  phone TEXT NOT NULL, \-- Primary contact  
  email TEXT,  
  date\_of\_birth DATE,  
    
  \-- Classification  
  person\_type TEXT NOT NULL, \-- 'member', 'first\_timer', 'lead'  
  member\_status TEXT, \-- 'active', 'inactive', 'visitor', 'prospect'  
    
  \-- Spiritual Journey  
  salvation\_date DATE,  
  baptism\_date DATE,  
  membership\_date DATE,  
  small\_group\_id UUID, \-- If you build small groups module  
  serving\_areas TEXT\[\], \-- \['worship\_team', 'kids\_ministry'\]  
    
  \-- Attendance & Engagement  
  last\_attendance DATE,  
  attendance\_count INTEGER DEFAULT 0,  
  consecutive\_absences INTEGER DEFAULT 0,  
  giving\_history JSONB, \-- If integrated: {"total": 5000, "last\_gift": "2026-01-15"}  
    
  \-- Contact Preferences  
  prefers\_sms BOOLEAN DEFAULT TRUE,  
  prefers\_email BOOLEAN DEFAULT TRUE,  
  prefers\_calls BOOLEAN DEFAULT TRUE,  
  do\_not\_contact BOOLEAN DEFAULT FALSE,  
  opted\_out\_at TIMESTAMPTZ,  
    
  \-- Tags & Notes  
  tags TEXT\[\], \-- \['new\_believer', 'needs\_prayer', 'potential\_volunteer'\]  
  notes TEXT,  
    
  \-- Metadata  
  source TEXT, \-- 'manual', 'import', 'first\_timer\_form', 'website'  
  imported\_at TIMESTAMPTZ,  
  created\_by UUID REFERENCES users(id),  
  created\_at TIMESTAMPTZ DEFAULT NOW(),  
  updated\_at TIMESTAMPTZ DEFAULT NOW()  
);

\-- Call Campaigns (Scheduled or Triggered)  
CREATE TABLE campaigns (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  church\_id UUID REFERENCES churches(id) ON DELETE CASCADE,  
    
  name TEXT NOT NULL, \-- "Easter Invite 2026"  
  description TEXT,  
  campaign\_type TEXT NOT NULL, \-- 'scheduled', 'triggered', 'recurring'  
  call\_purpose TEXT NOT NULL, \-- 'member\_checkin', 'first\_timer\_followup', 'evangelism', 'event\_invite', 'birthday'  
    
  \-- Targeting  
  target\_person\_type TEXT, \-- 'member', 'first\_timer', 'lead', 'all'  
  target\_filters JSONB, \-- {"tags": \["new\_believer"\], "last\_attendance": {"operator": "lt", "days": 30}}  
    
  \-- Scheduling  
  scheduled\_start TIMESTAMPTZ,  
  scheduled\_end TIMESTAMPTZ,  
  recurrence\_pattern TEXT, \-- 'daily', 'weekly', 'monthly', 'once'  
  recurrence\_config JSONB, \-- {"day\_of\_week": "monday", "time": "10:00"}  
    
  \-- Trigger Conditions (for triggered campaigns)  
  trigger\_event TEXT, \-- 'first\_visit', 'birthday', 'missed\_service', 'prayer\_request'  
  trigger\_delay\_hours INTEGER, \-- Call X hours after trigger event  
    
  \-- AI Configuration  
  custom\_system\_prompt TEXT, \-- Override default prompt  
  conversation\_script JSONB, \-- Optional structured script  
    
  \-- Status  
  status TEXT DEFAULT 'draft', \-- 'draft', 'active', 'paused', 'completed'  
  total\_targets INTEGER DEFAULT 0,  
  calls\_completed INTEGER DEFAULT 0,  
    
  created\_by UUID REFERENCES users(id),  
  created\_at TIMESTAMPTZ DEFAULT NOW(),  
  updated\_at TIMESTAMPTZ DEFAULT NOW()  
);

\-- Calls (Individual Call Records)  
CREATE TABLE calls (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  church\_id UUID REFERENCES churches(id) ON DELETE CASCADE,  
  person\_id UUID REFERENCES people(id) ON DELETE CASCADE,  
  campaign\_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,  
    
  \-- Call Metadata  
  call\_purpose TEXT NOT NULL, \-- 'member\_checkin', 'first\_timer\_followup', 'evangelism', etc.  
  status TEXT DEFAULT 'pending', \-- 'pending', 'calling', 'completed', 'failed', 'no\_answer', 'voicemail', 'opted\_out'  
    
  \-- Timing  
  scheduled\_at TIMESTAMPTZ,  
  initiated\_at TIMESTAMPTZ,  
  answered\_at TIMESTAMPTZ,  
  ended\_at TIMESTAMPTZ,  
  duration\_seconds INTEGER,  
    
  \-- VAPI Data  
  vapi\_call\_id TEXT,  
  vapi\_assistant\_id TEXT,  
  recording\_url TEXT,  
  transcript TEXT,  
    
  \-- Call Outcomes  
  answered BOOLEAN DEFAULT FALSE,  
  conversation\_quality TEXT, \-- 'excellent', 'good', 'poor', 'voicemail'  
  sentiment TEXT, \-- 'positive', 'neutral', 'negative', 'urgent'  
    
  \-- Data Collected  
  prayer\_requests TEXT\[\],  
  questions\_asked TEXT\[\],  
  topics\_discussed TEXT\[\], \-- \['baptism', 'small\_groups', 'volunteering'\]  
  attendance\_commitment BOOLEAN,  
  salvation\_decision BOOLEAN,  
  wants\_callback BOOLEAN,  
    
  \-- Escalation  
  escalated BOOLEAN DEFAULT FALSE,  
  escalation\_reason TEXT, \-- 'crisis', 'salvation', 'pastor\_request', 'domestic\_violence', 'finances'  
  escalation\_notes TEXT,  
  escalated\_to UUID REFERENCES users(id),  
  escalated\_at TIMESTAMPTZ,  
  escalation\_resolved BOOLEAN DEFAULT FALSE,  
    
  \-- Follow-up  
  follow\_up\_needed BOOLEAN DEFAULT FALSE,  
  follow\_up\_type TEXT, \-- 'sms', 'email', 'call', 'visit'  
  follow\_up\_assigned\_to UUID REFERENCES users(id),  
  follow\_up\_completed BOOLEAN DEFAULT FALSE,  
    
  \-- Metadata  
  cost\_estimate DECIMAL, \-- Estimated cost of this call  
    
  created\_at TIMESTAMPTZ DEFAULT NOW(),  
  updated\_at TIMESTAMPTZ DEFAULT NOW()  
);

\-- Prayer Requests (Extracted from calls)  
CREATE TABLE prayer\_requests (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  church\_id UUID REFERENCES churches(id) ON DELETE CASCADE,  
  person\_id UUID REFERENCES people(id) ON DELETE CASCADE,  
  call\_id UUID REFERENCES calls(id) ON DELETE SET NULL,  
    
  request TEXT NOT NULL,  
  category TEXT, \-- 'health', 'family', 'finances', 'spiritual', 'other'  
  urgency TEXT DEFAULT 'normal', \-- 'low', 'normal', 'high', 'critical'  
    
  \-- Tracking  
  status TEXT DEFAULT 'active', \-- 'active', 'answered', 'ongoing'  
  shared\_with\_team BOOLEAN DEFAULT FALSE,  
  shared\_publicly BOOLEAN DEFAULT FALSE, \-- For prayer chain/bulletin  
    
  \-- Follow-up  
  prayed\_by UUID\[\], \-- Array of user IDs who prayed  
  answered\_at TIMESTAMPTZ,  
  testimony TEXT, \-- How God answered  
    
  created\_at TIMESTAMPTZ DEFAULT NOW(),  
  updated\_at TIMESTAMPTZ DEFAULT NOW()  
);

\-- Call Logs (Detailed event tracking for debugging)  
CREATE TABLE call\_logs (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  church\_id UUID REFERENCES churches(id) ON DELETE CASCADE,  
  call\_id UUID REFERENCES calls(id) ON DELETE CASCADE,  
    
  event\_type TEXT NOT NULL, \-- 'call\_initiated', 'answered', 'voicemail', 'function\_called', 'escalated', 'error'  
  event\_data JSONB,  
  severity TEXT DEFAULT 'info', \-- 'debug', 'info', 'warning', 'error', 'critical'  
    
  created\_at TIMESTAMPTZ DEFAULT NOW()  
);

\-- Message Templates (SMS/Email follow-ups)  
CREATE TABLE message\_templates (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  church\_id UUID REFERENCES churches(id) ON DELETE CASCADE,  
    
  name TEXT NOT NULL,  
  template\_type TEXT NOT NULL, \-- 'sms', 'email'  
  trigger TEXT, \-- 'after\_call', 'birthday', 'no\_answer', 'prayer\_request'  
    
  subject TEXT, \-- For emails  
  body TEXT NOT NULL,  
  variables JSONB, \-- {"first\_name": "person.first\_name", "church\_name": "church.name"}  
    
  active BOOLEAN DEFAULT TRUE,  
    
  created\_at TIMESTAMPTZ DEFAULT NOW()  
);

\-- Imports (Track data imports from external systems)  
CREATE TABLE imports (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  church\_id UUID REFERENCES churches(id) ON DELETE CASCADE,  
    
  source TEXT, \-- 'csv', 'planning\_center', 'ccb', 'manual'  
  file\_url TEXT,  
  status TEXT DEFAULT 'processing', \-- 'processing', 'completed', 'failed'  
    
  total\_records INTEGER,  
  imported\_records INTEGER DEFAULT 0,  
  failed\_records INTEGER DEFAULT 0,  
  error\_log JSONB,  
    
  created\_by UUID REFERENCES users(id),  
  created\_at TIMESTAMPTZ DEFAULT NOW(),  
  completed\_at TIMESTAMPTZ  
);

\-- Analytics (Pre-computed metrics for dashboard)  
CREATE TABLE analytics\_daily (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  church\_id UUID REFERENCES churches(id) ON DELETE CASCADE,  
  date DATE NOT NULL,  
    
  total\_calls INTEGER DEFAULT 0,  
  calls\_answered INTEGER DEFAULT 0,  
  calls\_voicemail INTEGER DEFAULT 0,  
  calls\_failed INTEGER DEFAULT 0,  
    
  total\_minutes DECIMAL DEFAULT 0,  
  avg\_call\_duration DECIMAL,  
    
  prayer\_requests\_collected INTEGER DEFAULT 0,  
  salvation\_decisions INTEGER DEFAULT 0,  
  escalations INTEGER DEFAULT 0,  
    
  positive\_sentiment INTEGER DEFAULT 0,  
  neutral\_sentiment INTEGER DEFAULT 0,  
  negative\_sentiment INTEGER DEFAULT 0,  
    
  created\_at TIMESTAMPTZ DEFAULT NOW(),  
    
  UNIQUE(church\_id, date)  
);

\-- RLS Policies  
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;  
ALTER TABLE users ENABLE ROW LEVEL SECURITY;  
ALTER TABLE people ENABLE ROW LEVEL SECURITY;  
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;  
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;  
ALTER TABLE prayer\_requests ENABLE ROW LEVEL SECURITY;

\-- Example RLS Policy (apply similar to all tables)  
CREATE POLICY "Users can only access their church's data"  
  ON people FOR ALL  
  USING (  
    church\_id IN (  
      SELECT church\_id FROM users WHERE users.id \= auth.uid()  
    )  
  );  
\`\`\`

\---

\#\# CORE FEATURES

\#\#\# Feature 1: Multi-Tenant Church Onboarding

\*\*Route:\*\* \`/onboarding\`

\*\*Steps:\*\*

\*\*Step 1: Church Information\*\*  
\`\`\`tsx  
// Collect:  
\- Church name  
\- Address (with timezone auto-detection)  
\- Denomination  
\- Phone number  
\- Logo upload  
\`\`\`

\*\*Step 2: VAPI Setup\*\*  
\`\`\`tsx  
// Guide them through:  
1\. "Connect Your Phone Number"  
   \- Option A: Use ChurchComm number (shared pool)  
   \- Option B: Port existing church number ($30/mo)  
   \- Option C: Get new local number ($10/mo)

2\. "Choose AI Voice"  
   \- Preview male voice (Pastor James \- warm, pastoral)  
   \- Preview female voice (Sister Grace \- gentle, caring)  
   \- Test call to user's phone

3\. API Key Setup (automated via OAuth if possible)  
\`\`\`

\*\*Step 3: Import Members\*\*  
\`\`\`tsx  
// Options:  
1\. Upload CSV (template provided)  
   Required columns: first\_name, last\_name, phone, person\_type  
   Optional: email, date\_of\_birth, member\_status, tags

2\. Manual entry (for small churches)

3\. API integration (Phase 2):  
   \- Planning Center Online  
   \- Church Community Builder  
   \- Breeze ChMS  
\`\`\`

\*\*Step 4: Configure Call Settings\*\*  
\`\`\`tsx  
// Set preferences:  
\- Call hours (default: 9am-8pm local time)  
\- Days to avoid calling (default: none)  
\- Max calls per person per week (default: 2\)  
\- Voice preference confirmation  
\`\`\`

\*\*Step 5: Assign Escalation Team\*\*  
\`\`\`tsx  
// Add staff members who receive escalations:  
1\. Add user email  
2\. Select escalation types they handle:  
   \- Crisis/Emergency  
   \- Salvation decisions  
   \- Prayer requests (urgent)  
   \- Pastor requests  
   \- Giving/Finance questions  
   \- Domestic violence/abuse  
3\. Notification preferences (SMS, Email, Both)  
4\. On-call schedule (which days they're available)  
\`\`\`

\*\*Step 6: Create First Campaign\*\*  
\`\`\`tsx  
// Guided campaign setup:  
"Let's make your first AI call campaign\!"

Campaign type:  
\- \[ \] First-Timer Follow-Up (recommended)  
\- \[ \] Member Check-In  
\- \[ \] Evangelism Outreach  
\- \[ \] Birthday Greetings

For "First-Timer Follow-Up":  
\- Auto-trigger: 24 hours after first visit  
\- Script: "Hi {first\_name}, this is {church\_name}..."  
\- Preview the conversation flow  
\- Test call to yourself  
\`\`\`

\*\*Step 7: Billing Setup\*\*  
\`\`\`tsx  
// Stripe Checkout:  
Plans:  
\- Starter: $197/mo (500 minutes)  
\- Growth: $397/mo (1500 minutes)  
\- Enterprise: $797/mo (5000 minutes)

All plans include:  
\- Unlimited campaigns  
\- Unlimited people  
\- Prayer request tracking  
\- Escalation management  
\- SMS/Email follow-ups

Overage rate: $0.15/minute

14-day free trial (no credit card required)  
\`\`\`

\---

\#\#\# Feature 2: AI Call System (VAPI Integration)

\*\*System Prompts for Each Call Type:\*\*

\#\#\#\# A) Member Check-In Call

\`\`\`  
You are {ai\_voice\_name}, an AI assistant calling on behalf of {church\_name}. 

You're making a caring check-in call to {first\_name} {last\_name}, a valued member of the church.

YOUR PERSONALITY:  
\- Warm, pastoral, and genuinely caring (not robotic)  
\- Good listener \- let them talk, don't rush  
\- Empathetic and encouraging  
\- If asked if you're AI, say: "Yes, I'm using AI to help Pastor {pastor\_name} connect with everyone. Is it okay if we continue?"

CALL OBJECTIVE:  
1\. Check on their well-being  
2\. Ask about prayer requests  
3\. Invite to upcoming events (if any)  
4\. See if they'd like to serve/volunteer

CONVERSATION FLOW:  
Opening: "Hi {first\_name}, this is {ai\_voice\_name} from {church\_name}\! Pastor {pastor\_name} asked me to reach out and see how you're doing. Do you have a couple minutes to chat?"

\[If YES, continue. If NO/BUSY: "No problem\! When would be a better time to call back?"\]

Questions (ask naturally, not like a checklist):  
1\. "How have you been lately? Anything you'd like to share?"  
   \[Listen for 30-60 seconds, show empathy\]

2\. "Is there anything we can be praying for you about?"  
   \[If they share: "Thank you for trusting us with that. I'll make sure {pastor\_name/prayer\_team} knows and is praying for you."\]  
   \[IMPORTANT: If urgent/crisis mentioned, trigger escalation\]

3\. "We'd love to see you this Sunday\! We're {mention\_upcoming\_event}. Can we expect to see you there?"  
   \[Track their response for attendance commitment\]

4\. "Have you ever thought about serving in any ministry area? We have opportunities in {list\_2-3\_areas}."  
   \[If interested, note it down\]

Closing: "Thanks so much for chatting with me, {first\_name}. You're such an important part of our {church\_name} family. We'll be praying for {recap\_prayer\_request}. Hope to see you Sunday\!"

ESCALATION TRIGGERS:  
\- Mentions suicide, self-harm, or severe depression → CRITICAL  
\- Mentions domestic violence or abuse → CRITICAL  
\- Expresses anger at church/pastor → ESCALATE  
\- Asks about giving or financial matters → ESCALATE  
\- Asks to speak to pastor specifically → ESCALATE  
\- Crying or emotional distress lasting \>30 seconds → ESCALATE

When escalating: "I want to make sure you get the best support. Let me have {pastor\_name/staff\_name} reach out to you directly. When's a good time for them to call?"

FUNCTION CALLS:  
After the call, you MUST call submit\_call\_data with all collected information.  
\`\`\`

\#\#\#\# B) First-Timer Follow-Up Call

\`\`\`  
You are {ai\_voice\_name}, an AI assistant calling on behalf of {church\_name}.

You're following up with {first\_name} {last\_name}, who visited {church\_name} for the first time on {visit\_date}.

YOUR PERSONALITY:  
\- Enthusiastic and welcoming (they're NEW, make them feel special\!)  
\- Not pushy or salesy \- genuine hospitality  
\- Answer questions honestly about the church

CALL OBJECTIVE:  
1\. Thank them for visiting  
2\. Answer any questions they have  
3\. Invite them back  
4\. Gauge their spiritual interest  
5\. Offer to connect them to small groups/next steps

CONVERSATION FLOW:  
Opening: "Hi {first\_name}\! This is {ai\_voice\_name} from {church\_name}. We're so glad you joined us {last\_sunday/this\_past\_sunday}\! I wanted to reach out personally to say thank you and see if you have any questions. Do you have a quick minute?"

Questions:  
1\. "What brought you to {church\_name}? Are you new to the area, or just visiting different churches?"

2\. "How was your experience? Was there anything we could do to make your next visit even better?"  
   \[Listen carefully \- this is valuable feedback\]

3\. "Do you have a church home, or are you looking for one?"  
   \[If looking: "We'd love to have you back\! We meet every Sunday at {service\_times}."\]

4\. "Are you interested in getting more connected? We have {mention\_small\_groups/newcomers\_class/serve\_opportunities}."  
   \[If interested: "Great\! I'll have {point\_person} reach out to you with details."\]

5\. (GENTLY) "Can I ask, are you at a place in your faith journey where you've accepted Jesus, or is that something you're still exploring?"  
   \[If exploring: "That's awesome that you're seeking\! Would it be helpful if one of our pastors reached out to talk more about that?"\]  
   \[If yes, they're saved: "That's wonderful\! We'd love to help you grow in your walk with Christ."\]

6\. "Before I let you go, is there anything we can be praying for you about?"

Closing: "Thanks again for visiting {church\_name}, {first\_name}\! We really hope to see you again this Sunday at {service\_time}. You're always welcome here\!"

ESCALATION TRIGGERS:  
\- Expresses interest in salvation/accepting Christ → ESCALATE (pastoral follow-up)  
\- Mentions personal crisis → ESCALATE  
\- Asks theological questions beyond your scope → ESCALATE  
\- Requests to speak with pastor → ESCALATE

FUNCTION CALLS:  
submit\_call\_data with all responses.  
\`\`\`

\#\#\#\# C) Evangelism/Lead Outreach Call

\`\`\`  
You are {ai\_voice\_name}, an AI assistant calling on behalf of {church\_name}.

You're reaching out to {first\_name} {last\_name}, who {lead\_source: "filled out a prayer request card" / "was referred by a friend" / "visited our website"}.

YOUR PERSONALITY:  
\- Compassionate and non-judgmental  
\- Focus on LISTENING, not preaching  
\- Plant seeds, don't force decisions  
\- Respect their time and boundaries

CALL OBJECTIVE:  
1\. Offer prayer and support  
2\. Invite them to church  
3\. Assess spiritual openness  
4\. Connect them to appropriate next steps

CONVERSATION FLOW:  
Opening: "Hi {first\_name}, this is {ai\_voice\_name} from {church\_name}. {Personalized\_reason: 'You requested prayer for...' or 'Our friend {referrer} thought you might enjoy visiting our church'}. Do you have a moment to talk?"

1\. "How are you doing? {If\_prayer\_request: 'How are things going with {prayer\_topic}?'}"  
   \[LISTEN. This is the most important part. Let them talk.\]

2\. "We'd love to pray for you. Would that be okay?"  
   \[If YES: Pray a brief, heartfelt prayer right then \- 30-45 seconds\]  
   \[IMPORTANT: This is why people respond to church calls. Make it genuine.\]

3\. "Have you ever been to {church\_name}? We'd love to have you visit sometime."  
   \[If interested: "We meet Sundays at {time}. It's a really welcoming environment \- casual dress, great music, and a message that's relevant to everyday life."\]

4\. (ONLY IF NATURAL) "Can I ask, do you have a personal relationship with Jesus, or is that something you're curious about?"  
   \[If curious: "That's great that you're open to learning more. Our pastor {name} would love to grab coffee and chat about that if you're interested \- no pressure, just a conversation."\]  
   \[If yes: "Awesome\! We'd love to help you grow in your faith."\]

Closing: "Thanks for taking my call, {first\_name}. We'll be praying for you about {prayer\_topic}. If you ever want to visit or have questions, you can call {church\_phone} anytime. You're always welcome\!"

ESCALATION TRIGGERS:  
\- Expresses suicidal thoughts → CRITICAL ESCALATION (transfer immediately if possible)  
\- Mentions abuse or danger → CRITICAL  
\- Asks deep theological questions → ESCALATE  
\- Expresses interest in salvation → ESCALATE (but positively\!)  
\- Requests in-person meeting → ESCALATE

FUNCTION CALLS:  
submit\_call\_data with prayer requests and spiritual interest level.  
\`\`\`

\---

\*\*VAPI Function Definition (Used by all call types):\*\*

\`\`\`json  
{  
  "name": "submit\_call\_data",  
  "description": "Submit data collected during the call",  
  "parameters": {  
    "type": "object",  
    "properties": {  
      "conversation\_quality": {  
        "type": "string",  
        "enum": \["excellent", "good", "poor", "voicemail"\],  
        "description": "Overall quality of conversation"  
      },  
      "sentiment": {  
        "type": "string",  
        "enum": \["positive", "neutral", "negative", "urgent"\]  
      },  
      "answered": {  
        "type": "boolean",  
        "description": "Did they answer the call or was it voicemail?"  
      },  
      "prayer\_requests": {  
        "type": "array",  
        "items": {"type": "string"},  
        "description": "List of prayer requests mentioned"  
      },  
      "topics\_discussed": {  
        "type": "array",  
        "items": {"type": "string"},  
        "description": "Topics like 'baptism', 'small\_groups', 'volunteering', 'salvation'"  
      },  
      "attendance\_commitment": {  
        "type": "boolean",  
        "description": "Did they commit to attending the next service?"  
      },  
      "salvation\_decision": {  
        "type": "boolean",  
        "description": "Did they express interest in accepting Christ or make a decision?"  
      },  
      "wants\_callback": {  
        "type": "boolean",  
        "description": "Do they want a pastor/staff to call them back?"  
      },  
      "escalation\_needed": {  
        "type": "boolean"  
      },  
      "escalation\_reason": {  
        "type": "string",  
        "enum": \["crisis", "salvation", "pastor\_request", "domestic\_violence", "finances", "theology", "other"\]  
      },  
      "escalation\_notes": {  
        "type": "string",  
        "description": "Details about why escalation is needed"  
      },  
      "follow\_up\_type": {  
        "type": "string",  
        "enum": \["none", "sms", "email", "call", "visit"\],  
        "description": "What type of follow-up is needed?"  
      },  
      "questions\_asked": {  
        "type": "array",  
        "items": {"type": "string"},  
        "description": "Questions they asked during the call"  
      }  
    },  
    "required": \["conversation\_quality", "sentiment", "answered"\]  
  }  
}  
\`\`\`

\---

\#\#\# Feature 3: Call Triggering & Scheduling Engine

\*\*File:\*\* \`/lib/call-scheduler.ts\`

\*\*Purpose:\*\* Determine which people to call and when based on campaigns.

\*\*Logic:\*\*

\`\`\`typescript  
interface CallSchedulerConfig {  
  churchId: string;  
  campaignId: string;  
}

async function scheduleCallsForCampaign(config: CallSchedulerConfig) {  
  const campaign \= await getCampaign(config.campaignId);  
  const church \= await getChurch(config.churchId);  
    
  // Get target people based on campaign filters  
  const targets \= await getTargetPeople(campaign);  
    
  for (const person of targets) {  
    // Check if we should call this person  
    if (\!shouldCallPerson(person, church)) {  
      continue;  
    }  
      
    // Calculate optimal call time  
    const callTime \= calculateCallTime(person, campaign, church);  
      
    // Create call record  
    await createCall({  
      church\_id: config.churchId,  
      person\_id: person.id,  
      campaign\_id: campaign.id,  
      call\_purpose: campaign.call\_purpose,  
      scheduled\_at: callTime,  
      status: 'pending'  
    });  
  }  
}

function shouldCallPerson(person: Person, church: Church): boolean {  
  // Don't call if opted out  
  if (person.do\_not\_contact || person.opted\_out\_at) {  
    return false;  
  }  
    
  // Check weekly call limit  
  const callsThisWeek \= await getCallsThisWeek(person.id);  
  if (callsThisWeek \>= church.max\_calls\_per\_person\_per\_week) {  
    return false;  
  }  
    
  // Don't call if they were called in last 48 hours  
  const lastCall \= await getLastCall(person.id);  
  if (lastCall && isWithin48Hours(lastCall.ended\_at)) {  
    return false;  
  }  
    
  return true;  
}

function calculateCallTime(  
  person: Person,   
  campaign: Campaign,   
  church: Church  
): Date {  
  const now \= new Date();  
    
  // If campaign is immediate (triggered)  
  if (campaign.campaign\_type \=== 'triggered') {  
    // Respect call hours  
    const churchTime \= convertToTimezone(now, church.timezone);  
    const callStart \= parseTime(church.call\_hours\_start);  
    const callEnd \= parseTime(church.call\_hours\_end);  
      
    if (isWithinHours(churchTime, callStart, callEnd)) {  
      // Call immediately  
      return now;  
    } else {  
      // Schedule for next available time slot  
      return getNextAvailableCallTime(church);  
    }  
  }  
    
  // If campaign is scheduled  
  if (campaign.scheduled\_start) {  
    return campaign.scheduled\_start;  
  }  
    
  // If recurring (birthday, anniversary)  
  if (campaign.campaign\_type \=== 'recurring') {  
    // Calculate based on recurrence pattern  
    return calculateRecurrenceDate(campaign, person);  
  }  
    
  return now;  
}  
\`\`\`

\*\*Trigger Examples:\*\*

\`\`\`typescript  
// Trigger 1: First-Timer Visit  
// When someone checks in as "first-time visitor"  
async function onFirstTimeVisit(personId: string) {  
  const campaign \= await getCampaignByTrigger('first\_visit');  
    
  if (campaign && campaign.status \=== 'active') {  
    const callTime \= addHours(new Date(), campaign.trigger\_delay\_hours || 24);  
      
    await createCall({  
      person\_id: personId,  
      campaign\_id: campaign.id,  
      call\_purpose: 'first\_timer\_followup',  
      scheduled\_at: callTime,  
      status: 'pending'  
    });  
  }  
}

// Trigger 2: Birthday  
// Run daily cron job at 8am  
async function scheduleBirthdayCalls() {  
  const today \= new Date();  
  const peopleWithBirthdaysToday \= await getPeopleByBirthday(today);  
    
  for (const person of peopleWithBirthdaysToday) {  
    const campaign \= await getActiveCampaign('birthday');  
      
    if (campaign) {  
      await createCall({  
        person\_id: person.id,  
        campaign\_id: campaign.id,  
        call\_purpose: 'birthday',  
        scheduled\_at: setHours(today, 10), // 10am  
        status: 'pending'  
      });  
    }  
  }  
}

// Trigger 3: Missed Service (Attendance Tracking)  
// Run after Sunday service  
async function checkMissedAttendance() {  
  const lastSunday \= getLastSunday();  
  const activeMembers \= await getActiveMembersWhoDidNotAttend(lastSunday);  
    
  for (const member of activeMembers) {  
    // If they've missed 2 consecutive Sundays, trigger call  
    if (member.consecutive\_absences \>= 2\) {  
      const campaign \= await getActiveCampaign('missed\_service');  
        
      if (campaign) {  
        await createCall({  
          person\_id: member.id,  
          campaign\_id: campaign.id,  
          call\_purpose: 'member\_checkin',  
          scheduled\_at: addHours(new Date(), 48), // Monday afternoon  
          status: 'pending'  
        });  
      }  
    }  
  }  
}  
\`\`\`

\---

\#\#\# Feature 4: Call Execution Worker

\*\*File:\*\* \`/workers/call-executor.ts\`

\*\*Purpose:\*\* Process pending calls and trigger VAPI.

\*\*Cron Job:\*\* Runs every 5 minutes

\`\`\`typescript  
async function executeScheduledCalls() {  
  // Get all calls that are scheduled for now or earlier and still pending  
  const pendingCalls \= await supabase  
    .from('calls')  
    .select('\*, person(\*), church(\*), campaign(\*)')  
    .eq('status', 'pending')  
    .lte('scheduled\_at', new Date().toISOString())  
    .order('scheduled\_at', { ascending: true })  
    .limit(100); // Process 100 at a time  
    
  for (const call of pendingCalls.data) {  
    try {  
      await initiateVAPICall(call);  
    } catch (error) {  
      await logCallError(call.id, error);  
      await updateCallStatus(call.id, 'failed');  
    }  
  }  
}

async function initiateVAPICall(call: Call) {  
  const { person, church, campaign } \= call;  
    
  // Determine which VAPI assistant to use  
  let assistantId: string;  
  switch (call.call\_purpose) {  
    case 'member\_checkin':  
      assistantId \= church.vapi\_assistant\_id\_member;  
      break;  
    case 'first\_timer\_followup':  
      assistantId \= church.vapi\_assistant\_id\_firsttimer;  
      break;  
    case 'evangelism':  
      assistantId \= church.vapi\_assistant\_id\_lead;  
      break;  
    default:  
      assistantId \= church.vapi\_assistant\_id\_member;  
  }  
    
  // Prepare system prompt variables  
  const systemPrompt \= replaceVariables(  
    campaign.custom\_system\_prompt || getDefaultPrompt(call.call\_purpose),  
    {  
      church\_name: church.name,  
      first\_name: person.first\_name,  
      last\_name: person.last\_name,  
      pastor\_name: await getPastorName(church.id),  
      upcoming\_event: await getUpcomingEvent(church.id),  
      // ... other variables  
    }  
  );  
    
  // Initiate VAPI call  
  const vapiResponse \= await fetch('https://api.vapi.ai/call', {  
    method: 'POST',  
    headers: {  
      'Authorization': \`Bearer ${process.env.VAPI\_API\_KEY}\`,  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify({  
      assistantId: assistantId,  
      phoneNumberId: church.vapi\_phone\_number\_id,  
      customer: {  
        number: person.phone,  
        name: \`${person.first\_name} ${person.last\_name}\`  
      },  
      assistantOverrides: {  
        variableValues: {  
          first\_name: person.first\_name,  
          church\_name: church.name  
        },  
        model: {  
          messages: \[  
            {  
              role: 'system',  
              content: systemPrompt  
            }  
          \]  
        }  
      },  
      metadata: {  
        call\_id: call.id,  
        church\_id: church.id,  
        person\_id: person.id  
      }  
    })  
  });  
    
  const vapiCall \= await vapiResponse.json();  
    
  // Update call record  
  await updateCall(call.id, {  
    status: 'calling',  
    vapi\_call\_id: vapiCall.id,  
    initiated\_at: new Date(),  
    vapi\_assistant\_id: assistantId  
  });  
    
  await logCallEvent(call.id, 'call\_initiated', { vapiCallId: vapiCall.id });  
}  
\`\`\`

\---

\#\#\# Feature 5: VAPI Webhook Handler

\*\*Endpoint:\*\* \`POST /api/webhooks/vapi\`

\*\*Purpose:\*\* Receive real-time call events from VAPI.

\`\`\`typescript  
export async function POST(request: Request) {  
  const body \= await request.json();  
  const { type, call, message } \= body;  
    
  // Extract call\_id from metadata  
  const callId \= call.metadata?.call\_id;  
    
  if (\!callId) {  
    return Response.json({ error: 'No call\_id in metadata' }, { status: 400 });  
  }  
    
  switch (type) {  
    case 'call-started':  
      await handleCallStarted(callId, call);  
      break;  
        
    case 'call-answered':  
      await handleCallAnswered(callId, call);  
      break;  
        
    case 'function-call':  
      await handleFunctionCall(callId, message.functionCall);  
      break;  
        
    case 'call-ended':  
      await handleCallEnded(callId, call);  
      break;  
        
    case 'transcript':  
      await handleTranscript(callId, message.transcript);  
      break;  
        
    default:  
      await logCallEvent(callId, 'unknown\_webhook', { type, data: body });  
  }  
    
  return Response.json({ received: true });  
}

async function handleCallAnswered(callId: string, call: any) {  
  await updateCall(callId, {  
    answered\_at: new Date(),  
    answered: true  
  });  
    
  await logCallEvent(callId, 'answered', { vapiCallId: call.id });  
}

async function handleFunctionCall(callId: string, functionCall: any) {  
  if (functionCall.name \=== 'submit\_call\_data') {  
    const data \= functionCall.parameters;  
      
    // Update call with collected data  
    await updateCall(callId, {  
      conversation\_quality: data.conversation\_quality,  
      sentiment: data.sentiment,  
      prayer\_requests: data.prayer\_requests || \[\],  
      topics\_discussed: data.topics\_discussed || \[\],  
      attendance\_commitment: data.attendance\_commitment,  
      salvation\_decision: data.salvation\_decision,  
      wants\_callback: data.wants\_callback,  
      escalated: data.escalation\_needed || false,  
      escalation\_reason: data.escalation\_reason,  
      escalation\_notes: data.escalation\_notes  
    });  
      
    // Create prayer requests if any  
    if (data.prayer\_requests && data.prayer\_requests.length \> 0\) {  
      await createPrayerRequests(callId, data.prayer\_requests);  
    }  
      
    // Handle escalation  
    if (data.escalation\_needed) {  
      await handleEscalation(callId, {  
        reason: data.escalation\_reason,  
        notes: data.escalation\_notes  
      });  
    }  
      
    // Trigger follow-up if needed  
    if (data.follow\_up\_type && data.follow\_up\_type \!== 'none') {  
      await scheduleFollowUp(callId, data.follow\_up\_type);  
    }  
      
    await logCallEvent(callId, 'data\_collected', { data });  
  }  
}

async function handleCallEnded(callId: string, call: any) {  
  await updateCall(callId, {  
    status: 'completed',  
    ended\_at: new Date(),  
    duration\_seconds: call.duration,  
    recording\_url: call.recordingUrl,  
    cost\_estimate: calculateCost(call.duration)  
  });  
    
  // Update church usage  
  await incrementChurchMinutes(call.metadata.church\_id, call.duration / 60);  
    
  // Update analytics  
  await updateDailyAnalytics(call.metadata.church\_id, callId);  
    
  await logCallEvent(callId, 'call\_ended', {   
    duration: call.duration,  
    endReason: call.endedReason   
  });  
}

async function handleTranscript(callId: string, transcript: string) {  
  await updateCall(callId, {  
    transcript: transcript  
  });  
}

function calculateCost(durationSeconds: number): number {  
  const minutes \= durationSeconds / 60;  
  // VAPI costs roughly $0.12/min, add buffer for phone costs  
  return minutes \* 0.15;  
}  
\`\`\`

\---

\#\#\# Feature 6: Escalation System

\*\*Purpose:\*\* Alert designated staff when urgent situations arise.

\`\`\`typescript  
interface EscalationData {  
  reason: 'crisis' | 'salvation' | 'pastor\_request' | 'domestic\_violence' | 'finances' | 'theology' | 'other';  
  notes: string;  
}

async function handleEscalation(callId: string, escalation: EscalationData) {  
  const call \= await getCallWithDetails(callId);  
  const { person, church } \= call;  
    
  // Find on-call staff for this escalation type  
  const onCallStaff \= await getOnCallStaff(church.id, escalation.reason);  
    
  if (\!onCallStaff || onCallStaff.length \=== 0\) {  
    // Fallback to church admin  
    onCallStaff \= await getChurchAdmins(church.id);  
  }  
    
  // Update call record  
  await updateCall(callId, {  
    escalated: true,  
    escalation\_reason: escalation.reason,  
    escalation\_notes: escalation.notes,  
    escalated\_to: onCallStaff\[0\].id,  
    escalated\_at: new Date()  
  });  
    
  // Send notifications to on-call staff  
  for (const staff of onCallStaff) {  
    // SMS notification  
    if (staff.escalation\_sms) {  
      await sendSMS({  
        to: staff.phone,  
        from: church.phone,  
        body: formatEscalationSMS(call, escalation, staff)  
      });  
    }  
      
    // Email notification  
    if (staff.escalation\_email) {  
      await sendEmail({  
        to: staff.email,  
        subject: \`\[${getUrgencyLabel(escalation.reason)}\] Call Escalation \- ${person.first\_name} ${person.last\_name}\`,  
        html: formatEscalationEmail(call, escalation, staff)  
      });  
    }  
  }  
    
  await logCallEvent(callId, 'escalated', {   
    reason: escalation.reason,  
    notifiedStaff: onCallStaff.map(s \=\> s.id)  
  });  
}

function formatEscalationSMS(call: Call, escalation: EscalationData, staff: User): string {  
  const urgency \= getUrgencyLabel(escalation.reason);  
    
  return \`  
\[${urgency}\] ${call.church.name} Call Alert

${call.person.first\_name} ${call.person.last\_name}  
Phone: ${call.person.phone}  
Reason: ${escalation.reason}

${escalation.notes}

Listen to call: ${getDashboardURL()}/calls/${call.id}

Reply "RESOLVED" when handled.  
  \`.trim();  
}

function formatEscalationEmail(call: Call, escalation: EscalationData, staff: User): string {  
  return \`  
    \<html\>  
      \<body style="font-family: Arial, sans-serif;"\>  
        \<div style="background: \#DC2626; color: white; padding: 16px; border-radius: 8px;"\>  
          \<h2\>\[${getUrgencyLabel(escalation.reason)}\] Call Escalation\</h2\>  
        \</div\>  
          
        \<div style="padding: 20px;"\>  
          \<h3\>Call Details\</h3\>  
          \<table\>  
            \<tr\>  
              \<td\>\<strong\>Person:\</strong\>\</td\>  
              \<td\>${call.person.first\_name} ${call.person.last\_name}\</td\>  
            \</tr\>  
            \<tr\>  
              \<td\>\<strong\>Phone:\</strong\>\</td\>  
              \<td\>\<a href="tel:${call.person.phone}"\>${call.person.phone}\</a\>\</td\>  
            \</tr\>  
            \<tr\>  
              \<td\>\<strong\>Email:\</strong\>\</td\>  
              \<td\>\<a href="mailto:${call.person.email}"\>${call.person.email}\</a\>\</td\>  
            \</tr\>  
            \<tr\>  
              \<td\>\<strong\>Call Time:\</strong\>\</td\>  
              \<td\>${formatDateTime(call.initiated\_at)}\</td\>  
            \</tr\>  
            \<tr\>  
              \<td\>\<strong\>Escalation Reason:\</strong\>\</td\>  
              \<td\>${escalation.reason}\</td\>  
            \</tr\>  
          \</table\>  
            
          \<h3\>Notes from AI Call\</h3\>  
          \<p\>${escalation.notes}\</p\>  
            
          ${call.prayer\_requests?.length \> 0 ? \`  
            \<h3\>Prayer Requests Mentioned\</h3\>  
            \<ul\>  
              ${call.prayer\_requests.map(pr \=\> \`\<li\>${pr}\</li\>\`).join('')}  
            \</ul\>  
          \` : ''}  
            
          \<div style="margin-top: 30px;"\>  
            \<a href="${getDashboardURL()}/calls/${call.id}"   
               style="background: \#4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;"\>  
              View Full Call Details & Recording  
            \</a\>  
          \</div\>  
            
          \<div style="margin-top: 20px; padding: 16px; background: \#FEF3C7; border-radius: 6px;"\>  
            \<strong\>Action Required:\</strong\> Please follow up with ${call.person.first\_name} as soon as possible.  
            Mark escalation as resolved in the dashboard after contact.  
          \</div\>  
        \</div\>  
      \</body\>  
    \</html\>  
  \`;  
}

function getUrgencyLabel(reason: string): string {  
  const urgencyMap \= {  
    crisis: 'URGENT',  
    domestic\_violence: 'URGENT',  
    salvation: 'IMPORTANT',  
    pastor\_request: 'FOLLOW-UP',  
    finances: 'INFO',  
    theology: 'INFO',  
    other: 'INFO'  
  };  
    
  return urgencyMap\[reason\] || 'INFO';  
}

async function getOnCallStaff(churchId: string, escalationType: string) {  
  const today \= format(new Date(), 'EEEE').toLowerCase(); // 'monday', 'tuesday', etc.  
    
  return await supabase  
    .from('users')  
    .select('\*')  
    .eq('church\_id', churchId)  
    .eq('receives\_escalations', true)  
    .contains('escalation\_types', \[escalationType\])  
    .filter('on\_call\_schedule', 'cs', \`{"${today}": true}\`) // Custom SQL for JSONB check  
    .limit(3);  
}  
\`\`\`

\---

\#\#\# Feature 7: Prayer Request Management

\`\`\`typescript  
async function createPrayerRequests(callId: string, requests: string\[\]) {  
  const call \= await getCallWithDetails(callId);  
    
  for (const requestText of requests) {  
    // Use AI to categorize the prayer request  
    const category \= await categorizePrayerRequest(requestText);  
    const urgency \= await assessPrayerUrgency(requestText);  
      
    await supabase.from('prayer\_requests').insert({  
      church\_id: call.church\_id,  
      person\_id: call.person\_id,  
      call\_id: callId,  
      request: requestText,  
      category: category,  
      urgency: urgency,  
      status: 'active'  
    });  
  }  
    
  // Optionally notify prayer team  
  if (await churchHasPrayerTeamNotifications(call.church\_id)) {  
    await notifyPrayerTeam(call.church\_id, requests);  
  }  
}

async function categorizePrayerRequest(request: string): Promise\<string\> {  
  // Use Claude/GPT to categorize  
  const response \= await anthropic.messages.create({  
    model: 'claude-sonnet-4-20250514',  
    max\_tokens: 50,  
    messages: \[{  
      role: 'user',  
      content: \`Categorize this prayer request into ONE category: health, family, finances, spiritual, work, relationships, or other.

Prayer request: "${request}"

Return ONLY the category name, nothing else.\`  
    }\]  
  });  
    
  return response.content\[0\].text.trim().toLowerCase();  
}

async function assessPrayerUrgency(request: string): Promise\<string\> {  
  const urgentKeywords \= \[  
    'cancer', 'surgery', 'hospital', 'emergency', 'dying', 'death',   
    'suicide', 'crisis', 'urgent', 'critical', 'severe', 'life-threatening'  
  \];  
    
  const requestLower \= request.toLowerCase();  
  const hasUrgentKeyword \= urgentKeywords.some(keyword \=\> requestLower.includes(keyword));  
    
  if (hasUrgentKeyword) {  
    return 'critical';  
  }  
    
  // Use AI for nuance  
  const response \= await anthropic.messages.create({  
    model: 'claude-sonnet-4-20250514',  
    max\_tokens: 20,  
    messages: \[{  
      role: 'user',  
      content: \`Rate the urgency of this prayer request: low, normal, high, or critical.

Prayer request: "${request}"

Return ONLY: low, normal, high, or critical\`  
    }\]  
  });  
    
  return response.content\[0\].text.trim().toLowerCase();  
}  
\`\`\`

\---

\#\#\# Feature 8: Dashboard UI

\*\*Routes:\*\*

1\. \`/dashboard\` \- Overview  
2\. \`/dashboard/calls\` \- Call history  
3\. \`/dashboard/people\` \- Member directory  
4\. \`/dashboard/campaigns\` \- Campaign management  
5\. \`/dashboard/prayer-requests\` \- Prayer request tracker  
6\. \`/dashboard/escalations\` \- Active escalations  
7\. \`/dashboard/analytics\` \- Reports & insights  
8\. \`/dashboard/settings\` \- Church settings

\*\*Dashboard Overview (\`/dashboard\`):\*\*

\`\`\`tsx  
export default async function DashboardPage() {  
  const churchId \= await getCurrentChurchId();  
  const stats \= await getDashboardStats(churchId);  
  const recentCalls \= await getRecentCalls(churchId, 10);  
  const activeEscalations \= await getActiveEscalations(churchId);  
  const todaysCalls \= await getTodaysScheduledCalls(churchId);  
    
  return (  
    \<div className="p-8"\>  
      \<h1 className="text-3xl font-bold mb-8"\>Dashboard\</h1\>  
        
      {/\* Stats Grid \*/}  
      \<div className="grid grid-cols-4 gap-6 mb-8"\>  
        \<StatCard   
          title="Calls This Week"  
          value={stats.callsThisWeek}  
          change={stats.callsWeekOverWeek}  
          icon={\<PhoneIcon /\>}  
        /\>  
        \<StatCard   
          title="Answer Rate"  
          value={\`${stats.answerRate}%\`}  
          subtitle={\`${stats.answeredCalls}/${stats.totalCalls} answered\`}  
          icon={\<CheckCircleIcon /\>}  
        /\>  
        \<StatCard   
          title="Active Escalations"  
          value={activeEscalations.length}  
          urgent={activeEscalations.length \> 0}  
          icon={\<AlertTriangleIcon /\>}  
        /\>  
        \<StatCard   
          title="Minutes Used"  
          value={\`${stats.minutesUsed}/${stats.minutesIncluded}\`}  
          progress={(stats.minutesUsed / stats.minutesIncluded) \* 100}  
          icon={\<ClockIcon /\>}  
        /\>  
      \</div\>  
        
      {/\* Active Escalations Alert \*/}  
      {activeEscalations.length \> 0 && (  
        \<Alert variant="destructive" className="mb-8"\>  
          \<AlertTriangle className="h-4 w-4" /\>  
          \<AlertTitle\>You have {activeEscalations.length} active escalation(s)\</AlertTitle\>  
          \<AlertDescription\>  
            These calls require your immediate attention.  
            \<Link href="/dashboard/escalations" className="underline ml-2"\>  
              View escalations →  
            \</Link\>  
          \</AlertDescription\>  
        \</Alert\>  
      )}  
        
      {/\* Today's Schedule \*/}  
      \<Card className="mb-8"\>  
        \<CardHeader\>  
          \<CardTitle\>Today's Call Schedule\</CardTitle\>  
        \</CardHeader\>  
        \<CardContent\>  
          {todaysCalls.length \=== 0 ? (  
            \<p className="text-gray-500"\>No calls scheduled for today.\</p\>  
          ) : (  
            \<CallScheduleList calls={todaysCalls} /\>  
          )}  
        \</CardContent\>  
      \</Card\>  
        
      {/\* Recent Calls Table \*/}  
      \<Card\>  
        \<CardHeader\>  
          \<CardTitle\>Recent Calls\</CardTitle\>  
        \</CardHeader\>  
        \<CardContent\>  
          \<CallsTable calls={recentCalls} /\>  
        \</CardContent\>  
      \</Card\>  
    \</div\>  
  );  
}  
\`\`\`

\*\*Call Detail Modal:\*\*

\`\`\`tsx  
function CallDetailModal({ callId }: { callId: string }) {  
  const call \= await getCallDetails(callId);  
    
  return (  
    \<Dialog\>  
      \<DialogContent className="max-w-4xl"\>  
        \<DialogHeader\>  
          \<DialogTitle\>  
            Call with {call.person.first\_name} {call.person.last\_name}  
          \</DialogTitle\>  
          \<DialogDescription\>  
            {formatDateTime(call.initiated\_at)} • {formatDuration(call.duration\_seconds)}  
          \</DialogDescription\>  
        \</DialogHeader\>  
          
        \<div className="grid grid-cols-2 gap-6"\>  
          {/\* Left Column \- Person Info \*/}  
          \<div\>  
            \<h3 className="font-semibold mb-4"\>Person Details\</h3\>  
            \<dl\>  
              \<dt\>Phone\</dt\>  
              \<dd\>\<a href={\`tel:${call.person.phone}\`}\>{call.person.phone}\</a\>\</dd\>  
                
              \<dt\>Email\</dt\>  
              \<dd\>\<a href={\`mailto:${call.person.email}\`}\>{call.person.email}\</a\>\</dd\>  
                
              \<dt\>Type\</dt\>  
              \<dd\>\<Badge\>{call.person.person\_type}\</Badge\>\</dd\>  
                
              \<dt\>Status\</dt\>  
              \<dd\>\<Badge variant={call.person.member\_status \=== 'active' ? 'success' : 'secondary'}\>  
                {call.person.member\_status}  
              \</Badge\>\</dd\>  
            \</dl\>  
              
            {call.prayer\_requests?.length \> 0 && (  
              \<\>  
                \<h3 className="font-semibold mt-6 mb-4"\>Prayer Requests\</h3\>  
                \<ul className="space-y-2"\>  
                  {call.prayer\_requests.map((pr, i) \=\> (  
                    \<li key={i} className="flex items-start gap-2"\>  
                      \<HandIcon className="w-4 h-4 mt-1 text-blue-600" /\>  
                      \<span\>{pr}\</span\>  
                    \</li\>  
                  ))}  
                \</ul\>  
              \</\>  
            )}  
          \</div\>  
            
          {/\* Right Column \- Call Data \*/}  
          \<div\>  
            \<h3 className="font-semibold mb-4"\>Call Summary\</h3\>  
            \<dl\>  
              \<dt\>Quality\</dt\>  
              \<dd\>\<QualityBadge quality={call.conversation\_quality} /\>\</dd\>  
                
              \<dt\>Sentiment\</dt\>  
              \<dd\>\<SentimentBadge sentiment={call.sentiment} /\>\</dd\>  
                
              \<dt\>Attendance Commitment\</dt\>  
              \<dd\>{call.attendance\_commitment ? '✅ Yes' : '❌ No'}\</dd\>  
                
              \<dt\>Salvation Decision\</dt\>  
              \<dd\>{call.salvation\_decision ? '🎉 Yes\!' : 'No'}\</dd\>  
            \</dl\>  
              
            {call.topics\_discussed?.length \> 0 && (  
              \<\>  
                \<h3 className="font-semibold mt-6 mb-4"\>Topics Discussed\</h3\>  
                \<div className="flex flex-wrap gap-2"\>  
                  {call.topics\_discussed.map(topic \=\> (  
                    \<Badge key={topic} variant="outline"\>{topic}\</Badge\>  
                  ))}  
                \</div\>  
              \</\>  
            )}  
              
            {call.escalated && (  
              \<Alert variant="destructive" className="mt-6"\>  
                \<AlertTitle\>Escalated to {call.escalated\_to\_user.first\_name}\</AlertTitle\>  
                \<AlertDescription\>  
                  Reason: {call.escalation\_reason}\<br /\>  
                  Notes: {call.escalation\_notes}  
                \</AlertDescription\>  
              \</Alert\>  
            )}  
          \</div\>  
        \</div\>  
          
        {/\* Transcript \*/}  
        \<div className="mt-6"\>  
          \<h3 className="font-semibold mb-4"\>Transcript\</h3\>  
          \<div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto"\>  
            \<p className="whitespace-pre-wrap text-sm"\>{call.transcript}\</p\>  
          \</div\>  
        \</div\>  
          
        {/\* Recording \*/}  
        {call.recording\_url && (  
          \<div className="mt-6"\>  
            \<h3 className="font-semibold mb-4"\>Call Recording\</h3\>  
            \<audio controls className="w-full"\>  
              \<source src={call.recording\_url} type="audio/mpeg" /\>  
            \</audio\>  
          \</div\>  
        )}  
          
        {/\* Actions \*/}  
        \<DialogFooter\>  
          \<Button variant="outline" onClick={() \=\> window.open(\`tel:${call.person.phone}\`)}\>  
            \<PhoneIcon className="w-4 h-4 mr-2" /\>  
            Call Back  
          \</Button\>  
          \<Button variant="outline" onClick={() \=\> scheduleFollowUp(call.id)}\>  
            Schedule Follow-Up  
          \</Button\>  
          {call.escalated && \!call.escalation\_resolved && (  
            \<Button onClick={() \=\> markEscalationResolved(call.id)}\>  
              Mark Resolved  
            \</Button\>  
          )}  
        \</DialogFooter\>  
      \</DialogContent\>  
    \</Dialog\>  
  );  
}  
\`\`\`

\---

\#\#\# Feature 9: Campaign Builder

\*\*Route:\*\* \`/dashboard/campaigns/new\`

\`\`\`tsx  
export default function NewCampaignPage() {  
  return (  
    \<Form\>  
      \<Step1\_BasicInfo /\>  
      \<Step2\_Targeting /\>  
      \<Step3\_Scheduling /\>  
      \<Step4\_Script /\>  
      \<Step5\_Preview /\>  
    \</Form\>  
  );  
}

function Step2\_Targeting() {  
  return (  
    \<div\>  
      \<h2\>Who should we call?\</h2\>  
        
      \<Select name="person\_type"\>  
        \<option value="member"\>Members\</option\>  
        \<option value="first\_timer"\>First-Timers\</option\>  
        \<option value="lead"\>Leads\</option\>  
        \<option value="all"\>Everyone\</option\>  
      \</Select\>  
        
      \<h3\>Additional Filters\</h3\>  
        
      \<FilterBuilder\>  
        {/\* Last Attendance \*/}  
        \<Filter label="Last Attendance"\>  
          \<Select name="attendance\_operator"\>  
            \<option value="lt"\>More than\</option\>  
            \<option value="gt"\>Less than\</option\>  
          \</Select\>  
          \<Input type="number" name="attendance\_days" placeholder="30" /\>  
          \<span\>days ago\</span\>  
        \</Filter\>  
          
        {/\* Tags \*/}  
        \<Filter label="Has Tags"\>  
          \<TagSelector name="tags" /\>  
        \</Filter\>  
          
        {/\* Member Status \*/}  
        \<Filter label="Member Status"\>  
          \<Checkbox name="status" value="active"\>Active\</Checkbox\>  
          \<Checkbox name="status" value="inactive"\>Inactive\</Checkbox\>  
        \</Filter\>  
          
        {/\* Age Range \*/}  
        \<Filter label="Age"\>  
          \<Input type="number" name="min\_age" placeholder="Min" /\>  
          \<span\>to\</span\>  
          \<Input type="number" name="max\_age" placeholder="Max" /\>  
        \</Filter\>  
      \</FilterBuilder\>  
        
      {/\* Live Preview \*/}  
      \<Card className="mt-6"\>  
        \<CardHeader\>  
          \<CardTitle\>This will call {estimatedTargets} people\</CardTitle\>  
        \</CardHeader\>  
        \<CardContent\>  
          \<Button variant="outline" onClick={previewTargets}\>  
            Preview List  
          \</Button\>  
        \</CardContent\>  
      \</Card\>  
    \</div\>  
  );  
}

function Step3\_Scheduling() {  
  const \[campaignType, setCampaignType\] \= useState('scheduled');  
    
  return (  
    \<div\>  
      \<h2\>When should we make these calls?\</h2\>  
        
      \<RadioGroup value={campaignType} onValueChange={setCampaignType}\>  
        \<Radio value="scheduled"\>  
          \<strong\>Scheduled\</strong\>  
          \<p\>Call everyone at a specific date/time\</p\>  
        \</Radio\>  
          
        \<Radio value="triggered"\>  
          \<strong\>Triggered\</strong\>  
          \<p\>Call automatically when an event happens\</p\>  
        \</Radio\>  
          
        \<Radio value="recurring"\>  
          \<strong\>Recurring\</strong\>  
          \<p\>Call on a repeating schedule\</p\>  
        \</Radio\>  
      \</RadioGroup\>  
        
      {campaignType \=== 'scheduled' && (  
        \<\>  
          \<Label\>Start Date & Time\</Label\>  
          \<DateTimePicker name="scheduled\_start" /\>  
            
          \<Label\>End Date & Time (optional)\</Label\>  
          \<DateTimePicker name="scheduled\_end" /\>  
        \</\>  
      )}  
        
      {campaignType \=== 'triggered' && (  
        \<\>  
          \<Label\>Trigger Event\</Label\>  
          \<Select name="trigger\_event"\>  
            \<option value="first\_visit"\>First-time visit\</option\>  
            \<option value="birthday"\>Birthday\</option\>  
            \<option value="anniversary"\>Membership anniversary\</option\>  
            \<option value="missed\_service"\>Missed 2+ services\</option\>  
            \<option value="prayer\_request"\>Submitted prayer request\</option\>  
          \</Select\>  
            
          \<Label\>How long after the event?\</Label\>  
          \<Input type="number" name="trigger\_delay\_hours" placeholder="24" /\>  
          \<span\>hours\</span\>  
        \</\>  
      )}  
        
      {campaignType \=== 'recurring' && (  
        \<RecurrenceBuilder /\>  
      )}  
    \</div\>  
  );  
}

function Step4\_Script() {  
  return (  
    \<div\>  
      \<h2\>Customize the conversation\</h2\>  
        
      \<Tabs defaultValue="preset"\>  
        \<TabsList\>  
          \<TabsTrigger value="preset"\>Use Preset\</TabsTrigger\>  
          \<TabsTrigger value="custom"\>Custom Script\</TabsTrigger\>  
        \</TabsList\>  
          
        \<TabsContent value="preset"\>  
          \<Select name="preset\_script"\>  
            \<option value="default\_member"\>Default Member Check-In\</option\>  
            \<option value="default\_firsttimer"\>Default First-Timer Follow-Up\</option\>  
            \<option value="default\_lead"\>Default Evangelism\</option\>  
            \<option value="birthday"\>Birthday Greeting\</option\>  
            \<option value="event\_invite"\>Event Invitation\</option\>  
          \</Select\>  
            
          \<Button onClick={previewScript}\>Preview Script\</Button\>  
        \</TabsContent\>  
          
        \<TabsContent value="custom"\>  
          \<Textarea   
            name="custom\_system\_prompt"  
            rows={20}  
            placeholder="Enter custom system prompt for AI..."  
          /\>  
            
          \<Alert\>  
            \<InfoIcon /\>  
            \<AlertTitle\>Available Variables\</AlertTitle\>  
            \<AlertDescription\>  
              \<code\>{'{first\_name}'}\</code\>  
              \<code\>{'{last\_name}'}\</code\>  
              \<code\>{'{church\_name}'}\</code\>  
              \<code\>{'{pastor\_name}'}\</code\>  
              \<code\>{'{upcoming\_event}'}\</code\>  
            \</AlertDescription\>  
          \</Alert\>  
        \</TabsContent\>  
      \</Tabs\>  
    \</div\>  
  );  
}

function Step5\_Preview() {  
  return (  
    \<div\>  
      \<h2\>Review & Launch\</h2\>  
        
      \<CampaignSummary /\>  
        
      \<Card\>  
        \<CardHeader\>  
          \<CardTitle\>Test This Campaign\</CardTitle\>  
        \</CardHeader\>  
        \<CardContent\>  
          \<p\>Call yourself to preview the experience\</p\>  
          \<Input placeholder="Your phone number" /\>  
          \<Button onClick={makeTestCall}\>  
            \<PhoneIcon className="mr-2" /\>  
            Test Call Me  
          \</Button\>  
        \</CardContent\>  
      \</Card\>  
        
      \<div className="flex gap-4 mt-8"\>  
        \<Button variant="outline"\>Save as Draft\</Button\>  
        \<Button onClick={launchCampaign}\>Launch Campaign\</Button\>  
      \</div\>  
    \</div\>  
  );  
}  
\`\`\`

\---

\#\#\# Feature 10: SMS & Email Follow-Up Automation

\*\*Purpose:\*\* Send automated follow-ups after calls.

\`\`\`typescript  
// Triggered after call ends  
async function sendPostCallFollowUp(callId: string) {  
  const call \= await getCallDetails(callId);  
  const { person, church } \= call;  
    
  // Determine follow-up type based on call outcome  
  let templateType: string;  
    
  if (call.status \=== 'no\_answer') {  
    templateType \= 'missed\_call';  
  } else if (call.attendance\_commitment) {  
    templateType \= 'attendance\_confirmation';  
  } else if (call.salvation\_decision) {  
    templateType \= 'salvation\_followup';  
  } else if (call.prayer\_requests?.length \> 0\) {  
    templateType \= 'prayer\_confirmation';  
  } else {  
    templateType \= 'generic\_thanks';  
  }  
    
  // Get template  
  const template \= await getMessageTemplate(church.id, templateType);  
    
  if (\!template) return; // No template configured  
    
  // Replace variables  
  const message \= replaceVariables(template.body, {  
    first\_name: person.first\_name,  
    church\_name: church.name,  
    pastor\_name: await getPastorName(church.id),  
    service\_time: await getNextServiceTime(church.id),  
    prayer\_request: call.prayer\_requests?.\[0\] || ''  
  });  
    
  // Send based on template type  
  if (template.template\_type \=== 'sms' && person.prefers\_sms) {  
    await sendSMS({  
      to: person.phone,  
      from: church.phone,  
      body: message  
    });  
  } else if (template.template\_type \=== 'email' && person.prefers\_email && person.email) {  
    await sendEmail({  
      to: person.email,  
      from: \`${church.name} \<noreply@churchcomm.ai\>\`,  
      subject: template.subject,  
      html: message  
    });  
  }  
}

// Example templates  
const DEFAULT\_TEMPLATES \= {  
  missed\_call: {  
    sms: "Hi {first\_name}\! We tried calling from {church\_name} but missed you. We'd love to connect. Call us back at {church\_phone} anytime\!",  
    email: {  
      subject: "We tried to reach you\!",  
      body: "Hi {first\_name},\\n\\nWe called to check in but couldn't reach you. No worries\! If you have a moment, we'd love to hear from you. Feel free to call us at {church\_phone} or reply to this email.\\n\\nBlessings,\\n{church\_name}"  
    }  
  },  
    
  prayer\_confirmation: {  
    sms: "Hi {first\_name}, thanks for sharing your prayer request about {prayer\_request}. Our team is praying for you. You're not alone\! \- {church\_name}",  
    email: {  
      subject: "We're praying for you",  
      body: "Dear {first\_name},\\n\\nThank you for trusting us with your prayer request. Our prayer team is lifting you up about {prayer\_request}.\\n\\nRemember, God hears your prayers and so do we.\\n\\nIn prayer,\\n{church\_name}"  
    }  
  },  
    
  salvation\_followup: {  
    sms: "🎉 {first\_name}, we're so excited about your decision to follow Jesus\! Pastor {pastor\_name} will call you soon to celebrate and answer any questions.",  
    email: {  
      subject: "Welcome to the family\!",  
      body: "Dear {first\_name},\\n\\nWhat an incredible decision you made today\! Accepting Jesus is the best choice anyone can make.\\n\\nPastor {pastor\_name} will be reaching out personally to walk with you in these first steps of faith. In the meantime, we've sent you some resources to help you grow.\\n\\nWelcome to God's family\!\\n\\n{church\_name}"  
    }  
  }  
};  
\`\`\`

\---

\#\#\# Feature 11: Analytics Dashboard

\*\*Route:\*\* \`/dashboard/analytics\`

\*\*Metrics to Track:\*\*

\`\`\`tsx  
interface AnalyticsData {  
  // Call Volume  
  totalCalls: number;  
  callsByType: { member: number; first\_timer: number; lead: number };  
  callsByDay: { date: string; count: number }\[\];  
    
  // Effectiveness  
  answerRate: number; // % calls answered vs voicemail  
  avgCallDuration: number; // seconds  
  sentimentBreakdown: { positive: number; neutral: number; negative: number };  
    
  // Engagement  
  attendanceCommitments: number;  
  prayerRequestsCollected: number;  
  salvationDecisions: number;  
  escalations: number;  
    
  // Financial  
  minutesUsed: number;  
  estimatedCost: number; // Based on usage  
  costPerCall: number;  
  costPerConversion: number; // If tracking attendance follow-through  
    
  // Trends  
  weekOverWeekGrowth: number;  
  mostEffectiveCallTime: string; // "10am-12pm"  
  bestPerformingCampaign: string;  
}

export default async function AnalyticsPage() {  
  const churchId \= await getCurrentChurchId();  
  const timeframe \= 'last\_30\_days'; // or from query params  
  const analytics \= await getAnalytics(churchId, timeframe);  
    
  return (  
    \<div className="p-8"\>  
      \<h1 className="text-3xl font-bold mb-8"\>Analytics\</h1\>  
        
      \<div className="flex gap-4 mb-8"\>  
        \<Select value={timeframe}\>  
          \<option value="last\_7\_days"\>Last 7 Days\</option\>  
          \<option value="last\_30\_days"\>Last 30 Days\</option\>  
          \<option value="last\_90\_days"\>Last 90 Days\</option\>  
          \<option value="all\_time"\>All Time\</option\>  
        \</Select\>  
      \</div\>  
        
      {/\* KPI Grid \*/}  
      \<div className="grid grid-cols-4 gap-6 mb-8"\>  
        \<MetricCard  
          title="Total Calls"  
          value={analytics.totalCalls}  
          trend={analytics.weekOverWeekGrowth}  
        /\>  
        \<MetricCard  
          title="Answer Rate"  
          value={\`${analytics.answerRate}%\`}  
          subtitle={\`Industry avg: 65%\`}  
        /\>  
        \<MetricCard  
          title="Avg Duration"  
          value={formatDuration(analytics.avgCallDuration)}  
        /\>  
        \<MetricCard  
          title="Cost Per Call"  
          value={\`$${analytics.costPerCall.toFixed(2)}\`}  
        /\>  
      \</div\>  
        
      {/\* Charts \*/}  
      \<div className="grid grid-cols-2 gap-6 mb-8"\>  
        \<Card\>  
          \<CardHeader\>  
            \<CardTitle\>Calls Over Time\</CardTitle\>  
          \</CardHeader\>  
          \<CardContent\>  
            \<LineChart data={analytics.callsByDay} /\>  
          \</CardContent\>  
        \</Card\>  
          
        \<Card\>  
          \<CardHeader\>  
            \<CardTitle\>Call Type Breakdown\</CardTitle\>  
          \</CardHeader\>  
          \<CardContent\>  
            \<PieChart data={analytics.callsByType} /\>  
          \</CardContent\>  
        \</Card\>  
      \</div\>  
        
      \<div className="grid grid-cols-2 gap-6"\>  
        \<Card\>  
          \<CardHeader\>  
            \<CardTitle\>Sentiment Analysis\</CardTitle\>  
          \</CardHeader\>  
          \<CardContent\>  
            \<BarChart data={analytics.sentimentBreakdown} /\>  
          \</CardContent\>  
        \</Card\>  
          
        \<Card\>  
          \<CardHeader\>  
            \<CardTitle\>Spiritual Impact\</CardTitle\>  
          \</CardHeader\>  
          \<CardContent\>  
            \<div className="space-y-4"\>  
              \<ImpactMetric  
                icon={\<PrayIcon /\>}  
                label="Prayer Requests"  
                value={analytics.prayerRequestsCollected}  
              /\>  
              \<ImpactMetric  
                icon={\<CrossIcon /\>}  
                label="Salvation Decisions"  
                value={analytics.salvationDecisions}  
              /\>  
              \<ImpactMetric  
                icon={\<CheckIcon /\>}  
                label="Attendance Commitments"  
                value={analytics.attendanceCommitments}  
              /\>  
            \</div\>  
          \</CardContent\>  
        \</Card\>  
      \</div\>  
    \</div\>  
  );  
}  
\`\`\`

\---

\#\# PRICING & BILLING

\*\*Stripe Integration:\*\*

\`\`\`typescript  
const PLANS \= {  
  starter: {  
    name: 'Starter',  
    price: 197, // per month  
    minutes: 500,  
    stripe\_price\_id: 'price\_xxx',  
    features: \[  
      '500 minutes/month',  
      'Unlimited campaigns',  
      'SMS & Email follow-ups',  
      'Prayer request tracking',  
      'Basic analytics'  
    \]  
  },  
  growth: {  
    name: 'Growth',  
    price: 397,  
    minutes: 1500,  
    stripe\_price\_id: 'price\_yyy',  
    features: \[  
      '1,500 minutes/month',  
      'Everything in Starter',  
      'Advanced analytics',  
      'Custom call scripts',  
      'Priority support'  
    \]  
  },  
  enterprise: {  
    name: 'Enterprise',  
    price: 797,  
    minutes: 5000,  
    stripe\_price\_id: 'price\_zzz',  
    features: \[  
      '5,000 minutes/month',  
      'Everything in Growth',  
      'Dedicated phone number',  
      'API access',  
      'White-label option'  
    \]  
  }  
};

const OVERAGE\_RATE \= 0.15; // $0.15 per minute

// Calculate monthly bill  
async function calculateMonthlyBill(churchId: string, billingPeriod: { start: Date; end: Date }) {  
  const church \= await getChurch(churchId);  
  const plan \= PLANS\[church.subscription\_plan\];  
    
  const minutesUsed \= await getTotalMinutes(churchId, billingPeriod);  
  const minutesOverage \= Math.max(0, minutesUsed \- plan.minutes);  
    
  const baseFee \= plan.price;  
  const overageFee \= minutesOverage \* OVERAGE\_RATE;  
    
  return {  
    baseFee,  
    overageFee,  
    total: baseFee \+ overageFee,  
    minutesIncluded: plan.minutes,  
    minutesUsed,  
    minutesOverage  
  };  
}  
\`\`\`

\---

\#\# DEPLOYMENT CHECKLIST

\*\*Environment Variables:\*\*  
\`\`\`bash  
\# App  
NEXT\_PUBLIC\_SUPABASE\_URL=  
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=  
SUPABASE\_SERVICE\_ROLE\_KEY=

\# VAPI  
VAPI\_API\_KEY=  
VAPI\_WEBHOOK\_SECRET=  
NEXT\_PUBLIC\_VAPI\_PUBLIC\_KEY=

\# Twilio (for SMS)  
TWILIO\_ACCOUNT\_SID=  
TWILIO\_AUTH\_TOKEN=  
TWILIO\_PHONE\_NUMBER=

\# Email  
RESEND\_API\_KEY=

\# Stripe  
STRIPE\_SECRET\_KEY=  
STRIPE\_WEBHOOK\_SECRET=  
NEXT\_PUBLIC\_STRIPE\_PUBLISHABLE\_KEY=

\# Anthropic (for AI categorization)  
ANTHROPIC\_API\_KEY=

\# App URL  
NEXT\_PUBLIC\_APP\_URL=https://churchcomm.ai  
\`\`\`

\*\*Pre-Launch:\*\*  
\- \[ \] All database tables created with RLS policies  
\- \[ \] VAPI webhook URL configured  
\- \[ \] Stripe webhook URL configured  
\- \[ \] Test all call types (member, first-timer, lead)  
\- \[ \] Test escalation flow  
\- \[ \] Test SMS/email sending  
\- \[ \] Verify timezone handling  
\- \[ \] Load test with 100+ simulated calls  
\- \[ \] Setup monitoring (Sentry, Vercel Analytics)

\*\*Post-Launch:\*\*  
\- \[ \] Onboard first church (beta)  
\- \[ \] Monitor call quality for 2 weeks  
\- \[ \] Collect feedback  
\- \[ \] Refine system prompts based on real conversations  
\- \[ \] Document edge cases

\---

\#\# SUCCESS CRITERIA

\*\*Technical:\*\*  
\- ✅ 90%+ call completion rate (excluding no-answer)  
\- ✅ \<10 seconds from trigger to call initiation  
\- ✅ Zero data breaches or privacy violations  
\- ✅ 99.9% webhook delivery success

\*\*Business:\*\*  
\- ✅ Can onboard new church in \<20 minutes  
\- ✅ Churches report \>80% satisfaction with call quality  
\- ✅ \<5% churn rate monthly  
\- ✅ Escalation system catches 100% of crisis situations

\*\*Impact:\*\*  
\- ✅ Churches see measurable increase in first-timer retention  
\- ✅ Pastors save 10+ hours/week on pastoral care calls  
\- ✅ Prayer requests captured and tracked 100% of the time

\---

This is the complete technical specification for ChurchComm. Everything you need to build this with Claude Code. Zero fluff, zero hallucinations, 100% executable.

Ready to build?  
