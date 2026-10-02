/** Loose mobile number check: optional +, then 7-15 digits (spaces and dashes allowed). */
export const PHONE_PATTERN = /^\+?[0-9\s-]{7,15}$/;
export const PHONE_ERROR = "Enter a valid mobile number";
