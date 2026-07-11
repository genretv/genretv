# End-User Documentation

GenreTV will provide one public end-user documentation site at `/docs` for anonymous visitors, signed-in users, publishers, and maintainers. Pages for role-gated actions will state the required role instead of being hidden from other readers.

The documentation is organized around user goals rather than mirroring application routes:

1. **Getting Started** introduces GenreTV, the canonical schedule, accounts, and the difference between browsing and managing a personal list.
2. **Browse the Schedule** covers schedule sections, dates and confidence, row details, search, filters, sorting, pagination, external links, and the mobile layout.
3. **Build Your List** covers the canonical baseline, personal overlays, adding and editing Shows and Seasons, exclusions, and linked versus detached imports.
4. **Publish and Share** covers publisher eligibility, applications, public snapshots, published lists, and importing from another person's list.
5. **Contribute to GenreTV** covers proposing Shows, Seasons, and Episodes for inclusion in the Canonical List and following proposal outcomes.
6. **Manage the Canonical List** covers maintainer review, selective merge, rejection, publisher approval, and current publishing permission.
7. **Account, Offline Data, and Exports** covers sign-up, sign-in, password recovery, sign-out behavior, offline/local data expectations, and HTML and database exports.
8. **Reference** provides a glossary, schedule-placement rules, role and permission summaries, and troubleshooting.

Page titles and links should use the product's established domain language. Pages may identify the corresponding screen or route, but the route hierarchy does not determine the documentation hierarchy.

## Visual Guidance

Screenshots are used sparingly for orientation rather than as the primary instructions. The initial documentation includes one current screenshot for each major visual context where it materially helps: browsing the schedule, managing a personal list, publishing or importing a public list, and maintainer review. Procedural text refers to visible control names and expected outcomes instead of relying on a control's exact position. Small interactions and forms do not each receive their own screenshot.

## Technical Depth

The main documentation explains observable behavior in plain language. It says that GenreTV keeps a local database in the browser, synchronizes the data available to the user, supports appropriate local work when connectivity is interrupted, and retains the mapped local database when the user signs out. Users are not required to understand the synchronization architecture to use the product.

PGlite and pgxsinkit may be named in optional technical notes, database-export documentation, and troubleshooting where the implementation name helps the reader understand or diagnose something. Electric is only named where it provides actionable diagnostic context. Architecture and library integration guidance remains in the repository's developer documentation, not the end-user site.

## Releases

The end-user documentation is unversioned and describes the application currently deployed at the site root. Application and documentation builds are published together so instructions, screenshots, and product behavior remain aligned. Historical documentation is available only through the source repository's Git history; the public site has no version selector.

## App Integration

The application's global navigation includes a visible **Help** link for anonymous and signed-in users. Compact mobile navigation may represent it with a standard question-mark-circle icon, with an accessible **Help** label. The documentation header includes an **Open GenreTV** link to the application root. These links use normal same-tab navigation and do not force a new browsing context.

## Accuracy Boundary

Public documentation describes only behavior that is implemented and verified in the deployed application. Agreed or planned features remain in internal plans and ADRs until they work end to end. Role-gated behavior may be documented, but the page must identify the required role and must not imply that an unavailable or incomplete workflow exists.
