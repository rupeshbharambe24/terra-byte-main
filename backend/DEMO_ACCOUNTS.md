# Demo accounts

Created by `uv run terrabyte-seed` (run from `backend/`). These are **test accounts**
**only**; they exist so every role can be tried locally. Never reuse these credentials
anywhere real.

All accounts use the password **`Demo@12345`**. Log in with the mobile number or the email.

| Role | Name | Mobile | Email | Status | District |
|---|---|---|---|---|---|
| admin | Demo Admin | 9000000001 | admin@demo.terrabyte.local | approved | Pune |
| farmer | Ramesh Shinde (demo) | 9000000011 | farmer1@demo.terrabyte.local | approved | Pune |
| farmer | Sunita Jadhav (demo) | 9000000012 | farmer2@demo.terrabyte.local | approved | Nashik |
| vendor | Shivneri Krishi Kendra (demo) | 9000000021 | vendor1@demo.terrabyte.local | approved | Pune |
| vendor | Godavari Agro Inputs (demo) | 9000000022 | vendor2@demo.terrabyte.local | approved | Nashik |
| vendor | Pending Agro Traders (demo) | 9000000023 | vendor3@demo.terrabyte.local | pending | Ahilyanagar |
| hardware_vendor | Junnar Tractor Hire (demo) | 9000000031 | hardware1@demo.terrabyte.local | approved | Pune |
| hardware_vendor | Niphad Farm Machinery (demo) | 9000000032 | hardware2@demo.terrabyte.local | approved | Nashik |
| expert | Dr. Anjali Patil (demo expert) | 9000000041 | expert@demo.terrabyte.local | approved | Pune |

- The pending vendor (`9000000023`) cannot log in until an admin approves it on
  *Admin → Vendor approvals*; use it to try the approval flow.
- `uv run terrabyte-seed --reset` **wipes the development database** and recreates it
  with these accounts, the demo walkthrough and the bundled KVK directory.
- Starter products and equipment belong to the demo vendors. They are labelled as demo
  listings; prices are vendor-entered listing prices, not market data.
- The walkthrough (created once): orders in every state (delivered, shipped, placed,
  accepted, rejected), an accepted and a requested equipment booking, one completed
  rental, a consultation thread, an open question, an expert article, forum posts and
  one open report. All of it is authored by the demo users and marked "(demo)".
- The 50 Maharashtra KVKs (official sources, verified 2026-11-24) are imported from
  `terrabyte/reference/kvk_maharashtra.json`; update them with
  `uv run terrabyte-import-kvk <file.json>`.
- Create a real admin with `uv run terrabyte-admin create-admin` (admins cannot
  self-register).
