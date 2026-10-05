declare const brand: unique symbol;

/** Nominal typing helper, e.g. `type Iban = Brand<string, 'Iban'>`. */
export type Brand<T, Name extends string> = T & { readonly [brand]: Name };
