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
  styleUrl: './upload.component.css'

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