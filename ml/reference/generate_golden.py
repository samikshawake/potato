import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from forecast_reference import add_days, run_forecast

M32 = 0xFFFFFFFF


class Lcg:
    def __init__(self, seed):
        self.s = seed & M32

    def next(self, bound):
        self.s = (self.s * 1664525 + 1013904223) & M32
        return (self.s >> 8) % bound


def build_history(seed, as_of, days, salary_cents, rent_cents, gap=None, with_salary=True):
    rnd = Lcg(seed)
    merchants = [
        ("Swiggy", "Food", 18000, 62000),
        ("Zomato", "Food", 15000, 54000),
        ("BigBasket", "Groceries", 90000, 320000),
        ("Uber", "Travel", 12000, 48000),
        ("Amazon", "Shopping", 40000, 450000),
        ("Apollo Pharmacy", "Health", 20000, 120000),
    ]
    txns = []
    n = 0
    start = add_days(as_of, -(days - 1))
    for offset in range(days):
        d = add_days(start, offset)
        if gap and gap[0] <= d <= gap[1]:
            continue
        count = rnd.next(3)
        for _ in range(count):
            name, cat, lo, hi = merchants[rnd.next(len(merchants))]
            amount = lo + rnd.next(hi - lo)
            n += 1
            txns.append({"id": f"t{n}", "date": d, "amountCents": -amount, "category": cat, "recurringId": None})
        if d[8:10] == "01":
            n += 1
            txns.append({"id": f"t{n}", "date": d, "amountCents": -rent_cents, "category": "Rent", "recurringId": "rec_rent"})
            if with_salary:
                n += 1
                txns.append({"id": f"t{n}", "date": d, "amountCents": salary_cents, "category": "Salary", "recurringId": "rec_salary"})
    return txns


def series(salary_cents, rent_cents, next_first, with_salary=True, salary_conf=0.95):
    out = [
        {"id": "rec_rent", "amountCents": -rent_cents, "intervalDays": 30, "frequency": "monthly", "nextDueDate": next_first, "confidence": 0.95, "active": True},
        {"id": "rec_netflix", "amountCents": -64900, "intervalDays": 30, "frequency": "monthly", "nextDueDate": add_days(next_first, 9), "confidence": 0.9, "active": True},
        {"id": "rec_gym", "amountCents": -150000, "intervalDays": 90, "frequency": "quarterly", "nextDueDate": add_days(next_first, 14), "confidence": 0.5, "active": True},
        {"id": "rec_paused", "amountCents": -99900, "intervalDays": 7, "frequency": "weekly", "nextDueDate": add_days(next_first, 2), "confidence": 0.9, "active": False},
    ]
    if with_salary:
        out.append({"id": "rec_salary", "amountCents": salary_cents, "intervalDays": 30, "frequency": "monthly", "nextDueDate": next_first, "confidence": salary_conf, "active": True})
    return out


def scenario(name, seed, as_of, days, horizon, balance, salary, rent, next_first, **kw):
    gap = kw.get("gap")
    with_salary = kw.get("with_salary", True)
    txns = [] if days == 0 else build_history(seed, as_of, days, salary, rent, gap, with_salary)
    inp = {
        "asOf": as_of,
        "balanceCents": balance,
        "transactions": txns,
        "series": series(salary, rent, next_first, with_salary, kw.get("salary_conf", 0.95)),
        "horizonDays": horizon,
        "oneOffs": kw.get("one_offs", []),
    }
    if "iterations" in kw:
        inp["iterations"] = kw["iterations"]
    if "seed_override" in kw:
        inp["seed"] = kw["seed_override"]
    if "lookback" in kw:
        inp["lookbackDays"] = kw["lookback"]
    return {"name": name, "input": inp, "expected": run_forecast(inp)}


def main():
    scenarios = [
        scenario("steady_three_months", 11, "2025-03-15", 120, 30, 12000000, 7500000, 2500000, "2025-04-01"),
        scenario("short_history", 12, "2025-03-15", 40, 30, 5000000, 6000000, 2000000, "2025-04-01"),
        scenario("with_gap", 13, "2025-03-15", 120, 45, 8000000, 6500000, 2200000, "2025-04-01", gap=("2025-01-10", "2025-02-05")),
        scenario("no_income", 14, "2025-03-15", 100, 30, 3000000, 0, 1800000, "2025-04-01", with_salary=False),
        scenario("no_data", 15, "2025-03-15", 0, 30, 1000000, 5000000, 1500000, "2025-04-01"),
        scenario("custom_seed_lookback", 16, "2024-02-20", 150, 60, 20000000, 9000000, 3000000, "2024-03-01", seed_override=7, lookback=60, iterations=500, one_offs=[{"date": "2024-03-10", "amountCents": -8000000}, {"date": "2024-04-05", "amountCents": 1500000}]),
        scenario("low_confidence_income", 17, "2025-06-30", 130, 90, 15000000, 5500000, 2000000, "2025-07-01", salary_conf=0.4),
    ]
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures", "forecast_golden.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"version": 1, "scenarios": scenarios}, f, separators=(",", ":"))
    print(f"wrote {len(scenarios)} scenarios to {out}")


if __name__ == "__main__":
    main()
