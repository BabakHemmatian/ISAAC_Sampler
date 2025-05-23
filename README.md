ISAAC Reddit Sampler (Frontend)

Features
 - Authentication (via Supabase)
 - Date Range Picker (Month-Year selection)
 - Social Group Selection (e.g., Race, Sexuality)
 - Optional Number of Documents (Sample all if left empty)
 - Sampling Status Updates shown during document retrieval
 - Stop Button to cancel long-running requests
 - Download ZIP containing sampled data
 - Issue Reporting Form



Setup Instructions
Clone the repository

git clone https://github.com/ssd391/isaac-reddit-sampler-frontend.git
cd isaac-reddit-sampler-frontend

Install dependencies
npm install

Install additional packages
npm install @mui/material @mui/icons-material @mui/x-date-pickers @emotion/react @emotion/styled framer-motion axios

Set up your supabaseClient.js with your own Supabase URL and Anon Key.

Run the application
npm run start

Deployment
You can deploy the frontend on Vercel.

Make sure the API URL (currently http://127.0.0.1:8000) is updated to point to your deployed FastAPI backend.