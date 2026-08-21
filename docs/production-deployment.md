# Production deployment

Sandcastle uses two Vercel projects from this repository.

| Project | Root directory | Production domain | Output |
| --- | --- | --- | --- |
| Marketing | `apps/marketing` | `sandcastle.app` | `dist` |
| Product | `apps/web` | `app.sandcastle.app` | `dist` |

Import the repository once for each project and select the matching root directory. Keep the skip deployment option enabled. The application `vercel.json` files define the framework, build command, output directory, and dependency aware ignored build step.

Set `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` on the product project for each Vercel environment. The product build keeps Convex as its backend. The marketing build uses Astro static output and has no Convex dependency.

Assign `sandcastle.app` to the marketing project and `app.sandcastle.app` to the product project in Vercel. The production marketing environment sends all Brand Brief actions directly to `https://app.sandcastle.app/new` without query parameters.
