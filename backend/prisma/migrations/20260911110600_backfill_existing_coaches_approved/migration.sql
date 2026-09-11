-- Coaches that existed before the approval workflow were already working with
-- clients. Leaving them NULL would read as "not approved" to the new gate and
-- lock every one of them out overnight, so they are grandfathered in.
--
-- Scoped to rows created before this migration by targeting only NULL, since
-- registration now always writes PENDING for a new coach.
UPDATE "User"
SET "coachApprovalStatus" = 'APPROVED'
WHERE "role" = 'COACH' AND "coachApprovalStatus" IS NULL;
