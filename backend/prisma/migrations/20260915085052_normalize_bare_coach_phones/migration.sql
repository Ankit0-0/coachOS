-- Phone numbers are now saved digits-only with the country code (919876543210),
-- and the apps read a digits-only value as already international. The coach
-- phone field used to be free text, so a coach who typed a bare Indian mobile
-- number ("9876543210") would now have it read as +98. Nothing was saved in the
-- new format before this migration, so a bare ten-digit number starting 6-9 can
-- only be a national Indian one: give it India's code. Anything with a "+",
-- spaces or dashes is left as typed; the apps read that the way the form does.
UPDATE "CoachProfile"
SET "phone" = '91' || "phone"
WHERE "phone" ~ '^[6-9][0-9]{9}$';
