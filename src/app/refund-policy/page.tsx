import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white py-20 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-primary hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-headline font-bold">Refund & Return Policy</h1>
        <p className="text-white/50 text-sm italic">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-white/70 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-2xl font-headline font-bold text-primary">1. Digital Services Overview</h2>
            <p>Hafash.pk provides digital services, including cloud storage, gallery delivery, and portfolio management for photographers. Since our services are digital and delivered instantly upon subscription activation, they are generally non-refundable once used.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-headline font-bold text-primary">2. Subscription Refunds</h2>
            <p>If you are not satisfied with our service, you may request a refund within <strong>7 days</strong> of your initial subscription purchase, provided that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You have not uploaded more than 1GB of data.</li>
              <li>You have not used the platform for more than 7 days.</li>
              <li>The request is made via email to support@hafash.pk.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-headline font-bold text-primary">3. Non-Refundable Cases</h2>
            <p>Refunds will not be issued in the following cases:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subscription renewals (auto or manual).</li>
              <li>Partial months of service.</li>
              <li>Accounts suspended due to Terms of Service violations.</li>
              <li>Data loss due to user error.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-headline font-bold text-primary">4. How to Request a Refund</h2>
            <p>To request a refund, please email us at <strong>support@hafash.pk</strong> with your registered email address and transaction ID. Our team will review your request within 3-5 business days.</p>
          </section>
          
          <section className="space-y-3">
            <h2 className="text-2xl font-headline font-bold text-primary">5. Contact Us</h2>
            <p>If you have any questions about our Refund Policy, please contact us at:</p>
            <p className="font-bold text-white">Email: support@hafash.pk</p>
            <p className="font-bold text-white">WhatsApp: +92 XXX XXXXXXX</p>
          </section>
        </div>
      </div>
    </div>
  );
}