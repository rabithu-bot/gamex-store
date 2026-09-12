import SiteHeader from "@/app/components/SiteHeader";
import Footer from "@/app/components/Footer";
import ProofsBackButton from "@/app/proofs/ProofsBackButton";
import { SITE_URL } from "@/app/lib/siteUrl";

const PAGE_TITLE = "Privacy Policy | GameX Store";
const PAGE_DESCRIPTION =
  "How GameX Store collects, uses, and protects your information when you buy a verified Free Fire ID account.";

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="container legal-page" style={{ maxWidth: 760 }}>
        <ProofsBackButton />
        <h1>Privacy Policy</h1>
        <p className="muted legal-updated">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

        <p>
          This Privacy Policy explains what information GameX Store ("we", "us", "our") collects
          when you use gamexstore.com (the "Site") to buy a Free Fire ID account, how we use it,
          and the choices you have. We do not require you to create an account or log in to use
          the Site — your order is tied to your browser session, not a stored profile.
        </p>

        <h2>1. What We Collect</h2>
        <p>We only collect what's actually needed to fulfil and support your order:</p>
        <ul>
          <li>
            <strong>Order details</strong> — the name you enter at checkout, the listing you
            purchased, the price, and the order's status history.
          </li>
          <li>
            <strong>Payment proof</strong> — the UPI payment screenshot you upload to verify your
            payment. This image is stored so our team can review it and so a record of the
            payment exists if a dispute needs to be resolved later.
          </li>
          <li>
            <strong>Support messages</strong> — any messages, images, or voice notes you send
            through the order chat, so our team can see the full conversation when responding.
          </li>
          <li>
            <strong>Device/session identifiers</strong> — a browser-based session identifier
            (stored as a cookie) that lets the Site recognize you as the person who placed a
            specific order, without requiring a password or login.
          </li>
          <li>
            <strong>Basic technical data</strong> — standard information any website receives
            when it's visited (such as browser type and general network information), used only
            for security, fraud prevention, and keeping the Site running correctly.
          </li>
          <li>
            <strong>Push notification subscription</strong> — only if you explicitly allow
            notifications in your browser, so we can alert you about your order's status.
          </li>
        </ul>

        <h2>2. How We Use It</h2>
        <p>Everything we collect is used strictly to run the Store, specifically to:</p>
        <ul>
          <li>Verify your payment and confirm your order.</li>
          <li>Deliver your Account Credentials once payment is confirmed.</li>
          <li>Respond to support questions and resolve any issue with your order.</li>
          <li>Detect and prevent fraud, fake payment screenshots, and abuse of the Site.</li>
          <li>Keep a record in case of a future dispute about a specific order.</li>
        </ul>
        <p>
          <strong>We do not use your information for advertising, and we do not build marketing
          profiles from it.</strong>
        </p>

        <h2>3. We Do Not Sell Your Data</h2>
        <p>
          We do not sell, rent, or trade your personal information, order details, or payment
          proofs to any third party, for any purpose, at any time.
        </p>

        <h2>4. Who We Share It With</h2>
        <p>
          We only share information with the small number of service providers necessary to
          actually operate the Site — for example, the infrastructure providers that host the
          Site and store uploaded images, and (where you've enabled it) the browser push
          notification service used to alert you about your order. These providers only process
          data on our behalf, under their own security obligations, and never for their own
          purposes. We may also disclose information if required by law, or to investigate a
          genuine fraud or security incident.
        </p>

        <h2>5. How Long We Keep It</h2>
        <p>
          Order records and payment proofs are kept for as long as reasonably necessary to handle
          disputes, support requests, or legal obligations. An order that is never paid for is
          automatically removed from our systems after a short window rather than kept
          indefinitely.
        </p>

        <h2>6. Cookies &amp; Session Storage</h2>
        <p>
          The Site uses a small number of cookies/local storage entries — none of them are
          third-party advertising or tracking cookies. They exist solely so the Site can recognize
          your own orders and remember basic preferences (like whether you've dismissed a banner)
          without requiring you to create an account.
        </p>

        <h2>7. Your Rights</h2>
        <p>
          You can ask us to tell you what information we hold about a specific order, or to delete
          it, by reaching out through that order's support chat or the official channels linked in
          the footer below. We will action reasonable requests as quickly as we can, subject to
          any records we're legally required to retain.
        </p>

        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy as the Site evolves. The "Last updated" date above
          always reflects the most recent revision. Continued use of the Site after a change means
          you accept the updated policy.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions about this policy or your data can be raised directly through the order chat
          on your order page, or via the official channels linked in the footer below.
        </p>
      </main>
      <Footer />
    </>
  );
}
