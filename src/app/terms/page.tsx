export default function TermsPage() {
    return (
      <div className="min-h-screen bg-background text-foreground py-32 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-5xl font-headline font-bold text-white mb-8">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: 2026</p>
          
          <div className="space-y-6 text-white/70 leading-relaxed">
            <h2 className="text-2xl font-bold text-primary">1. Acceptance of Terms</h2>
            <p>By accessing and using Hafash.pk, you accept and agree to be bound by the terms and provision of this agreement.</p>
            
            <h2 className="text-2xl font-bold text-primary">2. Use License</h2>
            <p>Permission is granted to temporarily download one copy of the materials on Hafash.pk's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software on Hafash.pk</li>
              <li>Remove any copyright or other proprietary notations</li>
            </ul>
            
            <h2 className="text-2xl font-bold text-primary">3. Disclaimer</h2>
            <p>The materials on Hafash.pk's website are provided on an 'as is' basis. Hafash.pk makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
            
            <h2 className="text-2xl font-bold text-primary">4. Limitations</h2>
            <p>In no event shall Hafash.pk or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Hafash.pk's website.</p>
            
            <h2 className="text-2xl font-bold text-primary">5. Contact</h2>
            <p>If you have any questions about these Terms, please contact us at support@hafash.pk</p>
          </div>
        </div>
      </div>
    );
  }