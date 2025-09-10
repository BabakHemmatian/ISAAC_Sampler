# ISAAC Sampler (Frontend)

This repository contains the frontend scripts for [this website](https://isaac.psychology.illinois.edu/). The website allows users to access and download data from the **Illinois Social Attitudes Aggregate Corpus (ISAAC)**, a comprehensive dataset of Reddit discourse from 2007 to 2023 about social groups defined by race, skin tone, weight, sexuality, age and ability.

If you use this repository in your work, please cite us as follows:

**Note:** Backend scripts can be found [here](https://github.com/BabakHemmatian/ISAAC_Sampler_Backend), while corpus development tools are located within [this repository](https://github.com/BabakHemmatian/Illinois_Social_Attitudes).

## Citation
If you use this repository in your work, please cite us as follows:

### APA Format
```
Hemmatian, B., & Dhamdhere, S.S. (2025). ISAAC Sampler (Frontend)[Computer software]. GitHub. [https://github.com/BabakHemmatian/ISAAC_Sampler_Backend/](https://github.com/BabakHemmatian/ISAAC_Sampler_Backend/)
```
### BibTex Format
```
@software{hemmatian2025isaac,
  author       = {Hemmatian, Babak and Dhamdhere, S. S.},
  title        = {ISAAC Sampler (Frontend)},
  year         = {2025},
  url          = {https://github.com/BabakHemmatian/ISAAC_Sampler_Backend},
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
