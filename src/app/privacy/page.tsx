import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Database,
  FileText,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  HardDrive,
  Mail,
} from "lucide-react";

const sections = [
  {
    id: "information",
    title: "1. Information We Handle",
    icon: UserRound,
    paragraphs: [
      "When you create and use a Hafash.pk account, we may process information you provide, such as your name, email address, WhatsApp number, city, studio name, and profile details, depending on the features you use.",
      "We process photos, videos, gallery information, and other content you upload so that Hafash can provide gallery hosting and delivery features.",
      "When you contact us for help, we may process the information you include in your message so that we can respond to your request.",
      "Please do not provide passwords, verification codes, or other sensitive information in support messages.",
    ],
  },
  {
    id: "use",
    title: "2. How Information Is Used",
    icon: Database,
    paragraphs: [
      "We use account and profile information to create and manage accounts, provide the features you request, and help protect the service.",
      "Uploaded photos and gallery information are processed to store, organize, display, and deliver galleries according to the available features and settings you choose.",
      "Information may also be used to troubleshoot technical issues, maintain service security, respond to support requests, and meet applicable legal obligations.",
      "We do not describe any use of your information as taking place unless it is necessary for the service, supported by our actual practices, or otherwise permitted by applicable law.",
    ],
  },
  {
    id: "storage",
    title: "3. Storage and Service Providers",
    icon: HardDrive,
    paragraphs: [
      "Hafash uses Firebase for user authentication and related account services. Account information may also be processed in the database services used by the platform.",
      "Hafash uses Cloudflare R2 to store uploaded photos and other supported gallery files.",
      "These service providers process or store information as needed to provide their services to Hafash. Their own systems and terms may also apply.",
      "We aim to use appropriate access controls and reasonable safeguards. However, we cannot promise that any online service or storage system is completely secure or will always be available.",
    ],
  },
  {
    id: "access",
    title: "4. Photos, Galleries and Sharing",
    icon: Camera,
    paragraphs: [
      "Photographers are responsible for choosing gallery settings and sharing gallery links only with people they intend to authorize.",
      "Depending on the features available and the settings selected, gallery content may be accessible to people who receive a valid link or otherwise have permission to access it.",
      "Password protection, restricted access, and watermarks may help protect content, but they cannot guarantee that someone who can view a photo will never copy, photograph, or redistribute it.",
      "Photographers should ensure they have the necessary rights and permissions to upload and share photos, including any permissions required to respect the privacy of people shown in those photos.",
    ],
  },
  {
    id: "security",
    title: "5. Account Security",
    icon: LockKeyhole,
    paragraphs: [
      "Hafash uses Firebase Authentication for account authentication. We do not claim that Hafash independently hashes or encrypts account passwords using a particular algorithm.",
      "You are responsible for keeping your login credentials and verification codes private and for notifying us through an official Hafash support channel if you suspect unauthorized access.",
      "We take reasonable steps intended to protect information handled by the service. No security measure can guarantee protection against every possible threat, failure, or unauthorized access.",
    ],
  },
  {
    id: "retention",
    title: "6. Data Retention and Plan Expiry",
    icon: Database,
    paragraphs: [
      "We retain account information and uploaded content as needed to provide the service, maintain account records, address support or security issues, and meet applicable legal obligations.",
      "When a paid plan expires, access to affected galleries or paid features may be restricted or locked until the plan is renewed or the issue is otherwise resolved.",
      "Plan expiry alone does not mean that photos will be deleted immediately. However, Hafash does not promise indefinite storage or permanent retention of files.",
      "If you need to keep original photos or other important files, maintain an independent backup. Do not rely on Hafash as your only archival copy.",
      "The precise process and timing for any future deletion or retention of expired-account content should follow the applicable policy and any notices provided to users.",
    ],
  },
  {
    id: "payments",
    title: "7. Payments",
    icon: ShieldCheck,
    paragraphs: [
      "At the time of this policy update, Hafash's payment service is not live. This policy therefore does not claim that payments are currently being processed through Safepay or another payment provider.",
      "If payment features are introduced, we will update the relevant information to explain how payment-related information is handled and which payment providers are used, based on the actual checkout process.",
      "When payment features become available, users should review the applicable payment information before submitting a transaction.",
    ],
  },
  {
    id: "sharing",
    title: "8. When Information May Be Shared",
    icon: ShieldCheck,
    paragraphs: [
      "Information may be processed by the service providers Hafash uses to operate authentication, hosting, storage, and other necessary platform functions.",
      "Information may also be disclosed where required by applicable law or where reasonably necessary to address security, fraud, misuse, or protection of rights, subject to applicable legal requirements.",
      "Gallery content may be made accessible to recipients according to the gallery settings and sharing choices made by the photographer.",
    ],
  },
  {
    id: "choices",
    title: "9. Your Choices and Requests",
    icon: UserRound,
    paragraphs: [
      "Keep your account and profile information accurate and use the available account and gallery settings to manage your content and sharing preferences.",
      "If you have a question or request concerning your personal information, account, or uploaded content, contact Hafash through an official contact or support channel published on Hafash.pk.",
      "Requests will be handled according to the information available, the service's capabilities, and applicable legal requirements. We do not promise that every request can be fulfilled in every circumstance.",
    ],
  },
  {
    id: "changes",
    title: "10. Changes to This Policy",
    icon: FileText,
    paragraphs: [
      "We may update this Privacy Policy as Hafash's features, service providers, or legal requirements change.",
      "The latest version and its update date will be published on this page. Where required by applicable law, we will provide any additional notice that is necessary.",
    ],
  },
  {
    id: "contact",
    title: "11. Privacy Questions",
    icon: Mail,
    paragraphs: [
      "For privacy-related questions or requests, use an official Hafash contact or support channel published on Hafash.pk.",
      "We have not listed a specific support email address in this policy because its availability has not yet been confirmed.",
    ],
  },
];

export default function PrivacyPage() {
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
            <ShieldCheck className="h-4 w-4" />
            Privacy information
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            This policy explains how Hafash.pk handles account information,
            uploaded photos, galleries, and other information when you use
            the service.
          </p>

          <p className="mt-4 text-sm text-muted-foreground">
            Last updated: October 28, 2026
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
          <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-8">
            <h2 className="mb-4 text-sm font-semibold">On this page</h2>
            <nav aria-label="Privacy Policy sections" className="space-y-2">
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
              <h2 className="text-lg font-semibold">
                Your photos remain yours
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                Uploading photos to Hafash does not, by itself, transfer
                ownership of those photos to Hafash. We process uploaded
                content as needed to provide the service, subject to your
                settings and applicable policies.
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

            <section className="rounded-2xl border border-border p-5 text-sm leading-7 text-muted-foreground sm:p-7">
              <h2 className="font-medium text-foreground">
                Important notice
              </h2>
              <p className="mt-2">
                This Privacy Policy is a general draft and is not a substitute
                for legal advice. Before relying on it as your final policy,
                review it against your actual data collection, Firebase and
                Cloudflare configuration, account deletion process, and
                applicable Pakistani law. Update it whenever your practices
                or service providers change.
              </p>
            </section>

            <footer className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Hafash.pk. All rights reserved.
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
