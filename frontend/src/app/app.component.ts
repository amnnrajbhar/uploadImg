import { Component } from '@angular/core';
import { UploadComponent } from './upload.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [UploadComponent],
  template: '<app-upload></app-upload>',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 's3-upload-app';
}
