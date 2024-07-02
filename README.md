# Diagnostic Center Management System - HealthFlow

## Overview

HealthFlow is a comprehensive Diagnostic Center Management System designed to streamline the management of appointments, patient records, test results, and administrative tasks for diagnostic centers. This full-stack web application aims to enhance the efficiency of diagnostic centers by providing a seamless user experience and robust administrative tools.

## Features

- **User Authentication and Profile Management**:
  - Secure user authentication using Firebase Authentication.
  - Detailed profile management including user registration with email, name, avatar, blood group, district, upazila, password, and confirmation.
  - Admin can manage user statuses and roles.

- **User Dashboard**:
  - Private dashboard for users to manage profiles, view upcoming appointments, and access test results.
  - Users can cancel appointments and download or print test results.

- **Admin Dashboard**:
  - Manage users, tests, reservations, and banners.
  - Download user details in PDF format using jsPDF.
  - View statistics with charts on service bookings and delivery ratios.

- **Responsive Design**:
  - Optimized for mobile, tablet, and desktop views.

- **Dynamic Banner**:
  - Admin can upload and select banners to display on the homepage.

## Technologies Used

- **Frontend**: React.js, TailwindCSS, Axios, TanStack Query
- **Backend**: Express.js, MongoDB
- **Authentication**: Firebase Authentication
- **Payment**: Stripe
- **PDF Generation**: jsPDF

## Project Setup

To run this project locally, follow these steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/mithuchandrabiswas/Diagnostic-Center-Management-System-HealthFlow--Client.git
   cd Diagnostic-Center-Management-System-HealthFlow--Client
  
2. **Install NPM Package**
3. **Create a .env file your root directory**
4. **Run: npm start**:
