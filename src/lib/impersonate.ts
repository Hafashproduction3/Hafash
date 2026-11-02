import { getAuth, signInWithCustomToken } from 'firebase/auth';

export async function impersonateUser(targetUserId: string, adminId: string) {
  try {
    // Backend se target user ka token mangwayen
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, adminId }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate token');
    }

    // Firebase client SDK se login karein
    const auth = getAuth();
    await signInWithCustomToken(auth, data.token);

    // Session storage mein save karein ke yeh impersonation hai (taake wapas ja sakein)
    sessionStorage.setItem('impersonating', 'true');
    sessionStorage.setItem('adminId', adminId);

    // Target user ke dashboard par redirect karein
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Impersonation failed:', error);
    throw error;
  }
}

export async function stopImpersonating() {
  try {
    const adminId = sessionStorage.getItem('adminId');
    if (!adminId) throw new Error("Admin ID not found in session");

    // Backend se admin ka token mangwayen
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: adminId, adminId: adminId }), 
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const auth = getAuth();
    await signInWithCustomToken(auth, data.token);

    // Session clear karein
    sessionStorage.removeItem('impersonating');
    sessionStorage.removeItem('adminId');

    // Wapas Admin panel par bhej dein
    window.location.href = '/admin/users';
  } catch (error) {
    console.error('Stop impersonation failed:', error);
    alert('Failed to return to admin. Please logout and login manually.');
  }
}