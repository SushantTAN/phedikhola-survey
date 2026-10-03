/** Loose mobile number check: optional +, then 7-15 digits (spaces and dashes allowed). Same rule as the web app. */
export const PHONE_PATTERN = /^\+?[0-9\s-]{7,15}$/;
export const PHONE_ERROR = "Enter a valid mobile number";

/** English names of the Nepali months, as stored in a service record's nepaliMonth field. */
export const NEPALI_MONTH_NAMES = [
  "Baisakh",
  "Jestha",
  "Ashar",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

/** Text input -> number, treating blank as null. Keeps NaN so validation can report it. */
export const emptyToNull = (value: unknown, original: unknown) => (original === "" || original == null ? null : value);
