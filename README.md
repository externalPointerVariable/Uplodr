# 🚀 Full Stack Uplodr Application Documentation

## Project Title: Media Capture and Storage Web Application

This document details the architecture, functionality, and technical implementation of the Full Stack Uplodr application, developed to showcase proficiency in the **MERN stack** (MongoDB, Express.js, React.js, Node.js), **JWT Authentication**, **Redux Toolkit** for state management, and **AWS S3** integration for scalable media storage.

## 1. Core Architecture and Technology Stack

The application employs a standard MERN stack architecture, utilizing a RESTful API structure where the React frontend communicates exclusively with the Express backend.

### Technology Stack Summary

| Layer | Technology | Key Packages/Concepts | 
 | ----- | ----- | ----- | 
| **Frontend** | React.js | Redux Toolkit, React-Redux, Tailwind CSS, Component Modularization | 
| **Backend** | Node.js, Express.js | Mongoose (MongoDB ODM), JWT, Bcryptjs, Multer-S3 | 
| **Database** | MongoDB Atlas | Stores user records and media metadata (URLs, file keys, types). | 
| **Storage** | AWS S3 | Stores actual binary media files (images/videos). | 

### Data Flow for Media Upload

1. **Client Action (React):** User selects a file and clicks upload in the `UploadModal`.

2. **Redux Dispatch:** The `uploadMediaItem` thunk is dispatched.

3. **API Call:** An authenticated request (`Bearer Token`) containing the media file (`FormData`) is sent to the Express backend.

4. **Backend Middleware:** The request hits a protected route (`/api/media/upload`). The `protect` middleware validates the JWT token.

5. **S3 Integration:** The `multer-s3` middleware intercepts the request and streams the file directly to the configured AWS S3 bucket.

6. **DB Save (MongoDB):** Upon successful S3 upload, the controller receives the public URL (`location`) and S3 key, saves this metadata (along with the `user` reference) to the MongoDB `Media` collection.

7. **Client Response:** The new media object is returned to the client, and the Redux state is updated.

## 2. Backend Implementation (Node, Express, Security)

The backend is built with modularity in mind, separating concerns into Models, Controllers, Middleware, and Routes.

### 2.1 Security and Authentication (JWT & Bcrypt)

| Requirement | Implementation Detail | 
 | ----- | ----- | 
| **Password Hashing** | Uses **bcryptjs** (with a salt factor of 10) to hash user passwords before storage in MongoDB. This ensures passwords are never stored in plain text. | 
| **JWT Generation** | Upon successful login or registration, a **JSON Web Token (JWT)** is generated using the user's ID as the payload and is signed with a secret key (`process.env.JWT_SECRET`). The token is set to expire (e.g., in 1 day). | 
| **Protected Routes** | The `middleware/authMiddleware.js` contains the **`protect`** function. This function intercepts requests to sensitive endpoints, verifies the JWT, and attaches the authenticated user's ID to the request (`req.user`), preventing unauthorized access. | 

### 2.2 Database Models (MongoDB/Mongoose)

**A. User Model (`models/User.model.js`)**

Stores core user credentials and profile information.

* **`email`**: String, required, unique (for login).

* **`password`**: String, required (stores the bcrypt hash).

* **`name`**: String.

**B. Media Model (`models/Media.model.js`)**

Stores non-binary metadata about the uploaded file.

* **`user`**: MongoDB **Schema.Types.ObjectId, ref: 'User'**. This creates the required link between the media file and the user who uploaded it, crucial for ownership checks.

* **`file_key`**: The unique identifier used by S3 to find/delete the file.

* **`file_location`**: The public, accessible HTTPS URL of the file in the S3 bucket.

* **`file_type`**: String (`Image`, `Video`, `Other`), used for frontend filtering.

* **`uploadDate`**: Date, for display and sorting.

### 2.3 API Endpoints

All endpoints are prefixed with `/api`.

| Route | Method | Access | Controller Function | Purpose | 
 | ----- | ----- | ----- | ----- | ----- | 
| `/api/auth/register` | `POST` | Public | `registerUser` | Creates a new user record (hashes password). | 
| `/api/auth/login` | `POST` | Public | `loginUser` | Authenticates user and returns JWT token. | 
| `/api/media/upload` | `POST` | Private | `uploadMedia` | Handles file upload via `multer-s3`, saves metadata to MongoDB. | 
| `/api/media/gallery` | `GET` | Private | `getMediaGallery` | Fetches all media for the authenticated user, supporting **pagination** and sorting. | 
| `/api/media/:id` | `DELETE` | Private | `deleteMedia` | Deletes the file from S3 and the corresponding metadata from MongoDB (includes ownership check). | 

### 2.4 AWS S3 Storage and File Handling

The application is configured for **AWS S3** as the primary storage mechanism:

* **Integration:** Uses the official **`@aws-sdk/client-s3`** package and **`multer-s3`** for seamless integration with Express.

* **File Key Generation:** Each file is stored with a unique key format, typically including the user ID and a timestamp: `media/<user_id>/<timestamp>__<original_filename>`.

* **Public Access:** The S3 bucket is configured with a **`public-read`** ACL during upload, allowing the frontend to display images and videos directly via the returned S3 URL without needing pre-signed URLs (simplifying the front-end display logic).

* **Validation:** File filtering is applied in the `multer-s3` configuration to accept only common image/video formats, and a file size limit (5MB) is enforced, fulfilling the requirements for file upload validation.

## 3. Frontend Implementation (React, Redux Toolkit, UI/UX)

The frontend is a single-page application built with **React** and styled using **Tailwind CSS** for a clean, fully **responsive** design.

### 3.1 State Management with Redux Toolkit

The Redux store manages authenticated global state cleanly and predictably, using **`createAsyncThunk`** for all API interactions (thunks handle the `pending`/`fulfilled`/`rejected` states automatically).

| Redux Slice | State Managed | Key Thunks (Async Actions) | 
 | ----- | ----- | ----- | 
| **`authSlice`** | `user`, `token`, `isLoading`, `error` | `loginUser`, `registerUser` | 
| **`mediaSlice`** | `mediaList`, `isLoading`, `filterType` | `loadMedia`, `uploadMediaItem`, `deleteMediaItem` | 

Components interact with the store using:

* **`useSelector`**: To read state (e.g., getting `mediaList`, `user`, or `filterType`).

* **`useDispatch`**: To send actions (e.g., dispatching `loginUser` or `setFilterType`).

### 3.2 UI/UX and Component Breakdown

The interface is divided into logical, modular React components:

| Component | Description | Key Requirement Fulfilled | 
 | ----- | ----- | ----- | 
| **`AuthForm`** | Renders the unified Login/Register interface. Handles local form state and dispatches the necessary authentication thunk. | User Registration & Login (UI) | 
| **`Dashboard`** | The main container after login. Organizes the filter bar and the media gallery grid. Handles initial media loading logic. | Dashboard Implementation | 
| **`UploadModal`** | A controlled modal component that captures file input. **Crucially, it handles the file preview via `URL.createObjectURL`** before dispatching the actual upload to the Redux store. | Pre-upload Preview & Validation | 
| **`MediaCard`** | Renders a single media item in the grid format. Displays the file name, type, a direct view link to the S3 URL, and a Delete button. The delete action triggers the Redux `deleteMediaItem` thunk. | Grid/List Format, View & Delete | 
| **Filtering Logic** | Dedicated filter buttons in the `Dashboard` dispatch the `setFilterType` action. The `filteredMedia` selector then renders only **Images** or **Videos** as requested. | Filtering Media by Type | 

## 4. Setup and Deployment

This section outlines the steps and environmental configuration required to run the application.

### Prerequisites

* Node.js (LTS recommended)

* MongoDB Atlas Account

* AWS Account with IAM user credentials (Access Key ID and Secret Access Key)

### Environment Variables (`.env`)

You must create a `.env` file in the root of your Node.js backend directory with the following variables:

``` shell

# MongoDB Atlas Connection

MONGO_URI=mongodb+srv://\<user\>:\<password\>@\<cluster-name\>/uplodr?retryWrites=true\&w=majority

# JWT Authentication Secret

# MUST be a long, complex, random string

JWT_SECRET=YOUR\_VERY\_STRONG\_JWT\_SECRET\_KEY

# AWS S3 Configuration

# IAM user must have permissions (s3:PutObject, s3:GetObject, s3:DeleteObject) on the bucket

S3_REGION=ap-south-1  \# Example: The region where your bucket is hosted
S3_BUCKET_NAME=easysharebucket
AWS_ACCESS_KEY_ID=YOUR\_AWS\_ACCESS\_KEY\_ID
AWS_SECRET_ACCESS_KEY=YOUR\_AWS\_SECRET\_ACCESS\_KEY

```

### Deployment Strategy

* **Backend Deployment:** The Express server (Node.js) is designed to be deployed on platforms like **Render** or **Heroku**.

* **Frontend Deployment:** The React application is built and hosted separately on platforms like **Vercel** or **Netlify**.

* **CORS Configuration:** The backend must explicitly allow CORS from the deployed frontend URL to prevent cross-origin request errors.

This documentation thoroughly covers all technical requirements outlined in the project brief, demonstrating a solid understanding of full-stack development, cloud integration, and modern state management principles.
