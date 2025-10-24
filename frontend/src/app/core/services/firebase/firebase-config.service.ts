// src/app/services/servicio-firebase/firebase-config.service.ts
import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { environment } from 'src/environments/environment.prod';

@Injectable({
    providedIn: 'root'
})
export class FirebaseConfigService {
    private app: FirebaseApp;
    private _auth: Auth;
    private _firestore: Firestore;
    private _storage: FirebaseStorage;

    constructor() {
        this.app = initializeApp(environment.firebaseConfig);
        this._auth = getAuth(this.app);
        this._firestore = getFirestore(this.app);
        this._storage = getStorage(this.app);

        // Configurar idioma
        this._auth.languageCode = 'es';
    }

    get auth(): Auth {
        return this._auth;
    }

    get firestore(): Firestore {
        return this._firestore;
    }

    get storage(): FirebaseStorage {
        return this._storage;
    }

    get firebaseApp(): FirebaseApp {
        return this.app;
    }
}