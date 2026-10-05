# shared/domain

Cross-feature domain primitives: `Money`/`Currency`, `Brand`, `Iban` (`parseIban`, `formatIban`), the closed `DomainError` union with `assertNever`, and `Result`/`ok`/`err`/`PortResult`.
**May import:** nothing (except `neverthrow`). Feature-specific types belong in `features/<name>/domain`.
