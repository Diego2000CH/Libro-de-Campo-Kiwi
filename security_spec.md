# Security Specification — Kiwis Field Notebook

## 1. Data Invariants
1. **Identity Isolation**: Every `/users/{userId}` and `/orchards/{userId}` document belongs exclusively to the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **Owner Integrity**: `uid` (in `/users`) and `ownerId` (in `/orchards`) MUST match `request.auth.uid` on creation and remain strictly immutable on update.
3. **Anti-Privilege-Escalation**: Users cannot elevate their `role` on `/users/{userId}` updates, nor create shadow fields outside the explicit allowlist.
4. **Temporal Integrity**: `createdAt` and `updatedAt` MUST equal `request.time`; `createdAt` is immutable on update.
5. **No Collection Scraping**: `allow list` is explicitly `false` for both `/users` and `/orchards` because the application exclusively accesses user-scoped documents by UID.
6. **Path & Size Hardening**: Every document ID matches `^[a-zA-Z0-9_-]+$` (`<= 128` chars) and every string/map field enforces strict upper bounds.

## 2. The "Dirty Dozen" Attack Payloads (All MUST Yield PERMISSION_DENIED)
1. Unauthenticated read of `/orchards/userA`.
2. Authenticated userB attempting to read `/orchards/userA` (Cross-tenant read).
3. Authenticated userB attempting to write `/orchards/userA` (Cross-tenant write).
4. Authenticated userA with `email_verified: false` writing `/orchards/userA` (Email spoofing/unverified write).
5. Creating `/orchards/userA` with `ownerId: "userB"` (Identity spoofing).
6. Creating `/orchards/userA` with an extra shadow field `isVerified: true` (Shadow field injection).
7. Updating `/users/userA` attempting to change `role` from `"usuario"` to `"administrador"` (Privilege escalation).
8. Updating `/orchards/userA` attempting to mutate immutable `ownerId` or `createdAt` (Immortal field tamper).
9. Creating `/orchards/userA` with client-forged `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` (Timestamp forgery).
10. Creating `/orchards/userA` with `nombreFundo` exceeding 120 characters (Resource poisoning).
11. Creating `/orchards/userA` with `stateData: "json_string"` instead of a native Firestore Map (Type poisoning).
12. Executing a collection `list` query against `/users` or `/orchards` (PII/workspace scraping).
