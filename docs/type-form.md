# Type form

Additional Send-time safety. Does not replace Human Send, `validateClaims`, or `VOICE_LAW`.

- Module: `src/lib/type-form.ts`
- Tests: `src/lib/type-form.test.ts`
- Live path: local deterministic judge. Same answer shape as TypeSafe Jev (Noul / Choice / Score).
- Jev is optional behind `TYPESAFE_API_KEY`. No SDK in this repo.
- Claims are prefixed `Type form · ` and feed the existing `blocked()` gate.

Questions and thresholds live in the module. The company skill is `type-form` (recall: run type form on [draft]).
