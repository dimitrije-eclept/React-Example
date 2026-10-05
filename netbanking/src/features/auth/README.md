# auth

Sign-in: username/password → SMS code → tokens (`AuthPort`, `signInMachine`, `SignInScreen`), plus
refresh and logout. The session itself (tokens in memory, idle timeout) lives in `app/session*.ts`.
No in-memory mock adapter yet.
