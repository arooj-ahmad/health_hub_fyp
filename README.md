<div align="center">

# 🏥 Smart Nutrition System

### Modern Healthcare Management Platform

A comprehensive healthcare management system built with React, Firebase, and AI-powered features for streamlined patient care and medical practice management.

</div>

---

## ✨ Features

- 🔐 **Secure Authentication** - Firebase-powered user authentication and authorization
- 👥 **Role-Based Access** - Separate dashboards for patients, doctors, and administrators
- 📊 **Real-Time Data** - Live updates using Firebase Firestore
- 🤖 **AI Integration** - Google Generative AI for intelligent health insights
- 📱 **Responsive Design** - Beautiful UI with Radix UI components and Tailwind CSS
- 📈 **Data Visualization** - Interactive charts and analytics with Recharts
- 🎨 **Modern UI/UX** - Sleek interface with dark mode support
- 🔔 **Notifications** - Real-time alerts and toast notifications

## 🚀 Tech Stack

**Frontend:**
- React 18. 3.1
- Vite 5.4.19
- React Router DOM 6.30.1
- TailwindCSS 3.4.17
- Radix UI Components

**Backend & Services:**
- Firebase 10.13.0 (Authentication, Firestore, Hosting)
- Google Generative AI 0.21.0

**UI Libraries:**
- Lucide React (Icons)
- Recharts (Data Visualization)
- Shadcn/ui Components
- React Hook Form + Zod (Form Validation)

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or bun
- Firebase account
- Google Generative AI API key

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/abdulqadir263/arooj_latest_fyp.git
   cd arooj_latest_fyp
   ```

2.  **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Firebase and API credentials in `. env`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Set up Firebase**
   
   Follow the setup guide in `FIRESTORE_SETUP.md` for detailed instructions on configuring Firestore rules and indexes.

## 🏃‍♂️ Running the Application

**Development Mode:**
```bash
npm run dev
```

**Build for Production:**
```bash
npm run build
```

**Preview Production Build:**
```bash
npm run preview
```

**Deploy to Firebase:**
```bash
firebase deploy
```

## 📁 Project Structure

```
arooj_latest_fyp/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Application pages/routes
│   ├── context/        # React Context providers
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API and service integrations
│   ├── config/         # Configuration files
│   └── lib/            # Utility functions
├── public/             # Static assets
├── firestore. rules     # Firestore security rules
├── firebase.json       # Firebase configuration
└── vite.config.js      # Vite configuration
```

## 🔒 Security

- Firestore security rules implemented (see `firestore.rules`)
- Role-based access control
- Environment variables for sensitive data
- Authentication required for protected routes

## 📖 Documentation

Additional documentation available:
- `FIRESTORE_SETUP.md` - Firestore configuration guide
- `FIRESTORE_RULES.md` - Security rules documentation
- `DEPLOY_COMMANDS.md` - Deployment instructions
- `FIXES_APPLIED.md` - Bug fixes and improvements log

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  Feel free to check the issues page. 

## 👨‍💻 Author

**Arooj Ahmad**
- GitHub: [@arooj-ahmad](https://github.com/arooj-ahmad)

## 📝 License

This project is part of a Final Year Project (FYP). 

---

<div align="center">

**Built with ❤️ for better healthcare management**

</div>
