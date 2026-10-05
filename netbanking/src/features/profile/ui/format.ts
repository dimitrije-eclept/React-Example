/** "+381641234567" → "+381 64 123 4567" (MESS-59: the bank sends it without spaces). */
export function formatPhone(phone: string): string {
  const serbian = /^\+381(\d{2})(\d{3})(\d{3,4})$/.exec(phone);
  return serbian ? `+381 ${serbian[1]} ${serbian[2]} ${serbian[3]}` : phone;
}

/** "+381641234567" → "+381 64 *** **67", how the bank shows where codes go. */
export function maskPhone(phone: string): string {
  const serbian = /^\+381(\d{2})\d+(\d{2})$/.exec(phone);
  return serbian ? `+381 ${serbian[1]} *** **${serbian[2]}` : phone;
}

/** "Marko Petrović" → "MP" */
export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
