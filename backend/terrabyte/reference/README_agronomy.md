# TerraByte agronomy reference data (Maharashtra)

Compiled 2026-11-24. These are the reference tables TerraByte uses to compute fertilizer doses, irrigation needs and crop calendars. Every number has a source URL and, where possible, a page or table reference. Where no source was found the value is `null`. Values derived by conversion are listed in `derived_fields`. Values a source states only by implication are marked "derived" in `notes`.

Crop keys are the same in all files: `cotton_bt, soybean, tur_pigeonpea, chickpea_gram, wheat, rice_paddy, jowar_sorghum, bajra_pearl_millet, maize, sugarcane, onion, tomato, potato, okra_bhendi, brinjal, chilli, groundnut, grapes, pomegranate, banana`.

## Files

| File | Contents |
|---|---|
| `soil_test_ratings.json` | Rating limits for N, P, K and OC. National 3-class limits come from the Methods Manual (2011). The SHC school manual (2023) adds S, micronutrient, pH and EC classes. Three Maharashtra 6-class tables: MPKV 2026, Methods Manual Table 3, and the PDKV-based table in Indian Farming 2020. Micronutrient critical limits. Fertilizer-dose adjustment rules. |
| `fertilizer_rdf_maharashtra.json` | 65 crop/season/condition entries: N, P2O5 and K2O, FYM, S and micronutrients, split schedule, printed values (`as_given`), source and status. Also includes the ICAR-IISS district-wise GFR table for Maharashtra's 34 districts (rice, wheat, sugarcane, maize). |
| `fertilizer_products.json` | Nutrient content (FCO 1985, Schedule I) for 22 products, plus the prices the government controls or reports (urea, DAP). |
| `fao56_crops.json` | For each crop: FAO-56 Kc ini/mid/end, maximum height, root depth, p, stage-length rows, Ky and salinity thresholds. Also the FAO-56 formulas (Kc climate adjustment, TAW/RAW/Ks, daily water balance) and the effective-rainfall method. |
| `crop_calendar_maharashtra.json` | 41 crop-seasons covering 139 region entries. Each has a sowing/transplanting window (MM-DD and original wording), duration, seed rate, spacing and sowing triggers. Regions are statewide plus districts in Vidarbha, Marathwada, Western Maharashtra, North Maharashtra and Konkan. |

## Main sources
- **MPKV Rahuri, Krishi Darshani 2026** (526-page official diary, Marathi): https://mpkv.ac.in/Uploads/Publication/20260725_120158_8d696de12b98586f94302f37cb1884b2.pdf. This is the backbone source for RDF, calendar and soil ratings. It uses a legacy non-Unicode font, so values were read from rendered page images. Citations give the PDF page number. Doses are often printed **per acre**; per-ha values are ×2.471.
- **MPKV crop research sheets**: `mpkv.ac.in/Uploads/Research/*.pdf`.
- **Dr. PDKV Akola research recommendations** 2017 and 2022–2025: `pdkv.ac.in/Circulars/Recom-<year>English.pdf`. These are used for Vidarbha.
- **Methods Manual: Soil Testing in India** (DAC, 2011) and the **SHC school soil manual** (2023). Both are hosted on soilhealth.dac.gov.in.
- **ICAR-IISS district-wise GFR** bulletin: a mirror copy at vikalp.kisansarathi.in. **ICAR-IIMR** kharif sorghum. **ICAR-NIASM** TF-89 (Pune).
- **FAO Irrigation & Drainage Paper 56**: Tables 11, 12, 22, 23, 24 (fao.org/4/x0490e).
- **Fertiliser (Control) Order 1985**: consolidated copy on odishaagrilicense.nic.in.
- **Price sources**: PMIndia (NBS Rabi 2026-27), a PIB backgrounder from Jan 2026, and press reports of official statements.
- **Calendar**: ICAR-CRIDA district contingency plans (2011) for 12 districts, ICAR-CICR, NHB.
- **Horticulture**: ICAR-DOGR/MANAGE onion GAP, ICAR-NRC Grapes, NRC Pomegranate, and NHB (secondary).

## Key rules
- **Fertilizer adjustment by soil test.** The recommended default for Maharashtra is MPKV 2026. Classify each nutrient separately:
  - very low: RDF +50%
  - low: +25%
  - medium or moderately high: RDF
  - high: −25%
  - very high: −50%

  The national SHC school manual uses low +25%, medium RDF, high −25%, very high none. The 2011 Methods Manual text says ±30–50%. Arthapedia's summary of the SHC guidelines (secondary) gives red +30%, green −30%.
- **ETc = Kc × ET0**, where ET0 is Open-Meteo `et0_fao_evapotranspiration`. Prefer the FAO-56 daily root-zone water balance (Eq. 85). The simple alternative for effective rain is the CROPWAT USDA-SCS monthly formula.

## Uncertainties and conflicts (see `notes` and `status` in each file)
1. **P basis.** National SHC P limits (<10 / 10–24.6 / >24.6 kg/ha) are elemental P. The 2011 manual's Maharashtra table is P2O5 (<16 … >80). MPKV 2026 does not say which (<7 … >35). Confirm with an MPKV soil-lab report before mapping lab values.
2. **Rainfed Bt cotton.** MPKV 2026 prints 50:26:26 with a column header of kg/acre but a total row of kg/ha. PDKV gives 90:45:45 kg/ha for Vidarbha. Flagged `conflict_flagged`.
3. **Wheat.** MPKV gives 120:60:40 for timely sowing. PDKV recommendations give 150:50:50 (2017) and 80:40:40 (2025). ICAR-IISS district GFR gives 50:30:20. Use the SAU value. The IISS values are soil-fertility-adjusted district GFRs.
4. **Kharif jowar.** No Maharashtra SAU table was found. The entry uses ICAR-IIMR national values (60:30:20 / 80:40:40) and a PDKV-derived 120:60:60.
5. **Sugarcane.** Pre-seasonal is 340:170:170 in the MPKV sheet and 136:68:68 kg/acre (≈336:168:168) in KD 2026. KD 2026 also gives a new 380:190:190 for medium-deep soil with 25 t/ha FYM. Planting-window end dates differ between sources.
6. **Horticulture.** For grapes, KD prints 266:355:266 "per acre", which looks like NRCG per-ha figures, so kg/ha is left null. Onion differs between MPKV and DOGR. Tomato in the KD per-ha equivalent is much higher than NHB. Banana P is 60 g/plant in KD vs 40 g/plant in older Jalgaon figures.
7. **Prices.** Urea is ₹242 per 45 kg bag (excluding neem coating and taxes), from a report of a Mar-2026 Lok Sabha reply; the original eparlib PDF was unreachable. DAP is ₹1,350 per 50 kg bag for Rabi 2026-27, from press reports of the 11-Nov-2026 Cabinet decision; the official PMIndia release confirms the NBS approval but not the price. Other P&K products are decontrolled (company MRP), so their prices are null. NBS per-kg rates for Rabi 2026-27 were seen only in news and are not included.
8. **FCO copy.** It appears to transpose 12-32-16 values (K2O printed 27.2), so nominal grades are used. The S content of 16-20-0-13 is left null.

## Gaps (values left null)
- **Fertilizer doses (RDF):**
  - VNMKV (Marathwada) and Dr. BSKKV (Konkan) packages were not reached.
  - No rainfed chilli dose; no explicit Maharashtra kharif-jowar RDF.
  - The ratoon cane split schedule is missing.
  - Gypsum nutrient content is missing.
  - STCR targeted-yield equations (KD 2026 p44–50) were not extracted systematically.
- **FAO-56:**
  - Pigeonpea, okra and pomegranate are not in FAO-56; they need Indian Kc data (AICRP-IWM, ICRISAT, NRCP).
  - Chilli uses bell pepper as an explicit proxy.
  - Chickpea has no FAO stage lengths.
- **Soil ratings:**
  - Rows 86–87 of Methods Manual pH Table 14 are missing from the scan.
  - The SHC portal's server-side rating thresholds were not retrieved; its GraphQL API was not queried.
  - The official SHC Operational Guidelines PDF (agricoop.nic.in) is unreachable.
- **Calendar:**
  - Durations are missing for tomato, okra, brinjal, chilli, banana and Bt cotton.
  - Paddy transplanting dates are missing.
  - CRIDA district windows date from 2011.
- **Not reachable from this machine:** iiss.icar.gov.in, agricoop.nic.in, fert.nic.in, eparlib.nic.in, and several ICAR NRC sites. Mirror copies were used where available.

## Possible next step
The SHC portal (soilhealth.dac.gov.in) computes crop-wise GFR/STCR recommendations per state and district through a public GraphQL endpoint (`getCropsWithGFR`, `getRecommendations`). With permission, querying it would give the official SHC Maharashtra GFR table and server-side rating thresholds directly.
