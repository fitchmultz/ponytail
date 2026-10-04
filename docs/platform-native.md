# Platform-Native Solutions

The lazy senior dev's first question is always: *does the platform already do this?*

These are candidates for common cases, not drop-in equivalence claims or a
required checklist before installing a package. Check required semantics,
accessibility, platform support, and UX. Reuse a sufficient native feature;
otherwise adopt maintained OSS when useful rather than writing a custom
substitute to avoid dependencies.

---

## HTML Elements

Things the browser already has as a form control.

| You think you need | What the platform has |
|---|---|
| Date picker library | `<input type="date">` |
| Time picker library | `<input type="time">` |
| Color picker library | `<input type="color">` |
| Range slider library | `<input type="range">` |
| Progress bar component | `<progress value="70" max="100">` |
| Meter/gauge component | `<meter value="0.7">` |
| Modal/dialog library | `<dialog>` + `dialog.showModal()` |
| Accordion/FAQ component | `<details><summary>Title</summary>…</details>` |
| Simple advisory text | `title` (not a keyboard/touch-accessible tooltip replacement) |
| Basic input suggestions | `<input list="id"> <datalist id="id">` (not a full combobox) |
| Auto-growing textarea | `field-sizing: content` (CSS) |
| Sticky header | `position: sticky; top: 0` (CSS) |

---

## CSS Capabilities

Things developers reach for JavaScript to do.

| You think you need JS for | What CSS has |
|---|---|
| Responsive font size | `font-size: clamp(1rem, 2.5vw, 2rem)` |
| Fluid spacing | `padding: clamp(1rem, 5vw, 3rem)` |
| Dark mode | `@media (prefers-color-scheme: dark)` |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` |
| Responsive layout without breakpoints | `grid-template-columns: repeat(auto-fill, minmax(250px, 1fr))` |
| Component-level responsive design | `@container` queries |
| Global design tokens / theming | CSS custom properties (`--color-primary: #7c3aed`) |
| Smooth scroll | `scroll-behavior: smooth` |
| Scroll-snap carousel | `scroll-snap-type: x mandatory` + `scroll-snap-align: start` |
| Aspect ratio enforcement | `aspect-ratio: 16 / 9` |
| Truncate text with ellipsis | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` |
| Multi-line text clamp | `-webkit-line-clamp: 3` |
| CSS cascade layers (style isolation) | `@layer base, components, utilities` |
| Nested CSS selectors | Native CSS nesting (no preprocessor needed) |
| `has()` parent selector | `:has(input:checked)` |

---

## JavaScript / Browser APIs

Libraries people install that the runtime already ships.

| You think you need | What the platform has |
|---|---|
| `query-string` / `qs` | `new URLSearchParams(location.search)` |
| `lodash.clonedeep` | `structuredClone(obj)` |
| `lodash.groupby` | `Object.groupBy(arr, fn)` |
| Simple trailing debounce | see limited implementation below; keep a library for richer semantics |
| `numeral` / `accounting` | `new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })` |
| `date-fns` format | `new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date)` |
| `date-fns` relative time | `new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-3, "day")` |
| `plural` / `i18n` plurals | `new Intl.PluralRules("en-US").select(count)` |
| `clipboard.js` | `navigator.clipboard.writeText(text)` |
| `uuid` (v4) | `crypto.randomUUID()` |
| Infinite scroll library | `new IntersectionObserver(cb).observe(sentinel)` |
| Resize listener library | `new ResizeObserver(cb).observe(element)` |
| DOM mutation watcher | `new MutationObserver(cb).observe(el, options)` |
| `uuid-validate` | `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)` |
| `is-online` / `connectivity check` | `navigator.onLine` + `online`/`offline` events |
| `sharesheet` library | `navigator.share({ title, text, url })` |
| `store.js` / `localForage` (simple case) | `localStorage.setItem(key, JSON.stringify(val))` |
| Abort fetch on timeout | `AbortSignal.timeout(5000)` passed to `fetch` |
| Custom event bus | `new EventTarget()` / `dispatchEvent(new CustomEvent("x", { detail }))` |

**Simple trailing debounce** (one independent timer per wrapped function):
```js
// ponytail: trailing calls only; use a maintained debounce for cancel/flush, leading, or maxWait
const debounce = (fn, ms) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
};
```

---

## Swift / SwiftUI

UI components people reach for a library or a custom view for.

| You think you need | What the platform has |
|---|---|
| Date/time picker library | `DatePicker` |
| Color picker library | `ColorPicker` |
| Search bar + filtering | `.searchable(text:)` |
| Pull-to-refresh library | `.refreshable { }` |
| Swipe-to-delete / row actions | `.swipeActions { }` |
| Basic async image loading | `AsyncImage` (not a configurable image-cache pipeline) |
| Charting library | Swift Charts (`import Charts`) |
| Markdown rendering | `Text(...)` markdown / `AttributedString(markdown:)` |
| Share sheet wrapper | `ShareLink` |
| Loading spinner | `ProgressView()` |
| Photo picker | `PhotosPicker` |
| Map SDK (basic) | `Map` (MapKit for SwiftUI) |
| Grid layout library | `Grid` / `LazyVGrid` |

Frameworks and stdlib that wrappers wrap.

| You think you need | What the platform has |
|---|---|
| JSON library (SwiftyJSON) | `Codable` + `JSONDecoder` / `JSONEncoder` |
| HTTP client (Alamofire, simple use) | `URLSession` async/await; Alamofire earns it for complex retry/multipart at scale |
| Date/number/currency formatting | `.formatted()` / `FormatStyle` |
| Regex library | Swift regex literals + `Regex` |
| Crypto library (CryptoSwift) | `CryptoKit` |
| Keychain operations | Security `SecItem`; use a maintained wrapper when it simplifies correct access/error handling |
| Persistence / ORM | `SwiftData`, or `@AppStorage` for small key-values |
| Logging library | `Logger` (`os.log`) |
| UUID / Base64 helpers | `UUID()`, `Data(...).base64EncodedString()` |
| Image downsampling | ImageIO `CGImageSourceCreateThumbnailAtIndex` |
| Combine wrappers for async | async/await + `AsyncSequence` |

---

## Node.js Standard Library

Packages that wrap Node built-ins.

| You think you need | What Node has |
|---|---|
| `mkdirp` | `fs.mkdirSync(path, { recursive: true })` |
| `rimraf` | `fs.rmSync(path, { recursive: true, force: true })` |
| `make-dir` | `fs.mkdirSync(path, { recursive: true })` |
| Native path normalization | `path.normalize()` (does not convert Windows separators to `/` like `slash`) |
| `uuid` (v4) | `crypto.randomUUID()` |
| `ms` (parse duration strings) | keep `ms`, it's genuinely useful and tiny |
| `is-stream` | `val instanceof stream.Readable` |
| `object-assign` | `Object.assign()` / spread |
| `array-uniq` | `[...new Set(arr)]` |
| `array-flatten` | `arr.flat(Infinity)` |
| Flatten nested arrays | `arr.flat(depth)` (not the object-flattening package `flat`) |
| `path-exists` | `fs.existsSync(path)` |
| `load-json-file` | `JSON.parse(fs.readFileSync(path, "utf8"))` |
| `write-json-file` | `fs.writeFileSync(path, JSON.stringify(obj, null, 2))` |
| Known module-relative directory | `path.resolve(__dirname, "..")` / `import.meta.dirname` (not upward package-root discovery) |

---

## Python Standard Library

Packages that wrap what Python already ships.

| You think you need | What Python has |
|---|---|
| `python-dateutil` (basic parsing) | `datetime.fromisoformat()` (Python 3.7+) |
| `pytz` | `zoneinfo.ZoneInfo("America/New_York")` (Python 3.9+) |
| `attrs` (simple data classes) | `@dataclass` |
| `six` | drop it, Python 2 is gone |
| `pathlib2` | `pathlib.Path` (built-in since Python 3.4) |
| `enum34` | `enum.Enum` (built-in since Python 3.4) |
| Built-in typing on supported Python | `typing` + built-in generics; keep `typing_extensions` for required backports |
| `simplejson` (basic use) | `json` (stdlib) |
| `requests` (simple GET) | `urllib.request.urlopen(url)`, `requests` for anything real |
| `click` (single command) | `argparse` (stdlib) |
| Shallow dictionary merge | `dict \| other_dict` (Python 3.9+); not a `mergedeep` replacement |
| `more-itertools` (basic) | `itertools` (stdlib): `chain`, `islice`, `groupby`, `product` |
| `toolz` (basic) | `functools`: `lru_cache`, `partial`, `reduce` |
| `tabulate` (dev/debug only) | `pprint.pprint()` for quick inspection |

---

## Database

Things the application layer implements that the database already does.

| You think you need app code for | What the database has |
|---|---|
| Pagination offset/limit | `LIMIT 20 OFFSET 40` |
| Running totals | `SUM(...) OVER (ORDER BY date)` (window function) |
| Rank within group | `RANK() OVER (PARTITION BY category ORDER BY score DESC)` |
| Pivot / cross-tab | `FILTER (WHERE ...)` + conditional aggregation |
| Deduplication | `SELECT DISTINCT` / `ON CONFLICT DO NOTHING` |
| Soft-delete filtering | Generated column + partial index |
| Tree traversal | Recursive CTE (`WITH RECURSIVE`) |
| Full-text search (basic) | `tsvector` / `MATCH AGAINST` / `FTS5` |
| JSON storage + query | `jsonb` (Postgres) / `JSON_EXTRACT` (SQLite/MySQL) |
| UUID generation | `gen_random_uuid()` (Postgres) / `UUID()` (MySQL) |
| Timestamps on insert/update | `DEFAULT now()` + trigger or `ON UPDATE CURRENT_TIMESTAMP` |
| Enforce uniqueness | `UNIQUE` constraint, not application-level checks |
| Enforce referential integrity | `FOREIGN KEY`, not application-level checks |
| Enforce stored value ranges | `CHECK (price > 0)`; retain application trust-boundary validation |

---

## The Pattern

Reuse native solutions when they cover the complete requirement. Maintained
libraries can add valuable semantics, compatibility, accessibility, ergonomics,
and reliable error handling; install them when useful. Prefer the simplest
complete solution, not the fewest dependencies or lines of code.
