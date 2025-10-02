const express = require('express');
const cors = require('cors');
const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// app.use(cors({
//   origin: ['http://localhost:4200', 'https://your-frontend-domain.com'],
//   credentials: true
// }));
app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json());

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

app.post('/presigned-url', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    
    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName and fileType are required' });
    }

    const timestamp = Date.now();
    const key = `uploads/${timestamp}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    res.json({
      presignedUrl,
      key,
      bucket: process.env.S3_BUCKET_NAME
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

app.get('/files', async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: 'uploads/'
    });

    const response = await s3Client.send(command);
    const files = await Promise.all(
      (response.Contents || []).map(async (obj) => {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: obj.Key
        });
        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
        const fileName = obj.Key.split('/')[1];
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
        return {
          key: obj.Key,
          fileName,
          size: obj.Size,
          lastModified: obj.LastModified,
          url: signedUrl,
          isImage
        };
      })
    );

    res.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.delete('/files/:key(*)', async (req, res) => {
  try {
    const key = req.params.key;
    
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});