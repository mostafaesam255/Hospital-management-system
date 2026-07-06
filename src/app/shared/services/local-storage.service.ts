import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private storageSub = new Subject<string>();

  watchStorage(): Observable<string> {
    return this.storageSub.asObservable();
  }

  setItem(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
    this.storageSub.next(key);
  }

  getItem<T>(key: string): T | null {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) as T : null;
  }

  removeItem(key: string) {
    localStorage.removeItem(key);
    this.storageSub.next(key);
  }

  clear() {
    localStorage.clear();
    this.storageSub.next('all');
  }
}
