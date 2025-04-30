# 🧑‍💼 HRMS - Human Resource Management System

This project is a custom-built Human Resource Management System (HRMS) with a full frontend and backend architecture. It includes features like employee management, attendance tracking, leave handling, and more — all built using modern web technologies.


## 📁 Project Structure

HRMS/ ├── hrms-backend/ # Node.js backend (Express, MongoDB) ├── hrms-frontend/ # React.js frontend ├── push.bat # Automation script to push code to GitHub ├── pull.bat # Automation script to pull latest code from GitHub └── README.md # Project documentation

## 🚀 Features

- 🔐 Authentication & Role Management (Admin, CEO, HOD, Employee)
- 📅 Leave and Attendance Management
- 🧾 PDF Reports Generation
- 🔔 Notifications System
- 📊 Dashboard Analytics
- 🌐 RESTful APIs with token-based auth


## 🧠 Technologies Used

Frontend:
- React.js
- CSS & Tailwind
- Axios

Backend:
- Node.js + Express
- MongoDB (Mongoose)
- JWT Authentication
- PDFKit (for reports)


## ⚙️ Setup Instructions

1. Clone the repo:

   git clone https://github.com/Ankit811/hrms.git
   cd hrms

Install backend dependencies:

cd hrms-backend
npm install

Install frontend dependencies:

cd ../hrms-frontend
npm install

Run backend:

cd ../hrms-backend
npm start

Run frontend:

cd ../hrms-frontend
npm start

💻 Git Automation Scripts
This project includes two helpful .bat files for simplifying Git operations on Windows:

🔄 push.bat — Auto Push to GitHub
Stages, commits, and pushes your code changes in one go.

Usage:

Double-click push.bat
Enter a commit message when prompted.

Your code will be pushed to the main branch on GitHub.

⬇️ pull.bat — Pull Latest Code
Fetches the latest changes from the GitHub repo.

Usage:

Double-click pull.bat
Run this before working to avoid merge conflicts.

📝 Notes
Git must be installed and configured before using the automation scripts.

Customize the .bat scripts if you're using a branch other than main.

Always pull before push when collaborating across devices or team members.

👨‍💻 Author
Ankit Kumar
8th Semester, B.Tech CSE
Shaheed Bhagat Singh State University, Ferozepur
GitHub: Ankit811