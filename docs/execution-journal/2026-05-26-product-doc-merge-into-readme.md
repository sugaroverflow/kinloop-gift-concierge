## 2026-05-26T22:15:00Z - Product Doc Merge Into README

### Goal

Consolidate product guidance into `README.md` and remove standalone `PRODUCT.md` to simplify repo docs.

### Changes

- Merged product purpose, users, and principles into a new `Product Focus` section in `README.md`.
- Removed `PRODUCT.md` from the repository.
- Updated `AGENTS.md` "Read First" list to remove `PRODUCT.md`.
- Updated `scripts/check-docs.mjs` required file and README-reference checks to no longer require `PRODUCT.md`.

### Decisions

- Kept product context in one primary entry document (`README.md`) to reduce doc fragmentation.
- Preserved only product statements aligned to current app behavior and boundaries.

### Tradeoffs

- Lost a separate product-brief file that could be shared independently.
- Product and onboarding context now coexist in one document, which is simpler but denser.

### Risks

- Future product updates may bloat `README.md` if not kept concise.

### Verification

Executed with Docker:

```txt
scripts/container-run.sh npm run check:docs
```

Result:

- Docs check passed (`8 files` required by docs guard).
- Repository-wide search shows no remaining `PRODUCT.md` references.

### Demo Impact

No runtime or demo-flow behavior changed.

### Customer-Facing Context

Product intent is now directly visible in the main project entrypoint without navigating to a second brief.

### Next Recommended Step

If desired, perform one more README trim pass to keep only app-shipped behavior and move any forward-looking language into `docs/future-considerations.md`.
