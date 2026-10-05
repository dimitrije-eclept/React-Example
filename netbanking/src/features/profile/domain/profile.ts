export type Profile = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  /** E.164, e.g. "+381641234567". */
  readonly phone: string;
  /** Start of the current session (the bank records it at sign-in). */
  readonly signedInAt: Date;
};
