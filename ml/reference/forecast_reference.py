import calendar
from datetime import date, timedelta

M32 = 0xFFFFFFFF

DEFAULTS = {
    "lookbackDays": 90,
    "iterations": 1000,
    "seed": 20240601,
    "bufferFloorCents": 500000,
    "minHistoryDays": 90,
    "gapDays": 14,
    "lowConfidenceSeries": 0.6,
}


class Prng:
    def __init__(self, seed):
        self.a = seed & M32

    def next_u32(self):
        self.a = (self.a + 0x6D2B79F5) & M32
        t = self.a
        t = ((t ^ (t >> 15)) * (t | 1)) & M32
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & M32)) & M32)) & M32
        return (t ^ (t >> 14)) & M32

    def next_int(self, bound):
        if bound <= 0 or bound > 1048576:
            raise ValueError("bound out of range")
        return (self.next_u32() * bound) >> 32


def iso(d):
    return d.isoformat()


def parse(s):
    return date.fromisoformat(s)


def add_days(s, n):
    return iso(parse(s) + timedelta(days=n))


def diff_days(a, b):
    return (parse(a) - parse(b)).days


def add_months(s, n):
    d = parse(s)
    total = d.year * 12 + (d.month - 1) + n
    y = total // 12
    m = total - y * 12 + 1
    day = min(d.day, calendar.monthrange(y, m)[1])
    return iso(date(y, m, day))


def month_step(freq):
    return {"monthly": 1, "quarterly": 3, "yearly": 12}.get(freq, 0)


def due_date_at(item, k):
    months = month_step(item["frequency"])
    if months > 0:
        return add_months(item["nextDueDate"], months * k)
    return add_days(item["nextDueDate"], max(1, item["intervalDays"]) * k)


def occurrences_between(item, after, until):
    out = []
    k = 0
    for _ in range(5000):
        d = due_date_at(item, k)
        if d > until:
            break
        if d > after:
            out.append(d)
        k += 1
    return out


def div_round(n, d):
    negative = (n < 0) != (d < 0)
    an, ad = abs(n), abs(d)
    q, r = divmod(an, ad)
    if r * 2 >= ad:
        q += 1
    return -q if negative else q


def percentile(sorted_vals, p):
    n = len(sorted_vals)
    if n == 0:
        return 0
    idx = (p * n + 99) // 100 - 1
    return sorted_vals[min(n - 1, max(0, idx))]


def find_gaps(dates, start, end, gap_days):
    unique = sorted(set(d for d in dates if start <= d <= end))
    gaps = []
    cursor = add_days(start, -1)
    for d in unique + [add_days(end, 1)]:
        missing = diff_days(d, cursor) - 1
        if missing >= gap_days:
            gaps.append({"from": add_days(cursor, 1), "to": add_days(d, -1)})
        cursor = d
    return gaps


def run_forecast(inp):
    lookback = inp.get("lookbackDays", DEFAULTS["lookbackDays"])
    iterations = inp.get("iterations", DEFAULTS["iterations"])
    seed = inp.get("seed", DEFAULTS["seed"])
    floor = inp.get("bufferFloorCents", DEFAULTS["bufferFloorCents"])
    horizon = inp["horizonDays"]
    as_of = inp["asOf"]
    window_start = add_days(as_of, -(lookback - 1))
    end_date = add_days(as_of, horizon)
    start_ord = parse(window_start).toordinal()

    daily = [0] * lookback
    uncounted = 0
    earliest = None
    txn_dates = []
    for t in inp["transactions"]:
        if t["date"] > as_of:
            continue
        if earliest is None or t["date"] < earliest:
            earliest = t["date"]
        txn_dates.append(t["date"])
        if t["date"] < window_start or t["category"] == "Transfer" or t["recurringId"] is not None:
            continue
        if t["amountCents"] < 0:
            daily[parse(t["date"]).toordinal() - start_ord] += -t["amountCents"]
        elif t["amountCents"] > 0:
            uncounted += t["amountCents"]

    committed = [0] * (horizon + 1)
    income_total = 0
    outflow_total = 0
    series_used = []
    uncertain = []
    has_income = False
    for s in inp["series"]:
        if not s["active"]:
            continue
        series_used.append(s["id"])
        if s["confidence"] < DEFAULTS["lowConfidenceSeries"]:
            uncertain.append(s["id"])
        if s["amountCents"] > 0:
            has_income = True
        for d in occurrences_between(s, as_of, end_date):
            day = diff_days(d, as_of)
            committed[day] += s["amountCents"]
            if s["amountCents"] > 0:
                income_total += s["amountCents"]
            else:
                outflow_total += -s["amountCents"]
    for o in inp.get("oneOffs", []):
        if o["date"] <= as_of or o["date"] > end_date:
            continue
        day = diff_days(o["date"], as_of)
        committed[day] += o["amountCents"]
        if o["amountCents"] > 0:
            income_total += o["amountCents"]
        else:
            outflow_total += -o["amountCents"]

    cum_committed = [0] * (horizon + 1)
    for d in range(1, horizon + 1):
        cum_committed[d] = cum_committed[d - 1] + committed[d]

    prng = Prng(seed)
    cum_spend = []
    for _ in range(iterations):
        cum = 0
        row = []
        for _d in range(horizon):
            cum += daily[prng.next_int(lookback)]
            row.append(cum)
        cum_spend.append(row)

    balance = inp["balanceCents"]
    bands = []
    for d in range(1, horizon + 1):
        col = sorted(balance + cum_committed[d] - cum_spend[i][d - 1] for i in range(iterations))
        bands.append({
            "day": d,
            "date": add_days(as_of, d),
            "p10": percentile(col, 10),
            "p50": percentile(col, 50),
            "p90": percentile(col, 90),
        })

    totals = [cum_spend[i][horizon - 1] for i in range(iterations)]
    spend_sorted = sorted(totals)
    sp10 = percentile(spend_sorted, 10)
    sp90 = percentile(spend_sorted, 90)
    buffer = max(floor, div_round(sp90 - sp10, 2))

    base = balance + cum_committed[horizon]
    finals = sorted(base - totals[i] - buffer for i in range(iterations))
    a10 = percentile(finals, 10)
    a50 = percentile(finals, 50)
    a90 = percentile(finals, 90)
    anchor = balance + income_total - outflow_total - buffer

    steps = [
        {"key": "balance", "p10": balance, "p50": balance, "p90": balance},
        {"key": "income", "p10": income_total, "p50": income_total, "p90": income_total},
        {"key": "committed", "p10": -outflow_total, "p50": -outflow_total, "p90": -outflow_total},
        {"key": "variable", "p10": a10 - anchor, "p50": a50 - anchor, "p90": a90 - anchor},
        {"key": "buffer", "p10": -buffer, "p50": -buffer, "p90": -buffer},
        {"key": "available", "p10": a10, "p50": a50, "p90": a90},
    ]

    history_days = 0 if earliest is None else diff_days(as_of, earliest) + 1
    gaps = []
    if earliest is not None:
        gaps = find_gaps(txn_dates, window_start if window_start > earliest else earliest, as_of, DEFAULTS["gapDays"])
    reasons = []
    if earliest is None:
        reasons.append({"code": "no_data", "blocking": True})
    elif history_days < DEFAULTS["minHistoryDays"]:
        reasons.append({"code": "short_history", "blocking": True})
    if earliest is not None and not has_income:
        reasons.append({"code": "no_income", "blocking": True})
    if gaps:
        reasons.append({"code": "gaps", "blocking": False})
    if uncertain:
        reasons.append({"code": "low_confidence_series", "blocking": False})

    blocked = any(r["blocking"] for r in reasons)
    spread_pct = div_round((a90 - a10) * 100, max(100000, abs(a50)))
    confidence = "none"
    if not blocked:
        if not reasons and spread_pct <= 40:
            confidence = "high"
        elif spread_pct <= 80:
            confidence = "medium"
        else:
            confidence = "low"

    return {
        "status": "insufficient" if blocked else "ok",
        "confidence": confidence,
        "reasons": reasons,
        "steps": steps,
        "available": {"p10": a10, "p50": a50, "p90": a90},
        "bufferCents": buffer,
        "bands": bands,
        "uncountedIncomeCents": uncounted,
        "gaps": gaps,
        "uncertainSeriesIds": uncertain,
        "historyDays": history_days,
    }
