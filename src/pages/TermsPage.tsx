import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";

export default function TermsPage() {
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Terms of Service</h1>
                    <p className="text-slate-400 mb-10">Last updated: March 2026</p>

                    <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 leading-relaxed">

                        <p>
                            These Terms of Service ("Terms") govern your use of KeepFlock, a product of
                            LawOne Cloud LLC ("we," "us," or "our"). By creating an account or using the
                            Service, you agree to these Terms. If you do not agree, do not use KeepFlock.
                        </p>

                        {/* 1 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using KeepFlock, you confirm that you have the authority to
                                bind your organization to these Terms and that you accept them on behalf of
                                your church or nonprofit. If you are using KeepFlock on behalf of an
                                organization, "you" refers to both you individually and the organization.
                            </p>
                        </section>

                        {/* 2 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">2. Description of Service</h2>
                            <p>
                                KeepFlock is a platform designed to help churches grow their online presence and
                                engage their communities. The Service includes three tiers:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong className="text-slate-100">REACH (Free)</strong> — Free tools including a
                                    website grader, SEO audit, and Google Ad Grant eligibility checker to help
                                    churches assess their online readiness.
                                </li>
                                <li>
                                    <strong className="text-slate-100">ATTRACT</strong> — GUARDIAN compliance monitoring
                                    for Google Ad Grant accounts, plus AdPilot automated campaign creation,
                                    management, and optimization powered by AI.
                                </li>
                                <li>
                                    <strong className="text-slate-100">ENGAGE</strong> — AI-powered voice calls, SMS
                                    outreach, and a People CRM for church member communication and follow-up.
                                </li>
                            </ul>
                        </section>

                        {/* 3 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">3. Account Registration</h2>
                            <p>
                                To use KeepFlock beyond the free REACH tools, you must create an account. When
                                registering, you agree to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Provide accurate, current, and complete information about yourself and your organization</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Notify us immediately of any unauthorized access to your account</li>
                                <li>Register one account per organization (multiple users may be invited to a single organization account)</li>
                            </ul>
                            <p>
                                KeepFlock is intended for churches, houses of worship, and nonprofit religious
                                organizations. We reserve the right to verify your organization's eligibility
                                and to close accounts that do not meet these criteria.
                            </p>
                        </section>

                        {/* 4 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">4. Google Ads Integration</h2>
                            <p>
                                KeepFlock connects to your Google Ads account through Google's OAuth 2.0
                                authorization. By granting access, you authorize us to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Read your Google Ads account data, including campaigns, ad groups, keywords, and performance metrics</li>
                                <li>Monitor your account for compliance with Google Ad Grant policies</li>
                                <li>Create new campaigns, ad groups, ads, and keywords on your behalf (AdPilot feature)</li>
                                <li>Modify bids, pause underperforming keywords, and adjust campaign settings to maintain compliance and improve performance</li>
                            </ul>
                            <p>
                                You remain the owner of your Google Ads account at all times. You are
                                responsible for reviewing changes KeepFlock makes and for your account's
                                overall compliance with Google's policies. You can revoke KeepFlock's access
                                at any time through your Google account settings.
                            </p>
                            <p>
                                We are not a Google partner or agent. We provide tools that operate within
                                your Google Ads account based on the permissions you grant. Google may change
                                its policies, APIs, or Ad Grant requirements at any time, which may affect
                                the Service's functionality.
                            </p>
                        </section>

                        {/* 5 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">5. AI-Generated Content</h2>
                            <p>
                                KeepFlock uses artificial intelligence to generate ad copy (headlines,
                                descriptions, sitelinks), keyword suggestions, call scripts, and other
                                content. Regarding AI-generated content:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>All AI-generated ad copy is provided as a starting point. You should review and approve content before it goes live in your Google Ads account.</li>
                                <li>We do not guarantee that AI-generated ads will be approved by Google. Ad approval is subject to Google's advertising policies.</li>
                                <li>AI-generated call scripts are templates. You are responsible for ensuring outreach content is appropriate for your congregation.</li>
                                <li>AI output may occasionally contain errors or produce content that does not align with your church's messaging. Review is your responsibility.</li>
                            </ul>
                        </section>

                        {/* 6 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">6. Billing and Payments</h2>
                            <p>
                                Paid features are billed through LemonSqueezy, our payment processor.
                                By subscribing, you agree to the following:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Subscriptions are available on monthly or annual billing cycles</li>
                                <li>New paid subscriptions include a 14-day free trial. You will not be charged during the trial period.</li>
                                <li>After the trial, your payment method will be charged automatically at the start of each billing cycle</li>
                                <li>You can cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.</li>
                                <li>We do not offer prorated refunds for partial billing periods</li>
                                <li>Prices may change with 30 days' advance notice</li>
                            </ul>
                            <p>
                                All payment processing is handled by LemonSqueezy. We do not store your
                                credit card information on our servers.
                            </p>
                        </section>

                        {/* 7 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">7. Free Tier</h2>
                            <p>
                                REACH tools (website grader, SEO audit, Ad Grant eligibility checker) are
                                currently available at no cost. We reserve the right to modify, limit, or
                                discontinue free features at any time. If we remove free access to a feature
                                you rely on, we will give you reasonable notice.
                            </p>
                        </section>

                        {/* 8 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">8. Acceptable Use</h2>
                            <p>You agree not to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Provide false or misleading church or organization information</li>
                                <li>Use KeepFlock to create deceptive, misleading, or fraudulent advertisements</li>
                                <li>Deliberately game or circumvent Google Ad Grant rules or policies</li>
                                <li>Import church member data without appropriate consent from those individuals</li>
                                <li>Use the ENGAGE feature to harass, spam, or send unsolicited communications to people who have not opted in</li>
                                <li>Attempt to access other organizations' data or interfere with the Service's operation</li>
                                <li>Resell, sublicense, or redistribute the Service without our written permission</li>
                                <li>Use the Service for any purpose unrelated to your church or nonprofit's legitimate outreach</li>
                            </ul>
                            <p>
                                Violation of these rules may result in immediate suspension or termination of
                                your account.
                            </p>
                        </section>

                        {/* 9 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">9. Intellectual Property</h2>
                            <p>
                                <strong className="text-slate-100">Our property:</strong> KeepFlock, including its
                                software, design, features, documentation, branding, and underlying technology,
                                is owned by LawOne Cloud LLC and protected by applicable intellectual property
                                laws. Your subscription grants you a limited, non-exclusive, non-transferable
                                license to use the Service.
                            </p>
                            <p>
                                <strong className="text-slate-100">Your data:</strong> You retain ownership of all
                                data you provide to KeepFlock, including church information, member data, and
                                any content you create or upload. By using the Service, you grant us a limited
                                license to process your data solely to provide and improve the Service.
                            </p>
                        </section>

                        {/* 10 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">10. Limitation of Liability</h2>
                            <p>
                                To the maximum extent permitted by law, LawOne Cloud LLC is not liable for:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Google suspending, limiting, or revoking your Ad Grant or Google Ads account for any reason</li>
                                <li>The performance or results of any Google Ads campaign, whether created manually or through AdPilot</li>
                                <li>Outcomes of AI-generated voice calls or SMS messages, including recipient responses or complaints</li>
                                <li>Losses resulting from AI-generated ad copy that is disapproved by Google or fails to perform</li>
                                <li>Downtime, data loss, or service interruptions caused by third-party providers (Google, LemonSqueezy, Vapi, etc.)</li>
                                <li>Any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service</li>
                            </ul>
                            <p>
                                Our total liability for any claim arising from or related to the Service is
                                limited to the amount you paid us in the 12 months preceding the claim.
                            </p>
                            <p>
                                The Service is provided "as is" and "as available" without warranties of any
                                kind, either express or implied, including but not limited to implied
                                warranties of merchantability, fitness for a particular purpose, and
                                non-infringement.
                            </p>
                        </section>

                        {/* 11 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">11. Termination</h2>
                            <p>
                                <strong className="text-slate-100">By you:</strong> You can cancel your subscription
                                and close your account at any time from your dashboard or by contacting us at{" "}
                                <a href="mailto:support@keepflock.com" className="text-purple-400 hover:text-purple-300 underline">
                                    support@keepflock.com
                                </a>. Upon cancellation, you retain access through the end of your current
                                billing period.
                            </p>
                            <p>
                                <strong className="text-slate-100">By us:</strong> We may suspend or terminate your
                                account immediately if you violate these Terms, engage in fraudulent activity,
                                or use the Service in a way that harms other users or our systems. We will
                                make reasonable efforts to notify you, except where prohibited by law or where
                                immediate action is necessary to prevent harm.
                            </p>
                            <p>
                                Upon termination, your right to use the Service ends. We will delete your
                                data in accordance with our{" "}
                                <Link to="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                                    Privacy Policy
                                </Link>.
                            </p>
                        </section>

                        {/* 12 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">12. Governing Law</h2>
                            <p>
                                These Terms are governed by and construed in accordance with the laws of the
                                State of Delaware, United States, without regard to conflict of law principles.
                                Any disputes arising from these Terms or your use of the Service shall be
                                resolved in the state or federal courts located in Delaware.
                            </p>
                        </section>

                        {/* 13 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">13. Changes to These Terms</h2>
                            <p>
                                We may update these Terms from time to time. When we make material changes, we
                                will notify you by email or through a notice in the Service at least 14 days
                                before the changes take effect. Your continued use of KeepFlock after the
                                effective date constitutes acceptance of the updated Terms. If you disagree
                                with the changes, you may close your account before they take effect.
                            </p>
                        </section>

                        {/* 14 */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">14. Contact Us</h2>
                            <p>
                                If you have questions about these Terms or need to report a violation,
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
