import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);

  get<T = any>(url: string): Observable<T> {
    return this.http.get<T>(`${environment.apiUrl}/${url}`);
  }

  getBlob(url: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/${url}`, { responseType: 'blob' });
  }

  postFormData<T = any>(url: string, data: FormData): Observable<T> {
    return this.http.post<T>(`${environment.apiUrl}/${url}`, data);
  }

  post<T = any>(url: string, data: any): Observable<T> {
    return this.http.post<T>(`${environment.apiUrl}/${url}`, data);
  }

  put<T = any>(url: string, data: any): Observable<T> {
    return this.http.put<T>(`${environment.apiUrl}/${url}`, data);
  }

  delete<T = any>(url: string): Observable<T> {
    return this.http.delete<T>(`${environment.apiUrl}/${url}`);
  }
}