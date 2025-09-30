import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService, UploadProgress, S3File } from './upload.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="upload-container">
      <div class="header">
        <h1>Media Upload Center</h1>
        <p>Upload and manage your images and videos</p>
      </div>
      
      <div class="upload-section">
        <input 
          type="file" 
          #fileInput 
          (change)="onFileSelected($event)"
          accept="image/*,video/*"
          multiple
          class="file-input">
        <button (click)="fileInput.click()" class="select-btn">
          <span class="btn-icon">📁</span>
          Choose Files
        </button>
      </div>

      <div *ngIf="selectedFiles.length > 0" class="preview-section">
        <h2>Ready to Upload</h2>
        <div class="preview-grid">
          <div *ngFor="let file of selectedFiles; let i = index" class="preview-card">
            <div class="media-preview">
              <img *ngIf="file.type.startsWith('image/')" 
                   [src]="getPreviewUrl(file)" 
                   [alt]="file.name" 
                   class="preview-media">
              <video *ngIf="file.type.startsWith('video/')" 
                     [src]="getPreviewUrl(file)" 
                     class="preview-media" 
                     controls 
                     muted>
              </video>
            </div>
            
            <div class="card-content">
              <h4 class="file-title">{{file.name}}</h4>
              <p class="file-info">{{formatFileSize(file.size)}} • {{getFileType(file)}}</p>
              
              <button 
                (click)="uploadFile(file, i)" 
                [disabled]="uploadStates[i] && uploadStates[i].uploading"
                class="upload-btn" 
                [class.uploading]="uploadStates[i] && uploadStates[i].uploading">
                <span *ngIf="!uploadStates[i]?.uploading">Upload</span>
                <span *ngIf="uploadStates[i]?.uploading">Uploading...</span>
              </button>
              
              <div *ngIf="uploadStates[i]?.progress" class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="uploadStates[i].progress!.percentage"></div>
                </div>
                <span class="progress-text">{{uploadStates[i].progress!.percentage}}%</span>
              </div>
              
              <div *ngIf="uploadStates[i]?.success" class="status success">
                ✓ Upload Complete
                <button class="upload-another-btn" (click)="fileInput.click()">
                  Upload Another
                </button>
              </div>
              
              <div *ngIf="uploadStates[i]?.error" class="status error">
                ✗ {{uploadStates[i]!.error}}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="uploadedFiles.length > 0" class="gallery-section">
        <h2>Media Gallery</h2>
        <div class="media-grid">
          <div *ngFor="let file of uploadedFiles" class="media-card" (click)="openModal(file)">
            <div class="media-container">
              <img *ngIf="file.isImage" 
                   [src]="file.url" 
                   [alt]="file.fileName" 
                   class="media-item"
                   loading="lazy">
              <video *ngIf="!file.isImage && isVideo(file.fileName)" 
                     [src]="file.url" 
                     class="media-item" 
                     muted 
                     preload="metadata"
                     (mouseenter)="playVideo($event)"
                     (mouseleave)="pauseVideo($event)">
              </video>
              <div *ngIf="!file.isImage && !isVideo(file.fileName)" class="file-placeholder">
                <span class="file-icon">📄</span>
                <p>{{getFileExtension(file.fileName)}}</p>
              </div>
              <div class="media-overlay">
                <span class="play-icon" *ngIf="!file.isImage && isVideo(file.fileName)">▶</span>
              </div>
            </div>
            <div class="media-info">
              <h4 class="media-title">{{file.fileName}}</h4>
              <p class="media-meta">{{formatFileSize(file.size)}}</p>
              <button class="delete-btn" (click)="deleteFile(file, $event)" title="Delete file">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal for full view -->
      <div *ngIf="selectedMedia" class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <button class="close-btn" (click)="closeModal()">×</button>
          <div class="modal-media">
            <img *ngIf="selectedMedia.isImage" 
                 [src]="selectedMedia.url" 
                 [alt]="selectedMedia.fileName" 
                 class="modal-image">
            <video *ngIf="!selectedMedia.isImage && isVideo(selectedMedia.fileName)" 
                   [src]="selectedMedia.url" 
                   class="modal-video" 
                   controls 
                   autoplay>
            </video>
            <iframe *ngIf="!selectedMedia.isImage && !isVideo(selectedMedia.fileName)" 
                    [src]="selectedMedia.url" 
                    class="modal-iframe" 
                    frameborder="0">
            </iframe>
          </div>
          <div class="modal-info">
            <h3>{{selectedMedia.fileName}}</h3>
            <p>{{formatFileSize(selectedMedia.size)}} • {{selectedMedia.lastModified | date:'medium'}}</p>
            <div class="modal-actions">
              <a [href]="selectedMedia.url" target="_blank" class="download-btn">Download</a>
              <button class="delete-btn-modal" (click)="deleteFileFromModal()">Delete</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="watermark">
        <p>© 2025 <a href="https://amnnrajbhar.github.io/info/" target="_blank">Aman Rajbhar</a>. All rights reserved.</p>
      </div>
      
      <div *ngIf="toastMessage" class="toast" [class.show]="showToast">
        {{toastMessage}}
      </div>
    </div>
  `,
  styles: [`
    * {
      box-sizing: border-box;
    }
    
    .upload-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    
    .header {
      text-align: center;
      color: white;
      margin-bottom: 40px;
    }
    
    .header h1 {
      font-size: 2.5rem;
      margin: 0 0 10px 0;
      font-weight: 700;
    }
    
    .header p {
      font-size: 1.1rem;
      opacity: 0.9;
      margin: 0;
    }
    
    .upload-section {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .file-input {
      display: none;
    }
    
    .select-btn {
      background: white;
      color: #667eea;
      border: none;
      padding: 15px 30px;
      border-radius: 50px;
      cursor: pointer;
      font-size: 1.1rem;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    
    .select-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    }
    
    .btn-icon {
      font-size: 1.2rem;
    }
    
    .preview-section, .gallery-section {
      background: white;
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .preview-section h2, .gallery-section h2 {
      color: #333;
      margin: 0 0 25px 0;
      font-size: 1.8rem;
      font-weight: 600;
    }
    
    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .preview-card {
      border: 1px solid #e1e5e9;
      border-radius: 15px;
      overflow: hidden;
      background: #f8f9fa;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .preview-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    
    .media-preview {
      width: 100%;
      height: 200px;
      overflow: hidden;
      background: #f0f0f0;
    }
    
    .preview-media {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .card-content {
      padding: 20px;
    }
    
    .file-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #333;
      word-break: break-word;
    }
    
    .file-info {
      color: #666;
      margin: 0 0 15px 0;
      font-size: 0.9rem;
    }
    
    .upload-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      width: 100%;
      transition: all 0.3s ease;
    }
    
    .upload-btn:hover:not(:disabled) {
      background: #5a6fd8;
    }
    
    .upload-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .upload-btn.uploading {
      background: #ffc107;
      color: #333;
    }
    
    .progress-container {
      margin-top: 15px;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 5px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s ease;
    }
    
    .progress-text {
      font-size: 0.8rem;
      color: #666;
      text-align: center;
    }
    
    .status {
      margin-top: 10px;
      padding: 8px;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 600;
      text-align: center;
    }
    
    .status.success {
      background: #d4edda;
      color: #155724;
    }
    
    .upload-another-btn {
      background: #28a745;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      margin-top: 8px;
      transition: background 0.3s ease;
    }
    
    .upload-another-btn:hover {
      background: #218838;
    }
    
    .status.error {
      background: #f8d7da;
      color: #721c24;
    }
    
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
    }
    
    .media-card {
      border-radius: 15px;
      overflow: hidden;
      background: white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .media-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .media-container {
      position: relative;
      width: 100%;
      height: 200px;
      overflow: hidden;
    }
    
    .media-item {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    .media-card:hover .media-item {
      transform: scale(1.05);
    }
    
    .file-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: #f8f9fa;
      color: #666;
    }
    
    .file-icon {
      font-size: 3rem;
      margin-bottom: 10px;
    }
    
    .media-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .media-card:hover .media-overlay {
      opacity: 1;
    }
    
    .play-icon {
      color: white;
      font-size: 3rem;
    }
    
    .media-info {
      padding: 15px;
      position: relative;
    }
    
    .media-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 5px 0;
      color: #333;
      word-break: break-word;
    }
    
    .media-meta {
      color: #666;
      font-size: 0.8rem;
      margin: 0;
    }
    
    .delete-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(220, 53, 69, 0.9);
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      opacity: 0;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }
    
    .media-card:hover .delete-btn {
      opacity: 1;
    }
    
    .delete-btn:hover {
      background: #dc3545;
      transform: scale(1.15);
      box-shadow: 0 6px 20px rgba(220, 53, 69, 0.5);
    }
    
    .delete-btn svg {
      transition: transform 0.2s ease;
    }
    
    .delete-btn:hover svg {
      transform: rotate(10deg);
    }
    
    .watermark {
      text-align: center;
      padding: 20px;
      margin-top: 40px;
    }
    
    .watermark p {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
      margin: 0;
    }
    
    .watermark a {
      color: white;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    
    .watermark a:hover {
      color: #ffd700;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    }
    
    .toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
      z-index: 1000;
      transform: translateX(400px);
      opacity: 0;
      transition: all 0.3s ease;
    }
    
    .toast.show {
      transform: translateX(0);
      opacity: 1;
    }
    
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    
    .modal-content {
      background: white;
      border-radius: 15px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
      position: relative;
    }
    
    .close-btn {
      position: absolute;
      top: 15px;
      right: 15px;
      background: rgba(0,0,0,0.5);
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.5rem;
      z-index: 1001;
      transition: background 0.3s ease;
    }
    
    .close-btn:hover {
      background: rgba(0,0,0,0.7);
    }
    
    .modal-media {
      max-width: 80vw;
      max-height: 70vh;
    }
    
    .modal-image, .modal-video {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
    }
    
    .modal-iframe {
      width: 80vw;
      height: 70vh;
    }
    
    .modal-info {
      padding: 20px;
      text-align: center;
    }
    
    .modal-info h3 {
      margin: 0 0 10px 0;
      color: #333;
    }
    
    .modal-info p {
      color: #666;
      margin: 0 0 15px 0;
    }
    
    .download-btn {
      background: #667eea;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      transition: background 0.3s ease;
    }
    
    .download-btn:hover {
      background: #5a6fd8;
    }
    
    .modal-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    
    .delete-btn-modal {
      background: #dc3545;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s ease;
    }
    
    .delete-btn-modal:hover {
      background: #c82333;
    }
    
    @media (max-width: 768px) {
      .upload-container {
        padding: 15px;
      }
      
      .header h1 {
        font-size: 2rem;
      }
      
      .preview-grid {
        grid-template-columns: 1fr;
      }
      
      .media-grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .preview-section, .gallery-section {
        padding: 20px;
      }
    }
    
    @media (max-width: 480px) {
      .media-grid {
        grid-template-columns: 1fr;
      }
      
      .modal-media {
        max-width: 95vw;
      }
      
      .modal-iframe {
        width: 95vw;
        height: 60vh;
      }
    }
  `]
})
export class UploadComponent implements OnInit {
  selectedFiles: File[] = [];
  uploadStates: { [index: number]: { uploading: boolean; progress?: UploadProgress; success?: boolean; error?: string } } = {};
  previewUrls: { [index: number]: string } = {};
  uploadedFiles: S3File[] = [];
  selectedMedia: S3File | null = null;
  toastMessage: string = '';
  showToast: boolean = false;

  constructor(private uploadService: UploadService) {}

  ngOnInit(): void {
    this.loadUploadedFiles();
  }

  loadUploadedFiles(): void {
    this.uploadService.getUploadedFiles().subscribe({
      next: (response) => this.uploadedFiles = response.files.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      ),
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
            this.showToastMessage(`${file.name} uploaded successfully!`);
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

  getFileType(file: File): string {
    if (file.type.startsWith('image/')) return 'Image';
    if (file.type.startsWith('video/')) return 'Video';
    return 'File';
  }

  isVideo(fileName: string): boolean {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
    return videoExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toUpperCase() || 'FILE';
  }

  openModal(file: S3File): void {
    this.selectedMedia = file;
  }

  closeModal(): void {
    this.selectedMedia = null;
  }

  playVideo(event: any): void {
    const video = event.target as HTMLVideoElement;
    video.play().catch(() => {});
  }

  pauseVideo(event: any): void {
    const video = event.target as HTMLVideoElement;
    video.pause();
  }

  deleteFile(file: S3File, event: Event): void {
    event.stopPropagation();
    if (confirm(`Delete ${file.fileName}?`)) {
      this.uploadService.deleteFile(file.key).subscribe({
        next: () => {
          this.loadUploadedFiles();
          this.showToastMessage(`${file.fileName} deleted successfully!`);
        },
        error: (error) => console.error('Delete failed:', error)
      });
    }
  }

  deleteFileFromModal(): void {
    if (this.selectedMedia && confirm(`Delete ${this.selectedMedia.fileName}?`)) {
      this.uploadService.deleteFile(this.selectedMedia.key).subscribe({
        next: () => {
          this.loadUploadedFiles();
          this.showToastMessage(`${this.selectedMedia!.fileName} deleted successfully!`);
          this.closeModal();
        },
        error: (error) => console.error('Delete failed:', error)
      });
    }
  }

  showToastMessage(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
      setTimeout(() => this.toastMessage = '', 300);
    }, 3000);
  }
}