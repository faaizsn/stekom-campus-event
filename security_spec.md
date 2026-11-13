# Security Specification — STEKOM Campus Event Management (Firestore)

## 1. Data Invariants
1. **Identity & Privilege Integrity**: Every `/users/{userId}` document must have `userId == request.auth.uid`, verified email (`request.auth.token.email_verified == true`), and users cannot self-assign `Operator` or `Administrator` roles unless bootstrapped as the verified admin email (`mumahadfaiz@stekom.ac.id`) or backed by a matching `/user_invites/{inviteId}` document created by an existing Administrator.
2. **PII Isolation**: `/users/{userId}` and `/user_invites/{inviteId}` contain email/phone PII and are strictly readable only by the record owner (`uid == request.auth.uid` or matching verified email) or an Administrator (`isAdmin()`).
3. **Role-Gated Campus Mutations**: Only authenticated users with role `Operator` or `Administrator` may create/update/delete `/events/{eventId}` or `/rooms/{roomId}`. `Viewer` accounts are strictly read-only on schedules and rooms.
4. **Immutable Audit Trail**: `/audit_logs/{logId}` documents must carry `actorUid == request.auth.uid`, `createdAt == request.time`, and cannot be updated or deleted by any client.
5. **Temporal Integrity**: All `createdAt` and `updatedAt` fields must match server `request.time`, and `createdAt`/`ownerUid` remain immutable on update.
6. **Terminal State Protection**: Once an event reaches `Dibatalkan`, non-admin `Operator` users cannot modify it; only `Administrator` override (`isAdmin()`) can restore or edit cancelled events.

## 2. Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Self-Role Escalation on Create**: Unprivileged user creates `/users/{uid}` with `role: "Administrator"` without an invite -> Rejected (`PERMISSION_DENIED`).
2. **Self-Role Escalation on Update**: User updates own `/users/{uid}` changing `role` from `"Viewer"` to `"Operator"` -> Rejected by `affectedKeys().hasOnly(['name', 'department', 'phone', 'updatedAt'])`.
3. **Ghost / Shadow Field Injection**: Creating `/events/evt_1` with an extra field `isApprovedBypass: true` -> Rejected by `keys().hasOnly(...)`.
4. **Unverified Email Bypass**: Request with `email_verified: false` attempting write -> Rejected by `isVerifiedEmail()`.
5. **Cross-User PII Read**: Non-admin user reading `/users/other_uid` -> Rejected by `isOwner(userId) || isAdmin()`.
6. **Blanket User List Scraping**: Non-admin querying `/users` without `where('uid', '==', auth.uid)` -> Rejected by `allow list` check on `resource.data.uid == request.auth.uid`.
7. **Viewer Creating Event**: Authenticated `Viewer` writing `/events/evt_1` -> Rejected by `isOperatorOrAdmin()`.
8. **Spoofed Event Owner**: Operator creating `/events/evt_1` with `ownerUid: "someone_else"` -> Rejected by `incoming().ownerUid == request.auth.uid`.
9. **Client Timestamp Forgery**: Creating `/events/evt_1` with backdated `createdAt` -> Rejected by `incoming().createdAt == request.time`.
10. **ID Poisoning**: Document ID > 128 chars or containing invalid characters `evt$bad` -> Rejected by `isValidId()`.
11. **Terminal State Mutation by Non-Admin**: Operator updating an event whose existing status is `"Dibatalkan"` -> Rejected by terminal state guard.
12. **Audit Log Tampering**: Any user attempting `update` or `delete` on `/audit_logs/{logId}` -> Rejected (`allow update, delete: if false`).
