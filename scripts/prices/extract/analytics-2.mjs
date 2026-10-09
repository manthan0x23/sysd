import { write, plan } from "./lib.mjs";

write("fivetran", [], { notes: "Only a 'median monthly list price $22.06' sample and per-model-run rates ($0.002-$0.01) were captured; Fivetran bills per monthly active rows (MAR) with tiers not in the scrape." });
write("airbyte", [plan(["etl:airbyte:cloud", "cdc:airbyte:cdc"], "Standard", 195, "month", { note: "'$195/mo'; $189/mo also shown. Plus/Pro tiers not captured with prices. Volume-based." })]);
write("dbt-labs", [
  plan("etl:dbt-labs:dbt-cloud", "Starter", 100, "seat-month", { note: "One developer seat." }),
  plan("etl:dbt-labs:dbt-cloud", "dbt State (pay as you go)", null, "month", { rates: [["per DATT", 0.094, "other"]] }),
]);
write("matillion", [], { notes: "Scrape returned no prices (pricing is credit-based by quote)." });
write("estuary", [plan(["etl:estuary:flow", "cdc:estuary:flow"], "Cloud", null, "gb", { rates: [["data moved", 0.5, "gb"], ["per connector, monthly", 100, "other"]], note: "$0.50 per GB + $100 per connector (per month); 30-day free trial." })]);
write("dremio", [], { notes: "Only a $400 free-trial credit line captured; no list prices." });
write("tableau", [
  plan("bi:tableau:cloud", "Tableau Standard (from)", 15, "user-month", { note: "'Starting at $15 USD/user/month, billed annually'. Creator/Explorer/Viewer role prices not captured." }),
  plan("bi:tableau:cloud", "Tableau Enterprise (from)", 35, "user-month", { note: "'Starting at $35 USD/user/month, billed annually'." }),
]);
write("metabase", [
  plan("bi:metabase:cloud", "Starter", 100, "month", { spec: { includedUsers: 5 }, rates: [["extra user", 6, "user-month"]], note: "$90/month shown as the annual-billing price ($1,080/yr); extra users $6/user/month or $65/user/year." }),
  plan("bi:metabase:cloud", "Pro", 575, "month", { note: "$517.50/month shown as annual billing; per-user add-on not captured." }),
]);
