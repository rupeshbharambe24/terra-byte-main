# TerraByte reference data

Official reference data for TerraByte, the farmer platform. The focus is Maharashtra; national MSP and central schemes apply everywhere. Everything here was collected and checked on **2026-11-24**. Each record cites its source. Where a fact could not be confirmed from an official source, the field is left `null` or the record is flagged. Nothing was guessed.

## Files

| File | Contents | Records |
|---|---|---|
| `msp.json` | Minimum Support Prices for Kharif 2025-26 and 2026-27, Rabi 2026-27 and 2027-28, Copra 2026 and Raw Jute 2026-27. Also sugarcane FRP for sugar seasons 2025-26 and 2026-27. | 49 MSP rows + 2 FRP rows |
| `schemes.json` | Central and Maharashtra farmer schemes: benefit, eligibility, exclusions, documents, how to apply, official URL, status, sources. | 26 (16 central, 10 Maharashtra) |
| `kvk_maharashtra.json` | Krishi Vigyan Kendras in Maharashtra: host, address, contacts, coordinates where available. | 50 |

All JSON parses with `/Users/rbih/.unienv/bin/ue-py -c "import json;json.load(open('msp.json'))"`.

### msp.json
- `msp[]`: crop, `crop_hi`, `crop_mr`, season, marketing_year, `msp_inr_per_quintal`, `increase_over_previous`, previous MSP, cost of production (A2+FL) and margin %, `source_url` (PIB release) and `announced_on`. The check `msp - previous = increase` passes for every row.
- `sugarcane_frp[]`: FRP Rs 365/qtl for 2026-27 (10.25% basic recovery, ±Rs 3.56 per 0.1% recovery, floor Rs 338.3 where recovery is below 9.5%) and Rs 355/qtl for 2025-26.
- `notes[]`: crops without MSP (most vegetables, fruits, spices, flowers), and why an MSP does not guarantee that the crop will be procured.
- Headline figures: paddy (common) **Rs 2,441** (KMS 2026-27, +72); wheat **Rs 2,610** (RMS 2027-28, +25); tur Rs 8,450; soybean Rs 5,708; cotton (medium staple) Rs 8,267; gram Rs 5,958.

### schemes.json
Status values: `active`, `changed` (operating, but terms changed or an announced change is not confirmed), `closed`, `unverified` (do not show to farmers as available). Read `status_note` before displaying any record.

Key facts:
- PM-KISAN pays Rs 6,000 a year in 3 instalments of Rs 2,000. The 24th instalment was released on 30 Oct 2026. The scheme is extended to 2030-31.
- Namo Shetkari pays a further Rs 6,000 a year from Maharashtra, so the combined total is Rs 12,000.
- KCC/MISS: 7% interest, effectively 4% with prompt repayment. The **confirmed subvention limit is Rs 3 lakh** (RBI circular for FY 2025-26). The Rs 5 lakh limit was announced in Budget 2025-26, but no RBI or Cabinet notice making it operational was found.
- Crop loan waiver 2026 (Punyashlok Ahilyadevi Holkar Shetkari Karjmukti Yojana): up to Rs 2 lakh. Lists of eligible accounts are being published for Aadhaar authentication.

## Sources used
- **PIB** (pib.gov.in): all MSP, FRP, copra and jute releases; PM-KISAN, PMFBY, KCC, SMAM, PKVY, NMNF, PMDDKY and Pulses Mission releases and backgrounders. These were fetched directly and the tables were transcribed from the release text.
- **RBI**: MISS circular RBI/2025-26/193 (13 Jan 2026).
- **Portals**: pmkisan.gov.in, nsmny.mahait.org, mahadbt.maharashtra.gov.in (scheme pages), mahadiscom.in (solar pump), energy.maharashtra.gov.in (Baliraja), mahapocra.gov.in (NDKSP 2.0), sahakarayukta.maharashtra.gov.in (loan-waiver press note), mahasamvad.in (DGIPR), agriinfra.dac.gov.in, icar.org.in.
- Non-official sources (news sites, myScheme summaries) are used only where no official source was available. Every such use is labelled in `status_note`.

## Gaps and uncertainties
1. **KCC Rs 5 lakh limit.** It is announced but not confirmed as operational (see above). No MISS circular for FY 2026-27 was found.
2. **PM-KUSUM: status `unverified`.** The last official extension ran to 31 Mar 2026. Secondary reports say new applications closed and "PM-KUSUM 2.0" is awaiting Cabinet approval. The MNRE notice could not be retrieved because the pages render with JavaScript. As a result, confirm that new applications are open for Magel Tyala Saur Krushi Pump before telling farmers they can apply.
3. **Namo Shetkari.** The official portal shows GRs for instalments 1 to 7 only. Press reports (Nov 2026) say several instalments are pending. A rise to Rs 9,000 has been announced politically, but no GR was found.
4. **Loan waiver amendments.** In the legislature in July 2026 the CM announced that the OTS condition and the Rs 50,000 cap were dropped. The amending GR was not retrieved. The 28 Jul 2026 press note still describes the original OTS terms.
5. **Bhausaheb Fundkar orchard scheme.** It is listed on MahaDBT, but the benefit amounts could not be read from an official page. Amounts are deliberately omitted.
6. **Farm pond (Magel Tyala Shettale).** The Rs 75,000 cap comes from myScheme. One other source says Rs 50,000. Verify against the GR.
7. **Krishi Samruddhi Yojana: status `unverified`.** It is known only from press reports, and those conflict.
8. **PMDDKY Maharashtra districts.** The 9 districts are listed from press reports. The official list was not located.
9. **Soil Health Card cycle.** PIB says 2 years in some places and 3 years in others.
10. **PMFBY.** PIB confirms operation in Kharif 2026. The Cabinet approval for the period after 2025-26 was not located. Maharashtra's "Re 1" premium ended in 2025.
11. **Not yet announced as of 2026-11-24:** Kharif 2027-28 MSP (usually May-June) and Copra 2027 MSP (usually December).
12. **Translations.** Hindi and Marathi crop names are standard terms. Central scheme names in Marathi and Maharashtra scheme names in Hindi are descriptive renderings. A native speaker should review them before display.
13. **KVK data:** see the KVK section below.

## kvk_maharashtra.json: sources and caveats
- **Count.** It holds 50 KVKs, matching ICAR's count for Maharashtra. ICAR's own list (https://icar.org.in/en/node/15040) has only 49. The 50th is **KVK Thane at Nagaon, Murbad (host MAFSU)**. Four sources confirm it: the ATARI Pune contact list, the ATARI land-holding table, MAFSU minutes, and the KVK's own site. Its sanction year was not found.
- **Sources.** kvk.icar.gov.in and ataripune.icar.gov.in returned NXDOMAIN on 2026-11-24, checked through public DNS. ATARI Pune's April 2023 contact list was therefore read from an Internet Archive snapshot. Its phones and emails may be up to about 3 years old. Current pages from MPKV, PDKV, VNMKV, DBSKKV, MAFSU and the KVKs' own sites take priority. Each record's `notes` says which source was used.
- **Filled fields (of 50):** phone 45, email 49, website 26, pincode 48, coordinates 34. Personal mobile numbers of named staff were deliberately left out.
- **Coordinates are mostly NOT the KVK campus.** Only 2 are published by the KVK and 1 is an OpenStreetMap-mapped KVK plot. The other 31 are the centre point of the village, town or city in the address, geocoded with Nominatim. Always read `coords_precision`. Do not use these points for turn-by-turn navigation.
- **Relocations.** ICAR still lists Raigad at Karjat and Ratnagiri at Shirgaon. The host universities place them at Roha and Lanja.
- **Corrections.** Known errors in the ATARI list were not used: Buldhana-II email, pincodes for Durgapur, Beed-II and Nanded-I. For Pal and Kalwade the official sources disagree, and the pincode was chosen using India Post data via a third-party API. The Jalgaon-II pincode and the Raigad phone are low-confidence.
- **Old district names.** District names follow current usage (Chhatrapati Sambhajinagar, Dharashiv, Ahilyanagar). The former name is kept in `district_former_name`.
