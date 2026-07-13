---
title: Maintainer review
description: Review publishing applications, notifications, and canonical proposals.
---

**Requires:** the Canonical Maintainer role.

Open [Publishing](/#/publishing). Maintainers see a **Review queue** with counts for open Publish Applications, open Canonical Proposals, and unread notifications.

![The maintainer Publishing page with its review queue and workflow history.](/docs/screenshots/maintainer-review.png)

## Publishing applications

Review the applicant's message and current status. Approving an application unlocks publishing through the application-based permission path. This does not automatically grant the durable Publisher role. Reject applications that should not receive current permission.

## Canonical proposals

Filter proposals by status and kind, then inspect the structured differences. For an approval:

1. compare proposed values with the current canonical record;
2. select the fields or child records worth applying;
3. add a reviewer note when useful; and
4. choose **Approve + merge**.

Canonical proposals may come from publishers or from the canonical Blogspot importer. Imported proposals
show their source and observation time, but follow the same review rules as any other proposal. Expand
**Review accepted fields**, leave checked only the fields that should enter the canonical list, and edit a
value when the source needs correction. Approval stores those reviewed values separately from the original
submission.

Use **Reject** when the contribution should not enter the Canonical List. Use **Close** for duplicates or requests resolved another way. Duplicate and conflict warnings require judgment; GenreTV does not silently merge records by title alone.

## Notifications and history

Review actions update the associated notification state. Use **Mark all read** for remaining informational notices. **Show history** includes completed applications and proposals so prior decisions remain inspectable.
