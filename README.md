# bcr-meal-plan

A portion calculator for batch-prepping [Big Country Raw](https://bigcountryraw.ca/) Pures and Fare Game for a cat.

- **Plan by thawed packages:** enter the packs you're thawing (and, optionally, which container types to make), and get containers with gram amounts that use them up, rotating proteins.
- **Plan by recipe:** define container recipes (proteins + proportions), and get grams per container and how much to thaw.
- Supplement doses per container (Fortify/FortifyRX and oils), with oil calories counted toward the daily target.

## Develop

```sh
npm install
npm run dev        # local dev server with live reload
npm test           # unit tests for all the math
npm run build && npm run preview   # production build served at /bcr-meal-plan/, same as GitHub Pages
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages.
One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

## Product data

`src/data/products.json` is generated from bigcountryraw.ca and committed. Re-run when BCR changes products:

```sh
npm run fetch-data
```

Supplement data (fat per dose, label doses) lives in `src/lib/supplements.ts`.

## Sources

- Calorie estimate: NRC 2006 formulas as used in WSAVA's [Calorie Needs for Healthy Adult Cats](https://wsava.org/wp-content/uploads/2020/07/Calorie-Needs-for-Healthy-Adult-Cats-updated-July-2020.pdf).
- Body condition (each point above 5/9 ≈ 10% overweight; calories from ideal weight) and treats (≤10% of daily calories): [2021 AAHA Nutrition and Weight Management Guidelines](https://www.canadianveterinarians.net/media/iuqg3rfp/cline-2021-aaha-nutrition-and-weight-management-guidelines-for-dogs-and-cats-jaaha-2021.pdf), JAAHA 57:4.
- Oil calories: fat × 8.5 kcal/g for cats (9 for dogs), [FEDIAF Nutritional Guidelines 2025](https://europeanpetfood.org/wp-content/uploads/2025/09/FEDIAF-Nutritional-Guidelines_2025.pdf) §7.2.2.2(b).

Not veterinary advice.
