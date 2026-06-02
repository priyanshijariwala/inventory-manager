import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  profileImage?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  readonly profileImage = signal<string | null>(null);

  constructor(private readonly api: ApiService) {}

  loadProfile(): Observable<UserProfile> {
    return this.api.get<UserProfile>('users/me').pipe(
      tap(profile => this.profileImage.set(profile.profileImage ?? null)),
    );
  }

  uploadProfileImage(file: File): Observable<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postFormData<UserProfile>('users/me/avatar', formData).pipe(
      tap(profile => this.profileImage.set(profile.profileImage ?? null)),
    );
  }

  removeProfileImage(): Observable<UserProfile> {
    return this.api.delete<UserProfile>('users/me/avatar').pipe(
      tap(profile => this.profileImage.set(profile.profileImage ?? null)),
    );
  }
}
