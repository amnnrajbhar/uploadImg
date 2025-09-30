import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface PresignedUrlResponse {
  presignedUrl: string;
  key: string;
  bucket: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface S3File {
  key: string;
  fileName: string;
  size: number;
  lastModified: Date;
  url: string;
  isImage: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  // private readonly backendUrl = 'http://localhost:3000';
  private readonly backendUrl = 'https://uploadimg-1.onrender.com';
  private progressSubject = new Subject<UploadProgress>();

  constructor(private http: HttpClient) {}

  getPresignedUrl(fileName: string, fileType: string): Observable<PresignedUrlResponse> {
    return this.http.post<PresignedUrlResponse>(`${this.backendUrl}/presigned-url`, {
      fileName,
      fileType
    });
  }

  uploadFile(presignedUrl: string, file: File): Observable<any> {
    return new Observable(observer => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          };
          this.progressSubject.next(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          observer.next({ success: true });
          observer.complete();
        } else {
          observer.error(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        observer.error(new Error('Upload failed'));
      });

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  getUploadProgress(): Observable<UploadProgress> {
    return this.progressSubject.asObservable();
  }

  getUploadedFiles(): Observable<{files: S3File[]}> {
    return this.http.get<{files: S3File[]}>(`${this.backendUrl}/files`);
  }

  deleteFile(key: string): Observable<any> {
    return this.http.delete(`${this.backendUrl}/files/${encodeURIComponent(key)}`);
  }
}