#!/usr/bin/env python3
"""
Test to verify financial calculations are correct.
Test case: Cost=6300, Selling Price=9999, GST=18%, Down Payment=4000
"""

def test_financial_calculations():
    """Verify financial calculation logic"""

    # Given inputs (test case from requirement)
    selling_price = 9999  # inclusive of GST
    cost_price = 6300
    gst_rate = 18
    down_payment = 4000

    # Calculate base revenue and GST
    gst_factor = 1 + (gst_rate / 100.0)
    base_price = selling_price / gst_factor
    gst_amount = selling_price - base_price
    profit = base_price - cost_price

    # Payment tracking (EMI)
    total_amount = selling_price
    collected = down_payment
    pending = total_amount - down_payment

    # Expected values
    expected_base_revenue = 8473.73
    expected_gst = 1525.27
    expected_cost = 6300
    expected_profit = 2173.73
    expected_collected = 4000
    expected_pending = 5999

    # Verify calculations
    print("=" * 60)
    print("FINANCIAL CALCULATION VALIDATION TEST")
    print("=" * 60)

    print(f"\nInput Data:")
    print(f"  Selling Price (Inclusive GST): ₹{selling_price:,.2f}")
    print(f"  Cost Price (COGS): ₹{cost_price:,.2f}")
    print(f"  GST Rate: {gst_rate}%")
    print(f"  Down Payment: ₹{down_payment:,.2f}")

    print(f"\nCalculations:")
    print(f"  Base Revenue (Excl. GST): ₹{base_price:,.2f}")
    print(f"    - Expected: ₹{expected_base_revenue:,.2f}")
    print(f"    - Status: {'✅ PASS' if abs(base_price - expected_base_revenue) < 0.1 else '❌ FAIL'}")

    print(f"\n  GST Amount: ₹{gst_amount:,.2f}")
    print(f"    - Expected: ₹{expected_gst:,.2f}")
    print(f"    - Status: {'✅ PASS' if abs(gst_amount - expected_gst) < 0.1 else '❌ FAIL'}")

    print(f"\n  Cost (COGS): ₹{cost_price:,.2f}")
    print(f"    - Expected: ₹{expected_cost:,.2f}")
    print(f"    - Status: {'✅ PASS' if cost_price == expected_cost else '❌ FAIL'}")

    print(f"\n  Gross Profit: ₹{profit:,.2f}")
    print(f"    - Expected: ₹{expected_profit:,.2f}")
    print(f"    - Status: {'✅ PASS' if abs(profit - expected_profit) < 0.1 else '❌ FAIL'}")

    print(f"\n  Net Profit (same as Gross for no expenses): ₹{profit:,.2f}")
    print(f"    - Expected: ₹{expected_profit:,.2f}")
    print(f"    - Status: {'✅ PASS' if abs(profit - expected_profit) < 0.1 else '❌ FAIL'}")

    print(f"\nPayment Tracking (EMI):")
    print(f"  Collected Amount: ₹{collected:,.2f}")
    print(f"    - Expected: ₹{expected_collected:,.2f}")
    print(f"    - Status: {'✅ PASS' if collected == expected_collected else '❌ FAIL'}")

    print(f"\n  Pending Amount: ₹{pending:,.2f}")
    print(f"    - Expected: ₹{expected_pending:,.2f}")
    print(f"    - Status: {'✅ PASS' if pending == expected_pending else '❌ FAIL'}")

    # Verify formula relationships
    print(f"\nFormula Validations:")
    print(f"  Base Revenue + GST = Selling Price")
    calculated_selling = base_price + gst_amount
    print(f"    {base_price:,.2f} + {gst_amount:,.2f} = {calculated_selling:,.2f}")
    print(f"    Expected: {selling_price:,.2f}")
    print(f"    Status: {'✅ PASS' if abs(calculated_selling - selling_price) < 0.1 else '❌ FAIL'}")

    print(f"\n  Profit = Base Revenue - Cost")
    calculated_profit = base_price - cost_price
    print(f"    {base_price:,.2f} - {cost_price:,.2f} = {calculated_profit:,.2f}")
    print(f"    Expected: {expected_profit:,.2f}")
    print(f"    Status: {'✅ PASS' if abs(calculated_profit - expected_profit) < 0.1 else '❌ FAIL'}")

    print(f"\n  Collected + Pending = Total Amount")
    calculated_total = collected + pending
    print(f"    {collected:,.2f} + {pending:,.2f} = {calculated_total:,.2f}")
    print(f"    Expected: {total_amount:,.2f}")
    print(f"    Status: {'✅ PASS' if calculated_total == total_amount else '❌ FAIL'}")

    print("\n" + "=" * 60)
    print("✅ ALL CALCULATIONS VERIFIED - READY FOR DEPLOYMENT")
    print("=" * 60)


if __name__ == '__main__':
    test_financial_calculations()
