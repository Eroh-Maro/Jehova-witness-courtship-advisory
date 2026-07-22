# JW Courtship Advisory Platform API

A secure RESTful backend powering the JW Courtship Advisory Platform. The API manages member profiles, authentication, administrative workflows, contact enquiries, notifications, email delivery, reporting, and media uploads.

## Features

- JWT Authentication with Access & Refresh Tokens
- Role-Based Access Control (Super Admin, Admin, Coordinator)
- Member Profile Management
- Profile Approval, Suspension, Reactivation & Deletion
- Country-Based Admin Assignment
- Manual Profile Assignment Workflow
- Contact Enquiry Management
- Email Notifications
- Image Uploads with Cloudinary
- Activity & Audit Logging
- Dashboard Analytics
- Notification System
- CSV, Excel and PDF Report Generation
- Secure Password Reset & Email Verification
- Rate Limiting & Security Headers

## Tech Stack

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT
- Bcrypt
- Nodemailer
- Cloudinary
- Multer
- Helmet
- Express Rate Limit
- PDFKit
- ExcelJS
- JSON2CSV

## Project Structure

```
src/
├── config/
├── controllers/
├── middleware/
├── models/
├── queues/
├── routes/
├── services/
├── templates/
├── utils/
├── validators/
└── app.js
```

## Installation

Clone the repository

```bash
git clone <repository-url>
cd backend
```

Install dependencies

```bash
npm install
```

Create an environment file

```env
PORT=
MONGODB_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

FRONTEND_URL=
```

Run the development server

```bash
npm run dev
```

Run production

```bash
npm start
```

## Authentication

Protected routes require a valid JWT access token.

Authorization is enforced using role-based middleware.

Supported roles include:

- Super Admin
- Admin
- Coordinator

## Core Modules

### Authentication

- Login
- Logout
- Refresh Token
- Forgot Password
- Reset Password
- Admin Invitations

### Member Profiles

- Create Profile
- Update Profile
- Approve
- Suspend
- Reactivate
- Delete
- Search & Filtering
- Country Assignment

### Dashboard

- Statistics
- Recent Activity
- Notifications
- Analytics

### Contact

- Submit Enquiries
- Inbox Management

### Reports

- CSV Export
- Excel Export
- PDF Export

## Security

- Helmet
- CORS
- Rate Limiting
- Password Hashing
- JWT Authentication
- Input Validation
- Secure HTTP Cookies

## API Documentation

The API follows REST principles and returns JSON responses using standard HTTP status codes.

## License

This project was developed for a private client and is not licensed for public distribution.