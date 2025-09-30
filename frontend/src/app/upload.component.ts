import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService, UploadProgress, S3File } from './upload.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="upload-container">
      <h2>Upload Images & Videos to S3</h2>
      
      <div class="file-input-container">
        <input 
          type="file" 
          #fileInput 
          (change)="onFileSelected($event)"
          accept="image/*,video/*"
          multiple
          class="file-input">
        <button (click)="fileInput.click()" class="select-btn">
          Select Files
        </button>
      </div>

      <div *ngIf="selectedFiles.length > 0" class="files-preview">
        <h3>Selected Files:</h3>
        <div *ngFor="let file of selectedFiles; let i = index" class="file-item">
          <div class="file-info">
            <span class="file-name">{{file.name}}</span>
            <span class="file-size">({{formatFileSize(file.size)}})</span>
          </div>
          
          <div *ngIf="file.type.startsWith('image/')" class="preview">
            <img [src]="getPreviewUrl(file)" alt="Preview" class="preview-img">
          </div>
          
          <div class="upload-controls">
            <button 
              (click)="uploadFile(file, i)" 
              [disabled]="uploadStates[i] && uploadStates[i].uploading"
              class="upload-btn">
              {{uploadStates[i] && uploadStates[i].uploading ? 'Uploading...' : 'Upload'}}
            </button>
            
            <div *ngIf="uploadStates[i]?.progress" class="progress-bar">
              <div 
                class="progress-fill" 
                [style.width.%]="uploadStates[i].progress!.percentage">
              </div>
              <span class="progress-text">{{uploadStates[i].progress!.percentage}}%</span>
            </div>
            
            <div *ngIf="uploadStates[i]?.success" class="success">
              ✓ Uploaded successfully
            </div>
            
            <div *ngIf="uploadStates[i]?.error" class="error">
              ✗ {{uploadStates[i]!.error}}
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="uploadedFiles.length > 0" class="uploaded-files">
        <h3>Uploaded Files:</h3>
        <div class="files-grid">
          <div *ngFor="let file of uploadedFiles" class="file-card">
            <div *ngIf="file.isImage" class="image-preview">
              <img [src]="file.url" [alt]="file.fileName" class="uploaded-image" 
                   (error)="onImageError($event)" loading="lazy">
            </div>
            <div *ngIf="!file.isImage" class="file-preview">
              <iframe [src]="file.url" class="file-iframe" frameborder="0"></iframe>
              <a [href]="file.url" target="_blank" class="view-link">View File</a>
            </div>
            <div class="file-details">
              <div class="file-name">{{file.fileName}}</div>
              <div class="file-meta">
                <span class="file-size">{{formatFileSize(file.size)}}</span>
                <span class="file-date">{{file.lastModified | date:'short'}}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .upload-container {
      max-width: 800px;
      margin: 20px auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    .file-input-container {
      margin: 20px 0;
    }
    
    .file-input {
      display: none;
    }
    
    .select-btn, .upload-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    }
    
    .select-btn:hover, .upload-btn:hover {
      background: #0056b3;
    }
    
    .upload-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }
    
    .files-preview {
      margin-top: 20px;
    }
    
    .file-item {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
    }
    
    .file-info {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .file-name {
      font-weight: bold;
      margin-right: 10px;
    }
    
    .file-size {
      color: #666;
      font-size: 0.9em;
    }
    
    .preview-img {
      max-width: 200px;
      max-height: 200px;
      border-radius: 4px;
      margin: 10px 0;
    }
    
    .upload-controls {
      margin-top: 10px;
    }
    
    .progress-bar {
      position: relative;
      width: 100%;
      height: 20px;
      background: #f0f0f0;
      border-radius: 10px;
      margin: 10px 0;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: #28a745;
      transition: width 0.3s ease;
    }
    
    .progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 12px;
      font-weight: bold;
    }
    
    .success {
      color: #28a745;
      font-weight: bold;
      margin-top: 10px;
    }
    
    .error {
      color: #dc3545;
      font-weight: bold;
      margin-top: 10px;
    }
    
    .uploaded-files {
      margin-top: 30px;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
    
    .files-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    
    .file-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      background: #f9f9f9;
    }
    
    .image-preview {
      margin-bottom: 10px;
    }
    
    .uploaded-image {
      width: 100%;
      height: 120px;
      object-fit: cover;
      border-radius: 4px;
      background: #f0f0f0;
      display: block;
    }
    
    .uploaded-image:hover {
      transform: scale(1.05);
      transition: transform 0.2s ease;
    }
    
    .file-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    
    .file-preview {
      margin-bottom: 10px;
    }
    
    .file-iframe {
      width: 100%;
      height: 120px;
      border-radius: 4px;
      background: #f0f0f0;
    }
    
    .view-link {
      display: inline-block;
      margin-top: 5px;
      color: #007bff;
      text-decoration: none;
      font-size: 0.9em;
    }
    
    .view-link:hover {
      text-decoration: underline;
    }
    
    .file-details {
      text-align: center;
    }
    
    .file-name {
      font-weight: bold;
      margin-bottom: 5px;
      word-break: break-word;
    }
    
    .file-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.8em;
      color: #666;
    }
  `]
})
export class UploadComponent implements OnInit {
  selectedFiles: File[] = [];
  uploadStates: { [index: number]: { uploading: boolean; progress?: UploadProgress; success?: boolean; error?: string } } = {};
  previewUrls: { [index: number]: string } = {};
  uploadedFiles: S3File[] = [];

  constructor(private uploadService: UploadService) {}

  ngOnInit(): void {
    this.loadUploadedFiles();
  }

  loadUploadedFiles(): void {
    this.uploadService.getUploadedFiles().subscribe({
      next: (response) => this.uploadedFiles = response.files,
      error: (error) => console.error('Error loading files:', error)
    });
  }

  onFileSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.selectedFiles = files;
    this.uploadStates = {};
    
    // Generate preview URLs for images
    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        this.previewUrls[index] = URL.createObjectURL(file);
      }
    });
  }

  uploadFile(file: File, index: number): void {
    this.uploadStates[index] = { uploading: true };

    this.uploadService.getPresignedUrl(file.name, file.type).subscribe({
      next: (response) => {
        const progressSub = this.uploadService.getUploadProgress().subscribe(
          progress => this.uploadStates[index].progress = progress
        );

        this.uploadService.uploadFile(response.presignedUrl, file).subscribe({
          next: () => {
            this.uploadStates[index] = { uploading: false, success: true };
            this.loadUploadedFiles();
            progressSub.unsubscribe();
          },
          error: (error) => {
            this.uploadStates[index] = { uploading: false, error: error.message };
            progressSub.unsubscribe();
          }
        });
      },
      error: (error) => {
        this.uploadStates[index] = { uploading: false, error: 'Failed to get upload URL' };
      }
    });
  }

  getPreviewUrl(file: File): string {
    const index = this.selectedFiles.indexOf(file);
    return this.previewUrls[index];
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
    event.target.parentElement.innerHTML = '<div class="file-icon">🖼️</div>';
  }
}