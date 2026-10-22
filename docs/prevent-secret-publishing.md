# Prevent private files from reaching the public site

The build now checks its public output and fails before publication if it contains environment files, credential files, private key containers, symbolic links or embedded private-key material. The check runs for local builds as well as CI. It prints filenames only, never secret contents. npm run test:public-output exercises normal assets, nested private files and a disguised private key.

The security workflow also rejects tracked private .env files, allowing only explicitly named example templates. Gitleaks continues to scan content and history. This complements filename checks; arbitrary API keys still require secret scanning. Public VITE_* or NEXT_PUBLIC_* variables must not contain server secrets.

API spending restrictions and quotas belong in the provider account and are not established by these repository checks.
