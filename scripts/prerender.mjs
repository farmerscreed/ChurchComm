/**
 * Postbuild prerender script for SEO.
 *
 * Generates static HTML files for each public route so that Google's crawler
 * sees real content instead of an empty <div id="root"></div>.
 *
 * For each route it:
 *  1. Copies dist/index.html as a template
 *  2. Injects route-specific <title>, <meta description>, canonical URL, and OG tags
 *  3. Adds a <noscript> block with key textual content for the route
 *  4. Writes the file to dist/<route>/index.html
 *
 * The SPA JavaScript still loads and hydrates on top, so interactive behavior
 * is unaffected.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const BASE_URL = "https://keepflock.com";

const routes = [
  {
    path: "/",
    title: "KeepFlock - AI-Powered Church Growth Platform | Google Ad Grants + AI Outreach",
    description:
      "KeepFlock qualifies your church for $10,000/mo in free Google Ads, then AI creates, manages, and optimizes your campaigns hands-free. AI-powered calls for birthdays, visitor follow-ups, and outreach. From $59/mo.",
    noscript: `
      <h1>KeepFlock - AI-Powered Church Growth Platform</h1>
      <p>KeepFlock qualifies your church for Google Ad Grants ($10,000/month in free Google Ads), then AI creates, manages, and optimizes your campaigns hands-free — so you can focus on ministry.</p>
      <p>Managed services charge $8,000+/mo. KeepFlock starts from $59/mo.</p>
      <h2>What KeepFlock Does</h2>
      <ul>
        <li>REACH: Google Ad Grant qualification and application</li>
        <li>ATTRACT: AI-powered ad campaign creation and management</li>
        <li>GUARDIAN: 24/7 compliance monitoring and auto-optimization</li>
        <li>ENGAGE: AI-powered phone calls for birthdays, visitor follow-ups, and outreach</li>
      </ul>
      <p><a href="/pricing">View Pricing</a> | <a href="/demo">Try the Demo</a> | <a href="/check">Check Eligibility</a></p>
    `,
  },
  {
    path: "/pricing",
    title: "Pricing - KeepFlock | AI Church Growth Plans from $59/mo",
    description:
      "Choose the right KeepFlock plan for your church. REACH (free Google Ad Grant qualification), ATTRACT ($59/mo AI ad management), ENGAGE (AI-powered member outreach calls). No long-term contracts.",
    noscript: `
      <h1>KeepFlock Pricing</h1>
      <p>Affordable AI-powered church growth. No long-term contracts required.</p>
      <h2>Plans</h2>
      <ul>
        <li>REACH: Free Google Ad Grant eligibility check and guided application</li>
        <li>ATTRACT: AI-powered Google Ads management with GUARDIAN compliance monitoring</li>
        <li>ENGAGE: AI phone calls for birthdays, visitor follow-ups, and outreach campaigns</li>
      </ul>
      <p><a href="/">Back to Home</a> | <a href="/demo">Try the Demo</a></p>
    `,
  },
  {
    path: "/demo",
    title: "Live Demo - KeepFlock | See AI Church Management in Action",
    description:
      "Experience KeepFlock firsthand. See how AI manages Google Ad Grants, creates campaigns, monitors compliance, and handles member outreach calls for your church.",
    noscript: `
      <h1>KeepFlock Live Demo</h1>
      <p>Experience the KeepFlock platform firsthand. Our AI assistant will walk you through how KeepFlock helps your church grow.</p>
      <h2>What You'll See</h2>
      <ul>
        <li>AI-powered campaign dashboard</li>
        <li>Google Ad Grant compliance monitoring</li>
        <li>Automated member outreach calls</li>
        <li>Birthday and visitor follow-up automation</li>
      </ul>
      <p><a href="/">Back to Home</a> | <a href="/pricing">View Pricing</a></p>
    `,
  },
  {
    path: "/check",
    title: "Check Google Ad Grant Eligibility - KeepFlock | Free 60-Second Check",
    description:
      "Find out in 60 seconds if your church qualifies for $10,000/month in free Google Ads. Our checker scans your nonprofit status, website, and mission alignment.",
    noscript: `
      <h1>Check Your Google Ad Grant Eligibility</h1>
      <p>Find out in 60 seconds if your church qualifies for $10,000/month in free Google Ads through the Google Ad Grants program.</p>
      <p>Our checker reviews your nonprofit status, website readiness, and mission alignment to determine eligibility.</p>
      <p><a href="/">Back to Home</a> | <a href="/pricing">View Pricing</a></p>
    `,
  },
  {
    path: "/privacy",
    title: "Privacy Policy - KeepFlock",
    description:
      "KeepFlock privacy policy. Learn how we collect, use, and protect your church data and member information.",
    noscript: `
      <h1>KeepFlock Privacy Policy</h1>
      <p>Learn how KeepFlock collects, uses, and protects your church data and member information.</p>
      <p><a href="/">Back to Home</a> | <a href="/terms">Terms of Service</a></p>
    `,
  },
  {
    path: "/terms",
    title: "Terms of Service - KeepFlock",
    description:
      "KeepFlock terms of service. Review the terms and conditions for using the KeepFlock AI church management platform.",
    noscript: `
      <h1>KeepFlock Terms of Service</h1>
      <p>Review the terms and conditions for using the KeepFlock AI church management platform.</p>
      <p><a href="/">Back to Home</a> | <a href="/privacy">Privacy Policy</a></p>
    `,
  },
];

// Read the built index.html as template
const template = fs.readFileSync(path.join(DIST, "index.html"), "utf-8");

for (const route of routes) {
  const canonical = `${BASE_URL}${route.path === "/" ? "" : route.path}`;
  let html = template;

  // Replace <title>
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${route.title}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${route.description}"`
  );

  // Replace canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${canonical}"`
  );

  // Replace OG tags
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${route.title}"`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${route.description}"`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${canonical}"`
  );

  // Replace Twitter tags
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${route.title}"`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${route.description}"`
  );

  // Inject noscript content inside <div id="root"> so crawlers see real text
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"><noscript>${route.noscript.trim()}</noscript></div>`
  );

  // Determine output path
  if (route.path === "/") {
    // Overwrite the root index.html
    fs.writeFileSync(path.join(DIST, "index.html"), html, "utf-8");
    console.log(`  prerendered: / -> dist/index.html`);
  } else {
    const dir = path.join(DIST, route.path);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
    console.log(`  prerendered: ${route.path} -> dist${route.path}/index.html`);
  }
}

console.log(`\nPrerendered ${routes.length} public routes for SEO.`);
