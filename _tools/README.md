# _tools — encoding & formatting audits

Standalone Node scripts that guard the two system-wide display contracts
documented in `Tailoring/src/utils/currency.ts` and
`Tailoring/src/utils/productionTime.ts`.

## `scanMojibake.cjs`

Audits **both projects** (`Tailoring_Ms` and `TAILORING_MS_SERVER`) for
double-encoded UTF-8 (mojibake) such as `â‚±` (should be `₱ U+20B1`),
`â€“` (en dash `–`) and `â€”` (em dash `—`). Mojibake runs are detected by
replaying the Windows-1252 → UTF-8 mis-decode and rewriting only the runs that
decode cleanly, so already-correct Unicode is never touched.

```bash
node _tools/scanMojibake.cjs           # report only  -> _tools/mojibake-report.txt
node _tools/scanMojibake.cjs --write   # repair the files in place
```

Expected result: `FOUND: 0 line(s)`.

## `auditCurrency.cjs`

Finds raw/manual peso strings that bypass the shared formatter, plus legacy
production-time copy. Output: `_tools/audit-report.txt`.

```bash
node _tools/auditCurrency.cjs
```

Review the report for `RAW-PESO-TEMPLATE` and `RAW-PESO-CONCAT` hits: real code
hits should be replaced with `formatPHP(...)` / `formatPHPExact(...)` /
`formatPHPSmart(...)`. Catalog price labels, form placeholders and comments are
the only acceptable literal `₱` uses.

## `verifyFormatting.ts`

Regression check for the exact strings the shop requires. Prints the currency
and production-time output for the shop's reference values.

```bash
node --experimental-strip-types --no-warnings _tools/verifyFormatting.ts
```

Expected:

```
Starting Price       ₱1,800
Labor Estimate       ₱1,080
Material Estimate    ₱540
Suggested Deposit    ₱900
businessDayRange(7,10)       7–10 Business Days
businessDayRange(5,7)        5–7 Business Days
```