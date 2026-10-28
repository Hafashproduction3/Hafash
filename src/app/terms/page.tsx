
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  HardDrive,
  LockKeyhole,
  Mail,
  Scale,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
} from "lucide-react";

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    icon: UserCheck,
    paragraphs: [
      "By creating an account, accessing, or using Hafash.pk, you agree to these Terms of Service and our applicable policies. If you do not agree, please stop using the service.",
      "If you use Hafash on behalf of a photography business or another organization, you confirm that you have permission to accept these Terms on its behalf.",
    ],
  },
  {
    id: "eligibility",
    title: "2. Accounts and Account Security",
    icon: LockKeyhole,
    paragraphs: [
      "You are responsible for providing accurate account information, keeping your login credentials secure, and activity carried out through your account.",
      "Please notify Hafash through its official support channel if you suspect unauthorized access to your account. Do not share passwords or verification codes with anyone.",
    ],
  },
  {
    id: "ownership",
    title: "3. Photo Ownership and Content Rights",
    icon: Camera,
    paragraphs: [
      "Photographers and other lawful rights holders retain their ownership rights in the photos, videos, logos, and other content they upload. Uploading content to Hafash does not, by itself, transfer ownership of that content to Hafash.",
      "You grant Hafash permission to host, store, process, display, and deliver your content only as reasonably necessary to operate and provide the service, subject to applicable policies.",
      "You must have the rights, permissions, and lawful authority required to upload and share your content. You are responsible for respecting copyright, privacy, and other applicable rights.",
      "Hafash does not claim ownership of customer photographs merely because they are uploaded to the platform.",
    ],
  },
  {
    id: "acceptable-use",
    title: "4. Acceptable Use",
    icon: ShieldCheck,
    paragraphs: [
      "You must not use Hafash to upload or distribute unlawful content, infringe another person's rights, conduct fraud, attempt unauthorized access, interfere with platform security, or misuse the service.",
      "You must not attempt to disrupt the service, bypass account or storage restrictions, or access galleries or data without authorization.",
      "Hafash may investigate suspected misuse and take reasonable action, including restricting access or suspending an account, where justified and permitted by applicable law.",
    ],
  },
  {
    id: "plans",
    title: "5. Plans, Storage and Payments",
    icon: CreditCard,
    paragraphs: [
      "Paid plans provide the storage allowance, features, and duration described at the time of purchase. Your plan is subject to its stated limits and applicable plan conditions.",
      "You are responsible for checking your selected plan, price, storage allowance, and duration before completing a purchase.",
      "Payments are processed through the payment methods made available at checkout. Payment processing may also be subject to the payment provider's terms and policies.",
      "You must not attempt to obtain paid features through fraudulent payments, charge manipulation, or unauthorized use of another person's payment method.",
    ],
  },
  {
    id: "renewal",
    title: "6. Manual Renewal and Plan Expiry",
    icon: CheckCircle2,
    paragraphs: [
      "Hafash plans are intended to be renewed manually. You are responsible for renewing your plan when you want to continue using paid features.",
      "Unless the checkout page expressly states otherwise, Hafash does not promise automatic renewal or automatic charging for a future plan period.",
      "When a plan expires, access to affected galleries or paid features may be restricted or locked until the plan is renewed or the issue is otherwise resolved.",
      "Expiry alone does not mean that your photos will be deleted immediately. However, this is not a guarantee of indefinite storage or permanent retention. Any later deletion or retention process should follow the applicable policy and notices provided to you.",
      "If your account exceeds its storage allowance, you may need to renew, upgrade, or reduce stored content to continue using features subject to that limit.",
    ],
  },
  {
    id: "refunds",
    title: "7. Refunds and Payment Disputes",
    icon: CreditCard,
    paragraphs: [
      "Refund requests are reviewed on a case-by-case basis. A decision may take into account the circumstances of the request, payment status, service availability, and whether the purchased service was provided.",
      "If you believe a payment was duplicated, unauthorized, or incorrectly processed, contact Hafash through its official support channel and provide the relevant transaction details. Do not send passwords or payment security codes.",
      "Submitting a refund request does not guarantee approval. Any refund decision remains subject to applicable law and any mandatory consumer rights.",
    ],
  },
  {
    id: "galleries",
    title: "8. Galleries, Sharing and Downloads",
    icon: Download,
    paragraphs: [
      "Photographers are responsible for choosing the appropriate gallery settings, sharing links with intended recipients, and checking access permissions before sharing a gallery.",
      "Password protection, restricted access, watermarks, and other available controls can help protect content, but no online system can guarantee that a recipient will never copy, photograph, or redistribute content they can access.",
      "Download availability may depend on gallery settings, plan status, storage limits, technical conditions, and other restrictions shown in the service.",
      "You are responsible for ensuring that the people who receive a gallery link are authorized to access its contents.",
    ],
  },
  {
    id: "storage",
    title: "9. Storage, Backups and Data Loss",
    icon: HardDrive,
    paragraphs: [
      "Hafash works to provide reliable photo storage and gallery delivery, but technical failures, connectivity issues, third-party outages, accidental deletion, or other unexpected events may affect availability.",
      "You should maintain your own independent backup of important original photos and files. Hafash should not be treated as your only copy or permanent archival system.",
      "Hafash does not promise that every file can always be recovered after loss, corruption, deletion, or an interruption. Nothing in these Terms excludes responsibilities that cannot lawfully be excluded.",
      "Do not assume that a file is permanently backed up merely because an upload or gallery is visible in the interface.",
    ],
  },
  {
    id: "privacy",
    title: "10. Privacy and Security",
    icon: ShieldCheck,
    paragraphs: [
      "Hafash processes account information and uploaded content as needed to operate, secure, and support the service, subject to applicable privacy requirements and the information provided in its privacy notices.",
      "You should avoid uploading sensitive or confidential material unless you have a lawful basis and understand the access and sharing settings available to you.",
      "These Terms should be read together with the Hafash Privacy Policy, once published and applicable to your use of the service.",
    ],
  },
  {
    id: "availability",
    title: "11. Service Availability and Disclaimer",
    icon: AlertTriangle,
    paragraphs: [
      "Hafash may update, maintain, improve, restrict, or temporarily interrupt parts of the service to address technical, security, operational, or legal requirements.",
      "To the extent permitted by applicable law, the service is provided on an 'as available' basis. Hafash does not guarantee uninterrupted access, error-free operation, or compatibility with every device, browser, network, or third-party service.",
      "We will not exclude any warranty, duty, or protection that applicable law does not allow us to exclude.",
    ],
  },
  {
    id: "liability",
    title: "12. Liability and Termination",
    icon: Scale,
    paragraphs: [
      "To the extent permitted by applicable law, Hafash is not responsible for indirect or consequential losses arising from circumstances beyond its reasonable control, including loss of business opportunities or profits.",
      "This section does not remove any liability or consumer right that cannot lawfully be limited or excluded. Any applicable limitation of liability will be interpreted only to the extent permitted by law.",
      "Hafash may suspend or terminate access where reasonably necessary for serious misuse, security risks, non-payment, or legal compliance. Where appropriate and legally permitted, notice or an opportunity to resolve the issue may be provided.",
      "If you stop using Hafash, you should download and independently back up any files you need and resolve outstanding account or payment matters.",
    ],
  },
  {
    id: "changes",
    title: "13. Changes to These Terms",
    icon: FileText,
    paragraphs: [
      "Hafash may revise these Terms as the service or applicable requirements change. Updated Terms will be published on this page with a revised update date.",
      "Where required by applicable law, material changes will be communicated or handled with additional notice. Continued use after changes take effect may constitute acceptance where legally valid.",
    ],
  },
  {
    id: "law",
    title: "14. Applicable Law and Contact",
    icon: Mail,
    paragraphs: [
      "These Terms are intended to operate subject to the applicable laws of Pakistan and any mandatory legal protections that apply to you.",
      "For questions about these Terms, account access, payments, or a refund request, use the official contact or support channel published on Hafash.pk.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hafash
        </Link>

        <header className="mb-10 border-b border-border pb-8 sm:mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            Legal information
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Terms of Service
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            These Terms explain the rules for using Hafash.pk, including
            photo ownership, subscriptions, galleries, storage, and account
            responsibilities.
          </p>

          <p className="mt-4 text-sm text-muted-foreground">
            Last updated: October 28, 2026
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
          <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-8">
            <h2 className="mb-4 text-sm font-semibold">On this page</h2>
            <nav aria-label="Terms sections" className="space-y-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-lg px-2 py-1.5 text-sm leading-5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
              <h2 className="text-lg font-semibold">Please read carefully</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Hafash helps photographers host and deliver galleries. You
                remain responsible for the content you upload, the people you
                share it with, and keeping independent backups of important
                files. Plan expiry may restrict gallery access; it does not
                mean immediate deletion of your photos.
              </p>
            </section>

            {sections.map((section) => {
              const Icon = section.icon;

              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-8 rounded-2xl border border-border bg-card p-5 sm:p-7"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="pt-1.5 text-lg font-semibold tracking-tight sm:text-xl">
                      {section.title}
                    </h2>
                  </div>

                  <div className="space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              );
            })}

            <div className="rounded-2xl border border-border p-5 text-sm leading-7 text-muted-foreground sm:p-7">
              <p className="font-medium text-foreground">
                Important notice
              </p>
              <p className="mt-2">
                This page is a general Terms of Service draft, not a substitute
                for legal advice. Before relying on it as your final policy,
                have it reviewed for your business, payment flow, privacy
                practices, and applicable Pakistani law. Make sure your actual
                product behavior matches the statements on this page.
              </p>
            </div>

            <footer className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Hafash.pk. All rights reserved.
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
