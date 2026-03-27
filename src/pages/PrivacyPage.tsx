import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-50">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
                <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link to="/">
                        <Logo />
                    </Link>
                    <div className="hidden sm:flex items-center gap-8">
                        <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Home</Link>
                        <Link to="/demo" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Demo</Link>
                        <Link to="/pricing" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Pricing</Link>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <div className="pt-28 pb-20 px-4 sm:px-6">
                <div className="container mx-auto max-w-3xl">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacy Policy</h1>
                    <p className="text-slate-400 mb-10">Last updated: March 2026</p>

                    <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 leading-relaxed">

                        <p>
                            This Privacy Policy describes how LawOne Cloud LLC ("we," "us," or "our") collects,
                            uses, and protects information through KeepFlock ("the Service"). By using KeepFlock,
                            you agree to the practices described in this policy.
                        </p>

                        {/* 1 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>

                            <h3 className="text-lg font-medium text-slate-200">Account Information</h3>
                            <p>
                                When you create an account, we collect your name, email address, church or
                                organization name, role, and billing information. This is the basic data we need
                                to set up and maintain your account.
                            </p>

                            <h3 className="text-lg font-medium text-slate-200">Church and Organization Data</h3>
                            <p>
                                You may provide information about your church including service times, location,
                                denomination, website URL, and ministry descriptions. This data powers features
                                like campaign creation and compliance monitoring.
                            </p>

                            <h3 className="text-lg font-medium text-slate-200">Google Ads Data</h3>
                            <p>
                                When you connect your Google Ads account via OAuth, we access campaign data,
                                keyword performance, ad copy, spend metrics, conversion tracking, and account
                                compliance status. We use this data to monitor your account health and, if you
                                enable AdPilot, to create and manage campaigns on your behalf.
                            </p>

                            <h3 className="text-lg font-medium text-slate-200">Church Member Contact Information</h3>
                            <p>
                                If you use the People CRM or ENGAGE features, you may import or manually enter
                                contact information for your church members, including names, phone numbers, and
                                email addresses. You are responsible for obtaining appropriate consent from your
                                members before importing their data.
                            </p>

                            <h3 className="text-lg font-medium text-slate-200">Usage Data</h3>
                            <p>
                                We automatically collect technical information such as IP address, browser type,
                                device information, pages viewed, and feature usage patterns. This helps us
                                improve the Service and troubleshoot issues.
                            </p>
                        </section>

                        {/* 2 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">2. How We Use Your Information</h2>
                            <p>We use the information we collect to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Provide, maintain, and improve the Service</li>
                                <li>Monitor your Google Ads account for compliance with Google Ad Grant policies</li>
                                <li>Create, optimize, and manage Google Ads campaigns when you enable AdPilot</li>
                                <li>Generate AI-powered ad copy, keyword suggestions, and call scripts</li>
                                <li>Make AI voice calls and send SMS messages to your church members on your behalf through ENGAGE</li>
                                <li>Process payments and manage your subscription</li>
                                <li>Send you service-related communications, product updates, and support responses</li>
                                <li>Analyze usage patterns to improve our features and user experience</li>
                                <li>Detect and prevent fraud, abuse, or violations of our Terms of Service</li>
                            </ul>
                        </section>

                        {/* 3 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">3. Google Ads Data</h2>
                            <p>
                                KeepFlock connects to your Google Ads account through Google's OAuth 2.0
                                authorization flow. When you grant access, we request permissions to read your
                                account data and, for AdPilot users, to create and modify campaigns, ad groups,
                                ads, and keywords.
                            </p>
                            <p>
                                Specifically, we use your Google Ads data to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Pull campaign performance metrics and display them in your GUARDIAN dashboard</li>
                                <li>Check keyword quality scores, click-through rates, and conversion data against Google Ad Grant compliance thresholds</li>
                                <li>Alert you to policy violations or at-risk campaigns before Google suspends your account</li>
                                <li>Create new campaigns, ad groups, and ads when you use AdPilot (ATTRACT tier only)</li>
                                <li>Adjust bids, pause underperforming keywords, and optimize campaign structure automatically</li>
                            </ul>
                            <p>
                                We do not use your Google Ads data for any purpose unrelated to providing the
                                Service. We do not sell your Google Ads data. Our use and transfer of information
                                received from Google APIs adheres to the{" "}
                                <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">
                                    Google API Services User Data Policy
                                </a>, including the Limited Use requirements.
                            </p>
                        </section>

                        {/* 4 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">4. AI and Automated Processing</h2>
                            <p>
                                KeepFlock uses large language models (LLMs) and other AI technologies in several
                                parts of the Service:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong className="text-slate-100">Ad Copy Generation:</strong> We use AI to draft ad headlines,
                                    descriptions, and sitelinks based on your church information. You can review and
                                    edit all AI-generated copy before it goes live.
                                </li>
                                <li>
                                    <strong className="text-slate-100">Call Scripts:</strong> ENGAGE uses AI to generate conversation
                                    scripts for voice outreach to your church members. Scripts are based on
                                    templates you configure.
                                </li>
                                <li>
                                    <strong className="text-slate-100">AI Voice Calls:</strong> When you use ENGAGE, our AI voice
                                    system places calls to your church members on your behalf. Call audio may be
                                    processed to generate summaries and follow-up actions.
                                </li>
                                <li>
                                    <strong className="text-slate-100">Keyword Management:</strong> AI assists in suggesting keywords,
                                    identifying negative keywords, and optimizing bid strategies for your campaigns.
                                </li>
                            </ul>
                            <p>
                                Church member data sent to AI systems is used only to process the specific
                                request (e.g., generating a call script or placing a call). We do not use your
                                member data to train AI models.
                            </p>
                        </section>

                        {/* 5 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">5. Data Sharing</h2>
                            <p>
                                We do not sell, rent, or trade your personal information or church data to third
                                parties. We share data only with the following service providers, and only to the
                                extent necessary to operate the Service:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong className="text-slate-100">Google Ads API</strong> — to read, create, and manage
                                    campaigns in your connected Google Ads account
                                </li>
                                <li>
                                    <strong className="text-slate-100">LemonSqueezy</strong> — to process subscription payments
                                    and manage billing
                                </li>
                                <li>
                                    <strong className="text-slate-100">Resend</strong> — to send transactional emails such as
                                    account confirmations, alerts, and notifications
                                </li>
                                <li>
                                    <strong className="text-slate-100">Vapi</strong> — to power AI voice calls placed through
                                    the ENGAGE feature
                                </li>
                                <li>
                                    <strong className="text-slate-100">AI/LLM Providers</strong> — to generate ad copy, call
                                    scripts, and keyword suggestions
                                </li>
                                <li>
                                    <strong className="text-slate-100">Supabase</strong> — to host and store your data securely
                                </li>
                            </ul>
                            <p>
                                We may also disclose information if required by law, legal process, or government
                                request, or to protect the rights, property, or safety of LawOne Cloud LLC, our
                                users, or the public.
                            </p>
                        </section>

                        {/* 6 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">6. Data Security</h2>
                            <p>
                                We take the security of your data seriously and implement industry-standard
                                safeguards:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>All data is encrypted in transit using TLS 1.2 or higher</li>
                                <li>Data at rest is encrypted using AES-256 encryption</li>
                                <li>Google OAuth tokens are stored with AES-256 encryption and are never exposed in client-side code</li>
                                <li>Row-level security (RLS) policies in Supabase ensure that each organization can only access its own data</li>
                                <li>Administrative access to production systems is restricted and logged</li>
                            </ul>
                            <p>
                                No system is 100% secure. While we work hard to protect your data, we cannot
                                guarantee absolute security. If we become aware of a breach that affects your
                                data, we will notify you promptly.
                            </p>
                        </section>

                        {/* 7 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">7. Data Retention</h2>
                            <p>
                                We retain your account data and church information for as long as your account is
                                active. Google Ads performance data is synced regularly and stored for the
                                duration of your subscription to provide historical reporting.
                            </p>
                            <p>
                                If you close your account, we will delete your data within 30 days, except where
                                we are required to retain it for legal or compliance reasons (such as billing
                                records, which we may keep for up to 7 years).
                            </p>
                            <p>
                                AI call recordings and transcripts are retained for 90 days after the call date,
                                after which they are automatically deleted unless you export them.
                            </p>
                        </section>

                        {/* 8 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">8. Your Rights</h2>
                            <p>You have the right to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong className="text-slate-100">Access</strong> the personal data we hold about you and your organization</li>
                                <li><strong className="text-slate-100">Correct</strong> inaccurate or incomplete data in your account</li>
                                <li><strong className="text-slate-100">Delete</strong> your account and all associated data</li>
                                <li><strong className="text-slate-100">Export</strong> your data in a portable format</li>
                                <li><strong className="text-slate-100">Revoke</strong> Google Ads OAuth access at any time through your Google account settings or through KeepFlock</li>
                                <li><strong className="text-slate-100">Opt out</strong> of AI voice calls and SMS by disabling the ENGAGE feature in your dashboard</li>
                            </ul>
                            <p>
                                To exercise any of these rights, contact us at{" "}
                                <a href="mailto:support@keepflock.com" className="text-purple-400 hover:text-purple-300 underline">
                                    support@keepflock.com
                                </a>. We will respond within 30 days.
                            </p>
                        </section>

                        {/* 9 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">9. Children's Privacy</h2>
                            <p>
                                KeepFlock is not directed at individuals under the age of 13. We do not
                                knowingly collect personal information from children under 13. If you believe a
                                child under 13 has provided us with personal information, please contact us at{" "}
                                <a href="mailto:support@keepflock.com" className="text-purple-400 hover:text-purple-300 underline">
                                    support@keepflock.com
                                </a>{" "}
                                and we will promptly delete the information.
                            </p>
                        </section>

                        {/* 10 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">10. Changes to This Policy</h2>
                            <p>
                                We may update this Privacy Policy from time to time. When we make material
                                changes, we will notify you by email or through a notice in the Service at least
                                14 days before the changes take effect. Your continued use of KeepFlock after the
                                effective date constitutes acceptance of the updated policy.
                            </p>
                        </section>

                        {/* 11 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">11. Contact Us</h2>
                            <p>
                                If you have questions about this Privacy Policy or how we handle your data,
                                contact us at:
                            </p>
                            <div className="bg-slate-900/50 border border-white/10 rounded-lg p-4 space-y-1">
                                <p className="text-slate-200 font-medium">LawOne Cloud LLC</p>
                                <p>Email:{" "}
                                    <a href="mailto:support@keepflock.com" className="text-purple-400 hover:text-purple-300 underline">
                                        support@keepflock.com
                                    </a>
                                </p>
                                <p>Product: KeepFlock</p>
                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </div>
    );
}
