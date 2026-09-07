# ISAAC Sampler (Frontend)

This repository contains the frontend scripts for [this website](https://isaac.psychology.illinois.edu/). The website allows users to access and download data from the **Illinois Social Attitudes Aggregate Corpus (ISAAC)**, a comprehensive dataset of Reddit discourse from 2007 to 2023 about social groups defined by race, skin tone, weight, sexuality, age and ability.

## Data Use Agreement

By using this tool, the associated data, or these repositories, you agree to the [Data Use Agreement](https://github.com/BabakHemmatian/Illinois_Social_Attitudes/blob/main/Data_Use_Agreement.md).

**Note:** Backend scripts can be found [here](https://github.com/BabakHemmatian/ISAAC_Sampler_Backend), while corpus development tools are located within [this repository](https://github.com/BabakHemmatian/Illinois_Social_Attitudes).

## Citation
If you use this repository in your work, please cite us as follows:

### APA Format
```
Hemmatian, B., Dhamdhere, S. S., & Mahajan, V. (2026). ISAAC Sampler (Frontend) [Computer software]. GitHub. https://github.com/BabakHemmatian/ISAAC_Sampler
```
### BibLaTex Format
```
@software{hemmatian2026isaacfrontend,
  author       = {Hemmatian, Babak and Dhamdhere, S. S. and Mahajan, V.},
  title        = {{ISAAC} Sampler (Frontend)},
  year         = {2026},
  organization = {GitHub},
  url          = {https://github.com/BabakHemmatian/ISAAC_Sampler},
  urldate      = {2026-09-07},
  version      = {1.0}
}
```

## App Features

 - Authentication (via Firebase Auth)
 - Date Range selection (Month-Year selection)
 - Social Group Selection (e.g., Sexuality)
 - Reproducible random samples drawn equally across the selected months (with an optional seed), downloaded as a single CSV
 - Direct links to whole monthly files, served from the project's public Globus collection on NCSA Taiga (not streamed through the web server)
 - Sampling Status and ETA Updates shown during document retrieval
 - Stop Button to cancel long-running requests
 - Issue Reporting Form with email triggers

## Setup Instructions

1. Clone the repository: `git clone https://github.com/BabakHemmatian/ISAAC_Sampler.git`
2. Navigate to the folder: `cd ISAAC_Sampler`
3. Install dependencies: `npm install`
4. Configure the environment:
   - `cp .env.local.example .env.local`, then fill in the `REACT_APP_FIREBASE_*` values from the
     Firebase console (Project settings → General → Your apps → SDK setup and configuration).
   - Set `REACT_APP_PUBLIC_ORIGIN` to the origin the app is served from. It is used to build
     password-reset and email-verification links, so it must match the deployed site.
   - These values are inlined into the bundle at **build** time and are not secret, but they are
     environment-specific. Rebuild after changing them.
5. Point the frontend at a backend. `npm run start` calls `http://localhost:8000` by default, so run
   the [backend](https://github.com/BabakHemmatian/ISAAC_Sampler_Backend) there. A production build
   instead issues **same-origin** requests, relying on the web server to proxy `/sample`, `/progress`
   and the other API routes. Set `REACT_APP_API_URL` to override either default.
6. Run the application: `npm run start`

## Deployment

The build is a static Create React App bundle, so any static host will serve it. Production ISAAC
serves it from nginx on a VM at NCSA rather than from a hosting platform.

First run the lint gate. Create React App turns warnings into errors when `CI` is set, which most
build servers do by default, so this is what catches a warning before a build server does:

```bash
CI=true npm run build
```

Then build the artifact and sync it into the web root. The deploy build sets `CI=` so that a stray
warning cannot block a release:

```bash
CI= npm run build
sudo cp -a /var/www/isaac-sampler /var/www/isaac-sampler.bak.$(date +%F-%H%M%S)
sudo rsync -a --delete --exclude '/direct-download' build/ /var/www/isaac-sampler/
sudo chown -R www-data:www-data /var/www/isaac-sampler
```

Notes:

- **`--exclude '/direct-download'` is required.** `/var/www/isaac-sampler/direct-download/` holds
  `manifest.json` and `files.csv`, which are generated server-side and are not part of this repo.
  `--delete` without the exclude destroys them.
- `public/pages/{query,direct-download}.html` are HTML partials fetched at runtime by the SPA. They
  ship with the build; edit them there rather than in the bundle.

### Firebase Auth configuration

To keep verification and reset emails pointing at the real site rather than at localhost:

1. Set `REACT_APP_PUBLIC_ORIGIN` to the canonical origin in the production build (see Setup above).
   `src/Auth.js` passes it as `actionCodeSettings` on `sendEmailVerification` and
   `sendPasswordResetEmail`.
2. In the Firebase console → **Authentication** → **Settings** → **Authorized domains**, list every
   origin the app is served from. Remove any that are no longer in use.
3. Configure custom SMTP under **Authentication** → **Templates** so mail comes from a project
   address instead of Firebase's default sender.

Note that email links currently use Firebase's default action handler. The in-repo handler at
`src/AuthAction.js` (route `/auth/action`) is dormant until a custom action URL is set on the project.

**Deploying anywhere public creates a second live copy of the app.** The two pages under
`public/pages/` are access-controlled by nginx in production; a host without an equivalent rule will
serve them to anyone. Prefer keeping deployments to the one origin unless you replicate the gate.
