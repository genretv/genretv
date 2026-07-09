# Approval-Based Current Publishing Permission

Publisher permission has two intentionally separate meanings in genretv. A durable role such as `publisher` or `canonical_maintainer` represents a system-level publishing identity, while an approved Publish Application represents that a normal user is currently allowed to publish through the app.

For now, approving a Publish Application should unlock publishing without automatically granting a persistent `publisher` role. This keeps the "system publisher" role available for seeded, trusted, operational, or future administrative accounts, while still allowing maintainers to approve ordinary users for publishing through the review workflow. A later promotion system can add durable role grants if we decide that approval should become account-level role assignment, but the MVP should treat application approval as its own first-class authorization path.
