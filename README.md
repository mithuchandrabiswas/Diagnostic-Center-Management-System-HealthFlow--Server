# 🏥 HealthFlow - Diagnostic Center Management System (Server)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

> RESTful API backend for the HealthFlow Diagnostic Center Management System. Handles authentication, appointments, test management, payments, and admin operations.

## 🌐 Live API

🔗 Deployed on **Vercel**

## 🔗 Related Repositories

- **Client (Frontend):** [HealthFlow Client](https://github.com/mithuchandrabiswas/Diagnostic-Center-Management-System-HealthFlow--Client)
- **Live Site:** [https://assignment-twelve---full-stack.web.app](https://assignment-twelve---full-stack.web.app)

---

## ✨ API Features

### 🔐 Authentication & Authorization
- JWT-based authentication (access + refresh tokens)
- Role-based access control (Admin / User)
- Firebase token verification middleware

### 👤 User Management
- Register, login, update profile
- Admin can block/unblock users and change roles
- Fetch users by district/upazila

### 🧪 Test Management
- CRUD operations for diagnostic tests
- Filter and search tests by availability
- Slot management per test

### 📅 Appointment & Reservation
- Book, cancel, and manage test reservations
- Deliver test results with status updates
- Filter reservations by date and status

### 💳 Payment
- Stripe payment intent creation
- Secure payment verification

### 📊 Admin Statistics
- Booking counts and delivery ratios
- Service-wise analytics data

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (Mongoose) |
| Authentication | JWT + Firebase Admin |
| Payment | Stripe |
| Deployment | Vercel |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- Stripe account
- Firebase project (Admin SDK)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mithuchandrabiswas/Diagnostic-Center-Management-System-HealthFlow--Server.git

# 2. Navigate to project directory
cd Diagnostic-Center-Management-System-HealthFlow--Server

# 3. Install dependencies
npm install

# 4. Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password
ACCESS_TOKEN_SECRET=your_jwt_access_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### Run the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:5000`

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/jwt` | Generate JWT token |
| POST | `/logout` | Clear token |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | Get all users (Admin) |
| POST | `/users` | Create new user |
| PATCH | `/users/:id` | Update user status/role |

### Tests
| Method | Endpoint | Description |
|---|---|---|
| GET | `/tests` | Get all tests |
| POST | `/tests` | Add new test (Admin) |
| PUT | `/tests/:id` | Update test (Admin) |
| DELETE | `/tests/:id` | Delete test (Admin) |

### Reservations
| Method | Endpoint | Description |
|---|---|---|
| GET | `/bookings` | Get all bookings (Admin) |
| POST | `/bookings` | Create a booking |
| PATCH | `/bookings/:id` | Update booking status |
| DELETE | `/bookings/:id` | Cancel booking |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/create-payment-intent` | Stripe payment intent |

---

## 📁 Project Structure

```
├── index.js          # Main server entry point
├── vercel.json       # Vercel deployment config
├── package.json
└── .env              # Environment variables (not committed)
```

---

## 👨‍💻 Author

**Mithu Chandra Biswas**
- GitHub: [@mithuchandrabiswas](https://github.com/mithuchandrabiswas)
