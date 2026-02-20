## Model Mapping Query Learnings (2026-02-20)

- `vehicles.manufacturer` is empty for all current rows (366/366), so manufacturer-aware mapping cannot match yet.
- Top unmapped models are still useful for seed prioritization when grouped by `model_name` frequency.
- K-Car live API (`/bc/search/group/mnuftr`, `/bc/search/group/modelGrp`) provides authoritative current model group codes.
- Existing local manufacturer code seeds appear partially outdated versus live K-Car API for several brands.
- For now, infer manufacturer from `model_name` patterns to bootstrap `market_model_mappings`, then backfill manufacturer data upstream.
