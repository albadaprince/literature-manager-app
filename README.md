Project Documentation: Collaborative Literature Review Manager
This document outlines the development process, architecture, and deployment of the Collaborative Literature Review Manager, a tool designed for the Kajima Project 2025-2027.

**Live Application is Protected.


Project Created
June 2025

Acknowledgements
This project was developed through a collaborative process between Alba assisted heavily by Google's Gemini AI. Gemini provided significant guidance, generated the core code, and offered step-by-step instructions for troubleshooting, securing, and deploying the application.

1. Project Goal
The initial objective was to create an interactive tool to help a research assistant collect, summarize, and manage academic literature. The key requirement was to facilitate discussion with a professor by allowing for the rating and selection of benchmark papers for a research project.

2. Tools and Technologies Used
  Frontend Framework: React
  Styling: Tailwind CSS
  Build Tool: Vite
  Backend Database: Google Firestore
  Authentication: Firebase Authentication (Anonymous)
  Code Hosting: GitHub
  Deployment & Hosting: Netlify

3. Initial Prototype: Local State
The first version of the application was built as a standalone React component.
Functionality: Users could add, edit, delete, and rate literature entries.
Data Storage: Data was stored locally within the browser's memory (React state).
Limitation: All data was lost upon refreshing or closing the browser tab. It was a single-user experience with no capability for collaboration or data persistence.

4. V2: Introducing Persistence & Collaboration with Firestore
To overcome the limitations of the prototype, the application was upgraded to a real-time, collaborative tool.
Technology: Google's Firestore was integrated as the backend database.
Functionality:
Persistent Storage: All literature data is now stored securely in a cloud database, ensuring no data is lost.
Real-Time Collaboration: Any change made by one user (adding, editing, updating status) is instantly reflected on the screens of all other users currently viewing the application.
Authentication: To enable database access, a simple Anonymous Authentication method was implemented via Firebase, allowing users to connect without needing to create an account.

5. V3: Live Deployment
To make the application accessible to the entire research team, it was deployed to the public web.
Hosting Provider: Netlify was chosen for its generous free tier and seamless integration with GitHub.
Database: A dedicated Firebase project was created to provide a permanent, team-owned database.
Deployment Workflow:
A local project structure was created with all necessary files (package.json, index.html, vite.config.js, etc.).
The project code was uploaded to a public GitHub repository.
The GitHub repository was connected to Netlify.
Netlify was configured with the correct build settings (npm run build) and publish directory (dist).
Netlify now automatically deploys any new changes that are pushed to the GitHub repository's main branch.

6. V4: Security Enhancements
The final and most critical step was to secure the application, as the GitHub repository was public.
Problem: Storing secret keys (like Firebase apiKey and the app password) directly in the code is a major security risk.
Solution: Netlify Environment Variables were used.
All secret keys and passwords were removed from the App.jsx source code.
The code was modified to read these values from import.meta.env, a secure object provided by the build tool (Vite).
The secret keys and the password were added as Environment Variables in the Netlify site settings.
Result: The application is now fully secure. The source code on GitHub contains no sensitive information, and the keys are only injected by Netlify during the secure build process.
Final Application Features
Password Protected: The entire site is gated by a simple, shared password.
Fully Collaborative: Real-time data synchronization between all team members.
Persistent Data: All data is safely stored in a dedicated Firestore database.
Dynamic UI: Users can sort the literature table by any column and filter by status.
Automated Deployment: Easy to update by simply pushing changes to the GitHub repository.
