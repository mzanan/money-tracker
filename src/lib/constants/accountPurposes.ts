export const ACCOUNT_PURPOSES = ["deposit", "loan"] as const;

export type AccountPurpose = (typeof ACCOUNT_PURPOSES)[number];

export const ACCOUNT_PURPOSE_LABELS: Record<AccountPurpose, string> = {
  deposit: "Deposit",
  loan: "Loan",
};
