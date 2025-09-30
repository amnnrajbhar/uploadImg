# S3 Upload Project

A minimal, production-ready project for uploading images and videos to AWS S3 using Angular frontend and Node.js backend with presigned URLs.

## Project Structure

```
uploadImg/
├── backend/           # Node.js/Express server
│   ├── server.js      # Main server file
│   ├── package.json   # Dependencies
│   └── .env.example   # Environment variables template
└── frontend/          # Angular application
    └── src/app/
        ├── upload.service.ts    # Upload service
        ├── upload.component.ts  # Upload component
        └── app.component.ts     # Main app component
```

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` file with your AWS credentials:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET_NAME=your-bucket-name
PORT=3000
```

**Security Note**: Never commit your `.env` file or expose AWS credentials in frontend code.

### 2. Frontend Setup

```bash
cd frontend
npm install
```

### 3. AWS S3 Bucket Configuration

Ensure your S3 bucket has proper CORS configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["PUT", "POST"],
        "AllowedOrigins": ["http://localhost:4200"],
        "ExposeHeaders": []
    }
]
```

## Running the Application

### Start Backend (Terminal 1)
```bash
cd backend
npm start
```
Server runs on http://localhost:3000

### Start Frontend (Terminal 2)
```bash
cd frontend
ng serve
```
Application runs on http://localhost:4200

## Features

- **Secure Upload**: Uses presigned URLs (5-minute expiration)
- **File Organization**: Files stored as `uploads/<timestamp>-<originalName>`
- **Progress Tracking**: Real-time upload progress
- **File Preview**: Image thumbnails before upload
- **Multi-file Support**: Upload multiple files simultaneously
- **Type Validation**: Accepts images and videos only

## Security Considerations

### Making Objects Public (Optional)

To make uploaded objects publicly accessible, modify the backend `server.js`:

```javascript
const command = new PutObjectCommand({
  Bucket: process.env.S3_BUCKET_NAME,
  Key: key,
  ContentType: fileType,
  ACL: 'public-read'  // Add this line
});
```

**⚠️ Security Warning**: Public ACL makes files accessible to anyone with the URL. Only use for non-sensitive content.

### Production Considerations

1. **Environment Variables**: Use AWS IAM roles in production instead of access keys
2. **CORS**: Update CORS origins for production domains
3. **File Validation**: Add server-side file type and size validation
4. **Rate Limiting**: Implement rate limiting on presigned URL endpoint
5. **Authentication**: Add user authentication before allowing uploads

## API Endpoints

### POST /presigned-url
Generates presigned URL for S3 upload.

**Request Body:**
```json
{
  "fileName": "example.jpg",
  "fileType": "image/jpeg"
}
```

**Response:**
```json
{
  "presignedUrl": "https://bucket.s3.region.amazonaws.com/...",
  "key": "uploads/1234567890-example.jpg",
  "bucket": "your-bucket-name"
}
```

## Architecture

1. **Frontend** requests presigned URL from backend
2. **Backend** generates presigned URL using AWS SDK v3
3. **Frontend** uploads file directly to S3 using presigned URL
4. **No AWS credentials** exposed to frontend

This architecture ensures secure, scalable file uploads without exposing AWS credentials to the client.