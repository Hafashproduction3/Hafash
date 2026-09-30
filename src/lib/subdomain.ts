/**
 * Hafash — Subdomain Utilities
 * Helpers for generating, validating, and managing photographer subdomains.
 */

// ─────────────────────────────────────────────────────────────
// RESERVED SUBDOMAINS (Cannot be used)
// ─────────────────────────────────────────────────────────────
export const RESERVED_SUBDOMAINS = [
    "www", "api", "admin", "app", "mail", "email", "ftp", "cdn",
    "static", "assets", "images", "img", "media", "video", "videos",
    "blog", "shop", "store", "help", "support", "docs", "status",
    "login", "signup", "register", "auth", "account", "dashboard",
    "settings", "profile", "user", "users", "client", "clients",
    "gallery", "galleries", "album", "albums", "photo", "photos",
    "hafash", "hafashpk", "hafash-pk", "test", "demo", "dev",
    "staging", "prod", "production", "root", "system", "web",
    "book", "booking", "invoice", "invoices", "payment", "payments",
    "review", "reviews", "portfolio", "studios", "studio",
  ];
  
  // ─────────────────────────────────────────────────────────────
  // GENERATE SUBDOMAIN FROM STUDIO NAME
  // ─────────────────────────────────────────────────────────────
  export function generateSubdomain(studioName: string): string {
    if (!studioName) return "";
    
    return studioName
      .toLowerCase()
      .trim()
      // Remove all non-alphanumeric characters
      .replace(/[^a-z0-9]/g, "")
      // Limit to 30 characters
      .slice(0, 30);
  }
  
  // ─────────────────────────────────────────────────────────────
  // VALIDATE SUBDOMAIN
  // ─────────────────────────────────────────────────────────────
  export function validateSubdomain(subdomain: string): {
    valid: boolean;
    error?: string;
  } {
    if (!subdomain) {
      return { valid: false, error: "Subdomain khali nahi ho sakta" };
    }
  
    if (subdomain.length < 3) {
      return { valid: false, error: "Subdomain kam az kam 3 characters ka hona chahiye" };
    }
  
    if (subdomain.length > 30) {
      return { valid: false, error: "Subdomain 30 characters se zyada nahi ho sakta" };
    }
  
    if (!/^[a-z0-9]+$/.test(subdomain)) {
      return { valid: false, error: "Sirf lowercase letters aur numbers allowed hain" };
    }
  
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      return { valid: false, error: "Yeh subdomain reserved hai" };
    }
  
    if (/^\d+$/.test(subdomain)) {
      return { valid: false, error: "Subdomain sirf numbers ka nahi ho sakta" };
    }
  
    return { valid: true };
  }
  
  // ─────────────────────────────────────────────────────────────
  // BUILD FULL SUBDOMAIN URL
  // ─────────────────────────────────────────────────────────────
  export function buildSubdomainUrl(subdomain: string): string {
    if (!subdomain) return "";
    return `${subdomain}.hafash.pk`;
  }
  
  // ─────────────────────────────────────────────────────────────
  // EXTRACT SUBDOMAIN FROM HOST
  // ─────────────────────────────────────────────────────────────
  export function extractSubdomain(host: string): string | null {
    if (!host) return null;
    
    const cleanHost = host.split(":")[0];
    
    if (!cleanHost.endsWith(".hafash.pk")) return null;
    
    const subdomain = cleanHost.replace(".hafash.pk", "");
    
    if (!subdomain || subdomain === "www") return null;
    
    if (subdomain.includes(".")) return null;
    
    return subdomain;
  }