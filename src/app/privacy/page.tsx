export default function PrivacyPage() {
    return (
      <div className="min-h-screen bg-background text-foreground py-32 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-5xl font-headline font-bold text-white mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: 2026</p>
          
          <div className="space-y-6 text-white/70 leading-relaxed">
            <h2 className="text-2xl font-bold text-primary">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as when you create an account, upload photos, or communicate with us. This includes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Name and email address</li>
              <li>WhatsApp number and city</li>
              <li>Studio name and profile information</li>
              <li>Photos and galleries you upload</li>
              <li>Payment information (processed securely via Safepay)</li>
            </ul>
            
            <h2 className="text-2xl font-bold text-primary">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, to process transactions, and to send you technical notices, updates, and support messages.</p>
            
            <h2 className="text-2xl font-bold text-primary">3. Data Storage</h2>
            <p>Your photos and galleries are stored securely on Cloudflare R2 with encrypted access. We use Firebase for user authentication and database management.</p>
            
            <h2 className="text-2xl font-bold text-primary">4. Data Security</h2>
            <p>We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. All passwords are hashed using SHA-256 encryption.</p>
            
            <h2 className="text-2xl font-bold text-primary">5. Contact</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at support@hafash.pk</p>
          </div>
        </div>
      </div>
    );
  }