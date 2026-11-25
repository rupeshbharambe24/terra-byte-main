# Legacy Flask prototype (reference only)

This folder holds the original 2025 Flask backend, its trained models (`ai_models/`) and the Pune
APMC price histories (`datasets/`, 2021-01-01 to 2025-05-27). It is **not run** by the new platform
and is kept only as reference material for the Phase 3 rebuild of disease detection, fertilizer
recommendation and price forecasting.

Known problems (from the 2026-11 audit) — do not reuse as-is:

- Disease CNN: class labels in the wrong order, resizes to the wrong input size, no rejection of
  non-leaf images, canned treatment text.
- Fertilizer model: trained on a 99-row toy dataset, features passed in the wrong order, no dose.
- Price LSTMs: label/position bug, no better than "repeat yesterday's price", can only forecast
  inside the historical data window.
- Flask app: no auth, trusts client prices, `debug=True`, Firebase dependency.

The new backend lives in `backend/terrabyte/`.
