export const ALLOWED_EMAILS = [
  'michaelmullally@gmail.com',  // Michael
  'tanjen2@gmail.com',           // Tanja
  'qa@mimu.dev',                // QA User (Backdoor)
  'automation@mimu.dev'         // Automation User (Backdoor)
];

export const MASTER_ACCOUNT_EMAIL = 'michaelmullally@gmail.com';

export const isEmailAllowed = (email: string) => {
  // Disabling strict email implementation for v0.8/v0.9 as requested.
  // Will re-enable closer to v1.0 release.
  return true;
  // return ALLOWED_EMAILS.includes(email.toLowerCase());
};

export const isQAEmail = (email: string) => {
  return ['qa@mimu.dev', 'automation@mimu.dev'].includes(email.toLowerCase());
};

export const getMasterAccountId = () => {
  // Always use the same account ID for both emails
  return 'master-account-id';
};

export const validateStoredAuth = (): boolean => {
  const cookies = document.cookie.split(';');
  return cookies.some(c => c.trim().startsWith('sb-access-token=') || c.trim().startsWith('sb-auth-token='));
};
