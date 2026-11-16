// Adversarial security specification tests verifying Dirty Dozen payloads yield PERMISSION_DENIED.
// Run with @firebase/rules-unit-testing against the Firebase Firestore Emulator.
export const DIRTY_DOZEN_CASES = [
  { id: 1, name: 'Unauthenticated read on /orchards/userA', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Cross-tenant read by userB on /orchards/userA', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Cross-tenant write by userB on /orchards/userA', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Unverified email user write on /orchards/userA', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Identity spoofing ownerId != request.auth.uid', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Shadow field injection (isVerified: true)', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Privilege escalation updating role on /users/userA', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Immutable createdAt/ownerId tamper on update', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Client-forged timestamp instead of server request.time', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Oversized nombreFundo > 120 chars', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Type poisoning string instead of map for stateData', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Collection list scraping on /users and /orchards', expected: 'PERMISSION_DENIED' },
] as const;
