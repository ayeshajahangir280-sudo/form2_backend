# Indoor Community League 1.0 Registration Backend

Express + MongoDB + Cloudinary backend for the registration form. It is ready for Render Web Service deployment.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Put your real MongoDB password in `.env`:

```bash
MONGODB_URI=mongodb+srv://ayeshajahangir33344_db_user:YOUR_PASSWORD@cluster0.ibyk2xl.mongodb.net/registrations?retryWrites=true&w=majority&appName=Cluster0
```

3. Start the API:

```bash
npm run dev
```

The API runs at `http://localhost:4000`.

## Render deployment

Deploy the `form` directory as a Render Web Service.

- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/`

Set these environment variables in Render:

```bash
MONGODB_URI=mongodb+srv://ayeshajahangir33344_db_user:YOUR_PASSWORD@cluster0.ibyk2xl.mongodb.net/registrations?retryWrites=true&w=majority&appName=Cluster0
CORS_ORIGIN=https://reg-form-1.vercel.app
```

Cloudinary is configured through these Render environment variables:

```bash
CLOUDINARY_CLOUD_NAME=dvruvhnai
CLOUDINARY_API_KEY=535361679594275
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_SECRET
CLOUDINARY_FOLDER=registration-photos
```

## Routes

- `GET /api/health`
- `GET /api/registrations`
- `POST /api/registrations`

After Render deploys, copy the Render backend URL and set the frontend API base URL to that Render URL.

The registration endpoint validates the seven Indoor Community League 1.0 match slots,
the AED 50/- registration and AED 40/- per-match fee agreement, and the required
team-franchise interest response submitted by the frontend.
