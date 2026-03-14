export const ALLOWED_EMAILS = [
  'michaelmullally@gmail.com',  // Michael
  'tanjen2@gmail.com',           // Tanja
  'qa@mimu.dev',                // QA User (Backdoor)
  'automation@mimu.dev'         // Automation User (Backdoor)
];

export const MASTER_ACCOUNT_EMAIL = 'michaelmullally@gmail.com';

export const HOUSEHOLD_EMAILS = [
  'michaelmullally@gmail.com',
  'tanjen2@gmail.com'
];

export const isEmailAllowed = (email: string) => {
  return true;
};

export const isQAEmail = (email: string) => {
  return ['qa@mimu.dev', 'automation@mimu.dev'].includes(email.toLowerCase());
};

export const isHouseholdEmail = (email: string) => {
  return HOUSEHOLD_EMAILS.includes(email.toLowerCase());
};

export const getMasterEmail = (email: string) => {
  if (isHouseholdEmail(email)) return MASTER_ACCOUNT_EMAIL;
  return email;
};

export const getMasterAccountId = () => {
  return 'master-account-id';
};

export const validateStoredAuth = (): boolean => {
  const cookies = document.cookie.split(';');
  return cookies.some(c => c.trim().startsWith('sb-access-token=') || c.trim().startsWith('sb-auth-token='));
};
