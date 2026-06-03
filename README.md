# ISAAC Sampler (Frontend)

This repository contains the frontend scripts for [this website](https://isaac.psychology.illinois.edu/). The website allows users to access and download data from the **Illinois Social Attitudes Aggregate Corpus (ISAAC)**, a comprehensive dataset of Reddit discourse from 2007 to 2023 about social groups defined by race, skin tone, weight, sexuality, age and ability.

## Terms of Use

By using this tool, the associated data, or these repositories, you agree to the [Terms of Use](https://github.com/BabakHemmatian/Illinois_Social_Attitudes/blob/main/Terms_of_Use.md).

If you use this repository in your work, please cite us as follows:

**Note:** Backend scripts can be found [here](https://github.com/BabakHemmatian/ISAAC_Sampler_Backend), while corpus development tools are located within [this repository](https://github.com/BabakHemmatian/Illinois_Social_Attitudes).

## Citation
If you use this repository in your work, please cite us as follows:

### APA Format
```
Hemmatian, B., & Dhamdhere, S.S. (2025). ISAAC Sampler (Frontend)[Computer software]. GitHub. https://github.com/BabakHemmatian/ISAAC_Sampler/
```
### BibTex Format
```
@software{hemmatian2025isaac,
  author       = {Hemmatian, Babak and Dhamdhere, S. S.},
  title        = {ISAAC Sampler (Frontend)},
  year         = {2025},
  url          = {https://github.com/BabakHemmatian/ISAAC_Sampler},
  publisher    = {GitHub},
  note         = {Computer software}
}
```

## App Features

 - Authentication (via Supabase)
 - Date Range selection (Month-Year selection)
 - Social Group Selection (e.g., Sexuality)
 - Download of the complete dataset or a specified random subset
 - Sampling Status and ETA Updates shown during document retrieval
 - Stop Button to cancel long-running requests
 - Download ZIP output
 - Issue Reporting Form with email triggers

## Setup Instructions

1. Clone the repository: ```git clone https://github.com/ssd391/isaac-reddit-sampler-frontend.git```
2. Navigate to the folder: ```cd isaac-reddit-sampler-frontend```
3. Install dependencies: ```npm install```
4. Install additional packages: ```npm install @mui/material @mui/icons-material @mui/x-date-pickers @emotion/react @emotion/styled framer-motion axios```
5. Set up your supabaseClient.js with your own Supabase URL and Anon Key.
6. Run the application: ```npm run start```

## Deployment

You can deploy the frontend on Vercel. Just make sure the API URL (currently http://127.0.0.1:8000) is updated to point to your deployed FastAPI backend.

### Supabase Auth Redirect Hardening

To prevent signup/reset emails from sending users to localhost, configure both app env and Supabase dashboard:

1. Set frontend env var in production build:
   - `REACT_APP_PUBLIC_ORIGIN=https://isaac.psychology.illinois.edu`
2. In Supabase Dashboard -> **Authentication** -> **URL Configuration**:
   - **Site URL**: `https://isaac.psychology.illinois.edu`
   - **Redirect URLs**: include
     - `https://isaac.psychology.illinois.edu/`
     - `https://isaac.psychology.illinois.edu/update-password`
3. Remove stale localhost callback URLs from production project settings if they are no longer needed.

The frontend passes explicit redirect URLs in `src/Auth.js` (`emailRedirectTo` for signup and `redirectTo` for reset), and this dashboard configuration ensures email links remain correct in production.
