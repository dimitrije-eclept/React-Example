# shared/api

HTTP client (`createHttp`: base URL, injected access token, 401 callback).
**May import:** nothing app-specific. Never imports a feature; `app/` injects the token source.
