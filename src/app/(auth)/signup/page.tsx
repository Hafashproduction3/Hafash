{/* ═══ SUBDOMAIN SECTION ═══ */}
{profile?.planId === 'enterprise' || isOwnerEmail(user?.email) ? (
  // Enterprise wale ko input dikhao
  <div className="space-y-6 pt-10 border-t-2 border-primary/20">
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
        <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary ml-1">
          🌐 Your Personal Subdomain
        </Label>
        <p className="text-xs text-muted-foreground mt-2 ml-1 italic">
          Apka portfolio URL — jo clients ko bhejenge
        </p>
      </div>
      <Badge className="bg-green-500/20 text-green-500 border border-green-500/30 text-[10px] font-bold uppercase tracking-widest gap-1.5">
        <CheckCircle2 className="w-3 h-3" /> Enterprise Active
      </Badge>
    </div>

    <div className="relative">
      <Globe className="absolute left-4 top-4 w-5 h-5 text-primary z-10" />
      <Input
        value={formData.subdomain || ''}
        onChange={(e) => updateField('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
        placeholder="yourstudio"
        className="pl-14 pr-36 h-14 rounded-xl bg-background/50 border-primary/30 focus:border-primary text-base font-mono font-bold shadow-inner"
        maxLength={30}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-primary pointer-events-none">
        .hafash.pk
      </span>
    </div>

    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Live URL Preview</p>
          <p className="text-sm font-mono font-bold text-white mt-0.5 truncate">
            https://{formData.subdomain || 'yourstudio'}.hafash.pk
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg gap-2 border-primary/30 hover:bg-primary/10"
          onClick={handleCopyUrl}
        >
          {copiedUrl ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedUrl ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg gap-2 border-primary/30 hover:bg-primary/10"
          onClick={() => window.open(`https://${formData.subdomain || 'yourstudio'}.hafash.pk`, '_blank')}
          disabled={!formData.subdomain}
        >
          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          Visit
        </Button>
      </div>
    </div>

    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <p className="text-[11px] text-amber-200/90 leading-relaxed">
        <strong>Note:</strong> Subdomain change karne ke liye 30 din ka wait karna hoga. Purana subdomain 90 din tak reserved rahega.
      </p>
    </div>
  </div>
) : (
  // Baaki plans ke liye upgrade prompt
  <div className="space-y-6 pt-10 border-t-2 border-primary/20">
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
        <Label className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary ml-1">
          🌐 Personal Subdomain
        </Label>
        <p className="text-xs text-muted-foreground mt-2 ml-1 italic">
          Enterprise plan mein aapko apna personal portfolio URL milega
        </p>
      </div>
      <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[10px] font-bold uppercase tracking-widest gap-1.5">
        <Lock className="w-3 h-3" /> Enterprise Only
      </Badge>
    </div>

    <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-card/60 to-background border border-primary/30 text-center space-y-4">
      <div className="bg-primary/15 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
        <Globe className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="font-headline font-bold text-xl">Upgrade to Enterprise</p>
        <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
          Rs. 3,500/month mein apna personal subdomain <strong className="text-primary">yourname.hafash.pk</strong> aur full custom domain milega
        </p>
      </div>
      <Link href="/storage">
        <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 h-12 px-8">
          <Sparkles className="w-4 h-4" />
          View Enterprise Plan
        </Button>
      </Link>
    </div>
  </div>
)}