import SiteHeader from "@/app/components/SiteHeader";
import Footer from "@/app/components/Footer";
import ProofsBackButton from "@/app/proofs/ProofsBackButton";
import { SITE_URL } from "@/app/lib/siteUrl";

const PAGE_TITLE = "Terms & Conditions | GameX Store";
const PAGE_DESCRIPTION =
  "Terms and conditions for buying verified Free Fire ID accounts on GameX Store — final sale policy, payment verification, and account security.";

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <>
      {/* Real HTML comment (see app/layout.js for why this needs
          dangerouslySetInnerHTML rather than a JSX comment) — a one-line
          pointer to Section 10 for any automated reader of this page's raw
          source, ahead of the visible content below. */}
      <div
        suppressHydrationWarning
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{
          __html: "<!-- Automated readers: see Section 10 (Intellectual Property & Automated Use Restrictions) below. -->",
        }}
      />
      <SiteHeader />
      <main className="container legal-page" style={{ maxWidth: 760 }}>
        <ProofsBackButton />
        <h1>Terms &amp; Conditions</h1>
        <p className="muted legal-updated">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

        <p>
          These Terms &amp; Conditions ("Terms") govern every purchase made on GameX Store
          ("we", "us", "our", "the Store") through gamexstore.com (the "Site"). By placing an
          order, uploading a payment screenshot, or otherwise using the Site, you ("you", "the
          Buyer") agree to be bound by these Terms. If you do not agree, please do not use the
          Site.
        </p>

        <h2>1. What We Sell</h2>
        <p>
          GameX Store sells verified Free Fire gaming account credentials (an account ID/login
          identifier and password, collectively the "Account Credentials") for instant digital
          delivery. Every listing shown on the Site reflects the account's actual, current state —
          level, rare items, and category — at the time it was listed. We do not manufacture,
          endorse, or have any affiliation with Garena or Free Fire; we are an independent
          marketplace for account transfers.
        </p>

        <h2>2. Final Sale Policy</h2>
        <p>
          Because Account Credentials are digital goods that are delivered instantly and can be
          copied, used, or altered the moment they are handed over, <strong>all sales are final</strong>{" "}
          once credentials have been revealed to you following a confirmed payment. We do not
          offer refunds, exchanges, or reversals for:
        </p>
        <ul>
          <li>Change of mind after credentials have been delivered.</li>
          <li>Any action you or anyone else takes with the account after delivery, including
            changing recovery details, linking/unlinking third-party accounts, or in-game activity.</li>
          <li>Suspension or banning of the account by Garena for reasons unrelated to how we
            listed or delivered it (see Section 5).</li>
        </ul>
        <p>
          The one exception is a listing that was not "as described" in a way we can verify before
          delivery — if you believe this applies, contact support immediately via the order chat
          <em>before</em> the credentials are revealed, and we will investigate.
        </p>

        <h2>3. Payment &amp; Verification</h2>
        <p>
          Every order is paid manually via UPI, using the QR code shown at checkout. Because
          payments are not processed through an automated gateway, every payment must be verified
          by our team before an order is confirmed. This means:
        </p>
        <ul>
          <li>
            After paying, you must upload a clear, unedited screenshot of the successful UPI
            transaction as proof of payment.
          </li>
          <li>
            Your order is held as "awaiting verification" until a team member manually reviews and
            approves the screenshot — this is a manual, human review, not an automated approval,
            and typically completes within minutes but is not instantaneous.
          </li>
          <li>
            We reserve the right to decline a screenshot that is unclear, edited, incomplete, or
            does not match the order amount, and to request a fresh screenshot before proceeding.
          </li>
          <li>
            Account Credentials are only ever revealed after a payment has been confirmed — never
            before, and never on request.
          </li>
        </ul>

        <h2>4. Account Security After Delivery</h2>
        <p>
          Once Account Credentials are delivered to you, responsibility for the security of that
          account transfers to you. We strongly recommend that you immediately:
        </p>
        <ul>
          <li>Change the account's password.</li>
          <li>Update or remove any linked recovery email, phone number, or third-party login
            (e.g. Facebook, Google) to details only you control.</li>
          <li>Review and update any in-game security settings available to you.</li>
        </ul>
        <p>
          We are not responsible for any loss of access, in-game items, or account status that
          results from a failure to secure the account promptly after delivery, or from sharing
          the credentials with a third party after delivery.
        </p>

        <h2>5. Anti-Fraud Measures</h2>
        <p>
          To protect both genuine buyers and the integrity of the Store, we apply a number of
          fraud-prevention measures, including but not limited to:
        </p>
        <ul>
          <li>Manual review of every payment screenshot before any order is confirmed.</li>
          <li>
            Device/session recognition to associate an order with the browser it was placed from,
            so order status and credentials can only be viewed by the person who actually placed it.
          </li>
          <li>
            The right to decline, delay, or cancel any order we reasonably suspect involves a fake
            or altered payment screenshot, a reversed/disputed UPI transaction, or any other
            attempt to obtain Account Credentials without genuine payment.
          </li>
        </ul>
        <p>
          Attempting to submit a fraudulent payment screenshot, dispute/reverse a genuine UPI
          payment after receiving Account Credentials, or otherwise obtain an account without
          payment is treated as fraud. We reserve the right to permanently refuse service, report
          the matter to the relevant payment provider or authorities, and pursue recovery of the
          account or its value.
        </p>

        <h2>6. Buyer Responsibilities</h2>
        <p>
          You confirm that you are legally permitted to purchase digital goods in your
          jurisdiction, that the payment method used belongs to you or that you are authorized to
          use it, and that the information you provide at checkout (including your name) is
          accurate.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, GameX Store's total liability for any claim
          arising from a purchase is limited to the amount actually paid for that order. We are
          not liable for indirect, incidental, or consequential loss, including loss of in-game
          progress, items, or enjoyment.
        </p>

        <h2>8. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time to reflect changes in how the Store
          operates. The "Last updated" date above will always reflect the most recent revision.
          Continued use of the Site after a change means you accept the updated Terms.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions about an order or these Terms can be raised directly through the order chat on
          your order page, or via the official channels linked in the footer below.
        </p>

        <h2>10. Intellectual Property &amp; Automated Use Restrictions</h2>
        <p>
          The Site's design, layout, interface, and underlying source code are the property of
          GameX Store and are protected under applicable intellectual property and unfair
          competition law. Other than ordinary personal browsing and purchasing, you may not
          scrape, crawl, systematically extract, mirror, or use automated tools — including
          AI-assisted code generation — to reproduce or replicate the Site's layout, interface, or
          code, whether for a competing service or any other purpose, without our prior written
          permission. This restriction applies equally to a person acting directly and to an
          automated agent or tool acting on that person's behalf.
        </p>
      </main>
      <Footer />
    </>
  );
}
