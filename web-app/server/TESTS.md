Test Plan for Checkout

Overview:
This document outlines how to test checkout behavior and add automated tests. The server does not currently include a testing framework; adding tests requires creating a test database or using an in-memory MongoDB setup like `mongodb-memory-server`.

Recommended Test Setup:
1. Add dev dependencies: mocha, chai, supertest, mongodb-memory-server
   - npm i -D mocha chai supertest mongodb-memory-server
2. Add a test script in package.json:
   "scripts": { "test": "mocha --exit" }

Suggested Tests:
- Server /api/checkout unit tests
  1. It should return 400 when required checkout fields are missing.
  2. It should accept a normal checkout request and return a bill object with expected totals and items.
  3. It should update product stocks and increment customer purchasesCount and totalPurchases.
  4. It should store grandTotal as an integer and include expected tax/profit fields.

Note: Admin endpoints related to loyalty were removed as part of this change. Keep admin endpoints coverage limited to user management, migration endpoints, and audit checks.

- Client E2E tests (recommended when a UI test framework is in place)
  1. Render the cart, add items, select a customer, complete a sale, and ensure the server returns a proper bill and the UI shows it.
  2. Validate that the invoice content is consistent between the client and the server response.

Notes:
- To make the unit tests robust, either:
  - Create a disposable test database and seed required collections with known data for customers & products, or
  - Use `mongodb-memory-server` to emulate a MongoDB instance in-memory, then seed with test data on each test.

- Add CI integration: ensure environment variables (e.g., `MONGODB_URI`) are set to a test DB in the CI environment.

- If you'd like, I can scaffold a mocha + supertest test file as a starting point once you confirm the testing approach (memory server vs real test DB).
