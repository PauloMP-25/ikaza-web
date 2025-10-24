import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private uploadPreset = 'imagenes-ikaza';
  private url = `https://api.cloudinary.com/v1_1/${environment.cloudName}/upload`;
  constructor(private http: HttpClient) {}

  subirImagen(file: File, categoria: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    // Carpeta dinámica según categoría
    if (categoria) {
      formData.append('folder', categoria);
    }

    return this.http.post(this.url, formData);
  }
}