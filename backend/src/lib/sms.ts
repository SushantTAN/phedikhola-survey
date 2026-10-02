export type SmsRecipient = {
  /** Mobile number as stored on the record. */
  phone: string;
  /** Citizen the message is about, for logging and future message templates. */
  citizenName?: string;
  serviceId?: string;
};

export type BulkSmsInput = {
  recipients: SmsRecipient[];
  message: string;
};

/**
 * Sends one SMS to every recipient.
 *
 * Placeholder: no SMS gateway is connected yet, so this only logs what would be sent.
 * Replace the body with a call to the real provider when one is chosen.
 */
export async function sendBulkSms({ recipients, message }: BulkSmsInput) {
  console.log(`[bulk-sms] not sent (no SMS provider configured): ${recipients.length} recipient(s)`, {
    message,
    recipients
  });
  return { accepted: recipients.length };
}
