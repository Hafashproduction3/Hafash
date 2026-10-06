/**
 * Hafash.pk — Firebase Error Messages
 * 
 * User-friendly messages for Firebase errors.
 * Instead of showing "Firebase: Error (auth/...)", 
 * show Hafash-branded friendly messages.
 */

export interface FriendlyError {
    title: string;
    description: string;
  }
  
  export const getFirebaseErrorMessage = (error: any): FriendlyError => {
    const code = error?.code || '';
  
    const errorMap: Record<string, FriendlyError> = {
      // ═══ AUTH ERRORS ═══
      'auth/too-many-requests': {
        title: '⏰ Thodi Der Baad Try Karein',
        description: 'Bahut zyada attempts ho gaye. 5 minute baad dubara try karein.',
      },
      'auth/email-already-in-use': {
        title: '📧 Email Pehle Se Registered',
        description: 'Yeh email pehle se Hafash par hai. Login karein ya doosra email try karein.',
      },
      'auth/weak-password': {
        title: '🔒 Password Kamzor Hai',
        description: 'Password kam az kam 6 characters ka hona chahiye.',
      },
      'auth/invalid-email': {
        title: '📧 Email Sahi Nahi',
        description: 'Email address sahi format mein likhein.',
      },
      'auth/user-not-found': {
        title: '👤 Account Nahi Mila',
        description: 'Yeh account Hafash par nahi hai. Pehle signup karein.',
      },
      'auth/wrong-password': {
        title: '🔑 Password Ghalat',
        description: 'Password sahi nahi hai. Dubara try karein ya reset karein.',
      },
      'auth/network-request-failed': {
        title: '📶 Internet Masla',
        description: 'Internet connection check karein aur dubara try karein.',
      },
      'auth/user-disabled': {
        title: '🚫 Account Band',
        description: 'Yeh account band kar diya gaya hai. Support se rabta karein.',
      },
      'auth/operation-not-allowed': {
        title: '⚠️ Operation Allowed Nahi',
        description: 'Yeh kaam abhi nahi ho sakta. Support se rabta karein.',
      },
      'auth/requires-recent-login': {
        title: '🔐 Dubara Login Karein',
        description: 'Security ke liye dubara login karein.',
      },
      'auth/invalid-credential': {
        title: '🔑 Credentials Sahi Nahi',
        description: 'Email ya password sahi nahi hai. Dubara try karein.',
      },
      'auth/invalid-verification-code': {
        title: '🔢 Code Sahi Nahi',
        description: 'Verification code sahi nahi hai. Dubara check karein.',
      },
      'auth/invalid-verification-id': {
        title: '🔢 Verification ID Sahi Nahi',
        description: 'Verification ID expire ho gayi. Dubara try karein.',
      },
      'auth/missing-verification-code': {
        title: '🔢 Code Missing',
        description: 'Verification code likhein.',
      },
      'auth/code-expired': {
        title: '⏰ Code Expire',
        description: 'Verification code expire ho gaya. Naya code mangwayein.',
      },
      'auth/missing-password': {
        title: '🔒 Password Missing',
        description: 'Password likhein.',
      },
      'auth/expired-action-code': {
        title: '⏰ Link Expire',
        description: 'Yeh link expire ho gaya. Naya link mangwayein.',
      },
      'auth/invalid-action-code': {
        title: '🔗 Link Sahi Nahi',
        description: 'Yeh link sahi nahi hai ya expire ho gaya.',
      },
      'auth/internal-error': {
        title: '⚠️ Internal Error',
        description: 'Kuch masla ho gaya. Dubara try karein.',
      },
  
      // ═══ FIRESTORE ERRORS ═══
      'permission-denied': {
        title: '🔒 Permission Nahi',
        description: 'Aapko iska access nahi hai. Login karein ya support se rabta karein.',
      },
      'not-found': {
        title: '🔍 Data Nahi Mila',
        description: 'Jo aap dhundh rahe hain woh nahi mila.',
      },
      'already-exists': {
        title: '✅ Pehle Se Mojood',
        description: 'Yeh data pehle se mojood hai.',
      },
      'resource-exhausted': {
        title: '📊 Limit Poori',
        description: 'Aapki limit poori ho gayi hai. Upgrade karein.',
      },
      'failed-precondition': {
        title: '⚠️ Condition Fail',
        description: 'Kuch shartein poori nahi hui. Dubara try karein.',
      },
      'aborted': {
        title: '🔄 Operation Abort',
        description: 'Operation abort ho gaya. Dubara try karein.',
      },
      'out-of-range': {
        title: '📏 Range Se Bahar',
        description: 'Value range se bahar hai.',
      },
      'unimplemented': {
        title: '🚧 Abhi Nahi Bana',
        description: 'Yeh feature abhi nahi bana. Jald aayega.',
      },
      'unavailable': {
        title: '📡 Server Nahi Mil Raha',
        description: 'Server se connection nahi ho raha. Dubara try karein.',
      },
      'data-loss': {
        title: '⚠️ Data Loss',
        description: 'Data loss ho gaya. Support se rabta karein.',
      },
      'unauthenticated': {
        title: '🔐 Login Required',
        description: 'Pehle login karein.',
      },
  
      // ═══ STORAGE ERRORS ═══
      'storage/unauthorized': {
        title: '🔒 Storage Access Nahi',
        description: 'Aapko storage ka access nahi hai.',
      },
      'storage/canceled': {
        title: '❌ Upload Cancel',
        description: 'Upload cancel kar diya gaya.',
      },
      'storage/unknown': {
        title: '⚠️ Storage Error',
        description: 'Storage mein masla ho gaya. Dubara try karein.',
      },
      'storage/quota-exceeded': {
        title: '📊 Storage Full',
        description: 'Aapki storage poori ho gayi. Upgrade karein.',
      },
      'storage/retry-limit-exceeded': {
        title: '🔄 Retry Limit',
        description: 'Bahut zyada retry ho gaye. Thodi der baad try karein.',
      },
      'storage/invalid-format': {
        title: '📁 File Format Sahi Nahi',
        description: 'Yeh file format supported nahi hai.',
      },
  
      // ═══ NETWORK ═══
      'deadline-exceeded': {
        title: '⏰ Time Out',
        description: 'Operation mein time lag raha hai. Dubara try karein.',
      },
    };
  
    return errorMap[code] || {
      title: '⚠️ Kuch Masla Hua',
      description: 'Dubara try karein. Agar masla rahe to support se rabta karein.',
    };
  };
  
  /**
   * Helper: Get error title only
   */
  export const getFirebaseErrorTitle = (error: any): string => {
    return getFirebaseErrorMessage(error).title;
  };
  
  /**
   * Helper: Get error description only
   */
  export const getFirebaseErrorDescription = (error: any): string => {
    return getFirebaseErrorMessage(error).description;
  };