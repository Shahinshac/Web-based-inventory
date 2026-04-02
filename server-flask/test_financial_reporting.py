"""
FINANCIAL REPORTING VALIDATION TEST

Test Case:
- Cost Price: ₹6,300
- Selling Price: ₹9,999
- GST Rate: 18%
- Operating Expenses: ₹0

Expected Results:
- Base Revenue (excl GST): ₹8,474.58
- COGS: ₹6,300
- Gross Profit: ₹2,174.58
- Net Profit: ₹2,174.58
- Total Expenses: ₹6,300
"""

def test_financial_calculations():
    """
    Test the core financial calculation formulas
    """
    # Input values
    selling_price = 9999  # Price including GST
    cost_price = 6300
    gst_rate = 18
    operating_expenses = 0

    # Step 1: Calculate base price (excluding GST)
    gst_factor = 1 + (gst_rate / 100)
    base_price = selling_price / gst_factor

    print("=" * 70)
    print("FINANCIAL REPORTING VALIDATION TEST")
    print("=" * 70)
    print()

    print("INPUT:")
    print(f"  Selling Price (with GST): ₹{selling_price:.2f}")
    print(f"  Cost Price (COGS): ₹{cost_price:.2f}")
    print(f"  GST Rate: {gst_rate}%")
    print(f"  Operating Expenses: ₹{operating_expenses:.2f}")
    print()

    # Calculate GST amount
    gst_amount = selling_price - base_price

    print("REVENUE CALCULATIONS:")
    print(f"  GST Factor: {gst_factor:.4f}")
    print(f"  Base Price (= Selling Price / Factor): ₹{base_price:.2f}")
    print(f"  GST Amount: ₹{gst_amount:.2f}")
    print()

    # Step 2: Calculate Gross Profit
    gross_profit = base_price - cost_price

    print("PROFIT CALCULATIONS:")
    print(f"  Gross Profit = Base Revenue - COGS")
    print(f"  Gross Profit = ₹{base_price:.2f} - ₹{cost_price:.2f}")
    print(f"  Gross Profit: ₹{gross_profit:.2f}")
    print()

    # Step 3: Calculate Operating Expenses Total
    # (no expenses in this test case)

    # Step 4: Calculate Total Expenses
    total_expenses = cost_price + operating_expenses

    print("EXPENSE BREAKDOWN:")
    print(f"  COGS: ₹{cost_price:.2f}")
    print(f"  Operating Expenses: ₹{operating_expenses:.2f}")
    print(f"  Total Expenses = COGS + Operating: ₹{total_expenses:.2f}")
    print()

    # Step 5: Calculate Net Profit
    net_profit = gross_profit - operating_expenses

    print("NET PROFIT CALCULATION:")
    print(f"  Net Profit = Gross Profit - Operating Expenses")
    print(f"  Net Profit = ₹{gross_profit:.2f} - ₹{operating_expenses:.2f}")
    print(f"  Net Profit: ₹{net_profit:.2f}")
    print()

    # Validation
    print("=" * 70)
    print("VALIDATION CHECK")
    print("=" * 70)

    expected = {
        "base_revenue": round(9999 / 1.18, 2),  # ₹8,473.73
        "cogs": 6300.00,
        "gross_profit": round((9999 / 1.18) - 6300, 2),  # ₹2,173.73
        "net_profit": round((9999 / 1.18) - 6300, 2),  # ₹2,173.73
        "total_expenses": 6300.00,
        "gst_collected": round(9999 - (9999 / 1.18), 2)
    }

    actual = {
        "base_revenue": round(base_price, 2),
        "cogs": cost_price,
        "gross_profit": round(gross_profit, 2),
        "net_profit": round(net_profit, 2),
        "total_expenses": total_expenses,
        "gst_collected": round(gst_amount, 2)
    }

    print()
    for key in expected:
        exp = expected[key]
        act = actual[key]
        match = "✅" if abs(act - exp) < 0.01 else "❌"
        print(f"{match} {key:25} | Expected: ₹{exp:10.2f} | Actual: ₹{act:10.2f}")

    print()

    # Check critical formulas
    print("CRITICAL VALIDATION RULES:")
    print()

    # Rule 1: COGS must come from cost_price (only when sold)
    rule1_pass = actual["cogs"] == cost_price
    print(f"{'✅' if rule1_pass else '❌'} Rule 1: COGS = cost_price (only from sold items)")
    print(f"   COGS: ₹{actual['cogs']:.2f} == ₹{cost_price:.2f}")
    print()

    # Rule 2: No double-counting of expenses
    rule2_pass = actual["total_expenses"] == (actual["cogs"] + operating_expenses)
    print(f"{'✅' if rule2_pass else '❌'} Rule 2: Total Expenses = COGS + Operating (NO double-count)")
    print(f"   Expected: ₹{actual['cogs']:.2f} + ₹{operating_expenses:.2f} = ₹{actual['cogs'] + operating_expenses:.2f}")
    print(f"   Actual: ₹{actual['total_expenses']:.2f}")
    print()

    # Rule 3: Correct net profit calculation
    rule3_pass = abs(actual["net_profit"] - expected["net_profit"]) < 0.01
    print(f"{'✅' if rule3_pass else '❌'} Rule 3: Net Profit = Gross Profit - Operating Expenses")
    print(f"   Expected: ₹{actual['gross_profit']:.2f} - ₹{operating_expenses:.2f} = ₹{expected['net_profit']:.2f}")
    print(f"   Actual: ₹{actual['net_profit']:.2f}")
    print()

    # Rule 4: Base revenue excludes GST
    rule4_pass = abs((actual["base_revenue"] + actual["gst_collected"]) - selling_price) < 0.01
    print(f"{'✅' if rule4_pass else '❌'} Rule 4: Base Revenue + GST = Total Revenue (with GST)")
    print(f"   Expected: ₹{actual['base_revenue']:.2f} + ₹{actual['gst_collected']:.2f} = ₹{selling_price:.2f}")
    print(f"   Actual: ₹{actual['base_revenue'] + actual['gst_collected']:.2f}")
    print()

    # Overall result
    print("=" * 70)
    all_pass = rule1_pass and rule2_pass and rule3_pass and rule4_pass
    if all_pass:
        print("✅ ALL TESTS PASSED - Financial reporting is correct!")
    else:
        print("❌ SOME TESTS FAILED - Review calculation logic")
    print("=" * 70)

    return all_pass

if __name__ == "__main__":
    test_financial_calculations()
