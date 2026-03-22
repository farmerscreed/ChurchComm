# 💰 ChurchComm Pricing & Profitability Analysis

This document outlines the cost structure, margin analysis, and recommended pricing strategy to ensure ChurchComm is profitable and scalable.

## 1. Operational Cost Analysis

### A. AI Voice Calling (Major Cost Driver)
Using VAPI.ai + LLM + STT/TTS providers.

| Component | Provider | Est. Cost per Minute |
|-----------|----------|----------------------|
| **Orchestration** | VAPI.ai Base | $0.05 |
| **LLM Intelligence** | GPT-4o | ~$0.02 (approx 1k tokens) |
| **Transcriber (STT)** | Deepgram Nova 2 | $0.0043 |
| **Voice (TTS)** | Deepgram Aura | $0.015 |
| **Telephony** | Twilio/Vonage | $0.01 |
| **TOTAL (Standard)** | **Standard Stack** | **~$0.10 / min** |

*Note: Using Premium Voices (11Labs) adds ~$0.05-$0.08/min, raising cost to ~$0.18/min.*

### B. SMS Messaging (Twilio)
| Component | Cost |
|-----------|------|
| **SMS Segment** | ~$0.0079 (US) |
| **Phone Number** | $1.15 / month |

*Risk: "Unlimited SMS" can be dangerous. A user sending 5,000 texts costs you $40.*

---

## 2. Recommended Pricing Tiers (Sustainable Model)

To maintain a healthy SaaS margin (**target >60%**), we recommend the following structure. This balances affordability for churches with business safety.

### 🟢 Tier 1: Starter
**Target**: Small churches, church plants.
*   **Price**: **$49 / month**
*   **Includes**:
    *   **60 AI Minutes** (Cost: $6.00)
    *   **500 SMS Segments** (Cost: $4.00)
    *   Core CRM Features
*   **Total Operations Cost**: ~$10.00
*   **Gross Profit**: **$39.00** (Margin: 79%) 

### 🔵 Tier 2: Growth (Most Popular)
**Target**: Mid-sized churches, active outreach.
*   **Price**: **$119 / month**
*   **Includes**:
    *   **200 AI Minutes** (Cost: $20.00)
    *   **2,000 SMS Segments** (Cost: $16.00)
    *   Advanced Workflows & Triggers
*   **Total Operations Cost**: ~$36.00
*   **Gross Profit**: **$83.00** (Margin: 69%)

### 🟣 Tier 3: Enterprise
**Target**: Large multi-campus, heavy usage.
*   **Price**: **$299 / month**
*   **Includes**:
    *   **600 AI Minutes** (Cost: $60.00)
    *   **Unlimited SMS*** (Soft cap 10k) (Est Cost: ~$50.00)
    *   Dedicated Support
*   **Total Operations Cost**: ~$110.00
*   **Gross Profit**: **$189.00** (Margin: 63%)

---

## 3. Overage Pricing (Pure Profit Enabler)

If users go over their limits, charge a premium rate.

*   **Extra Call Minutes**: Charge **$0.35 / minute**
    *   Cost: $0.10
    *   Profit: $0.25 (250% Markup)
*   **Extra SMS**: Charge **$0.02 / segment**
    *   Cost: $0.008
    *   Profit: $0.012 (150% Markup)

---

## 4. Feature Differentiation

| Feature | Starter ($49) | Growth ($119) | Enterprise ($299) |
|---------|---------------|---------------|-------------------|
| **AI Minutes** | 60 | 200 | 600 |
| **SMS** | 500 | 2,000 | Unlimited* |
| **Voices** | Standard Only | Standard + 1 Premium | All Premium |
| **Campaigns** | Manual Only | Auto-Triggers | Multi-Step Flows |
| **Support** | Email | Priority Chat | Scheduled Calls |

---

## 5. Implementation Guide

### Step 1: Update Stripe Products
Create these new Price points in Stripe Dashboard as **Recurring**:
1.  **Starter**: $49/mo | $490/yr
2.  **Growth**: $119/mo | $1,190/yr
3.  **Enterprise**: $299/mo | $2,990/yr

### Step 2: Pay-As-You-Go Setup
In Stripe, enable **Usage-Based Billing** (Metered Billing) for overages, or simply have a "Top Up" system in the app where they buy credit packs (e.g., "$50 for 200 credits").
*Top Up packs are easier to implement than metered billing.*

### Step 3: Cost Control
*   **Default to Deepgram Voices** (Standard) in VAPI config.
*   **Use GPT-4o-mini** for simple tasks (confirmations, reminders).
*   **Monitor heavy SMS users** and alert them at 80% usage.

---
**Recommendation**: Adopt this **Sustainable Model**. The previous price points ($29/$79) are too low for a product with high variable costs like telephony and AI voice.
