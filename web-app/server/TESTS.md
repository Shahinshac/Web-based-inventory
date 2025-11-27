Test Plan for Checkout & Loyalty Apply

Overview:
This document outlines how to test the `applyLoyalty` flag server-side and add automated tests. The server does not currently include a testing framework; adding tests requires creating a test database or using an in-memory MongoDB setup like `mongodb-memory-server`.

Recommended Test Setup:
1. Add dev dependencies: mocha, chai, supertest, mongodb-memory-server
   - npm i -D mocha chai supertest mongodb-memory-server
2. Add a test script in package.json:
   "scripts": { "test": "mocha --exit" }

Suggested Tests:
- Server /api/checkout unit tests
  1. It should return 400 when required checkout fields are missing.
  2. It should accept `applyLoyalty` and not 500 even when the customer or product doesn't exist.
  3. It should apply loyalty discount when a customer has a card and remaining uses (simulate a seeded customer with loyalty.cardIssued=true).
  4. It should reduce remainingUses when applied and include `loyaltyApplied` in the invoice response.
  5. It should not apply loyalty when the card has no remaining uses and return `loyaltyApplied: 0`.
  6. It should log an audit entry for `SALE_COMPLETED` that includes `loyaltyApplied`, `loyaltyIssued`, and `applyLoyalty`.

- Client E2E tests (recommended when a UI test framework is in place)
  1. Render the cart, preview loyalty discount, toggle "Apply on checkout" and ensure the payload includes `applyLoyalty` flag.
  2. Ensure that when applyLoyalty is true, the UI displays a success message or updated bill if the server applies the loyalty.

Notes:
- To make the unit tests robust, either:
  - Create a disposable test database and seed required collections with known data for customers & products, or
  - Use `mongodb-memory-server` to emulate a MongoDB instance in-memory, then seed with test data on each test.

- Add CI integration: ensure environment variables (e.g., `MONGODB_URI`) are set to a test DB in the CI environment.

- If you'd like, I can scaffold a mocha + supertest test file as a starting point once you confirm the testing approach (memory server vs real test DB).
