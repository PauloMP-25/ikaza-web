// src/app/services/servicio-perfil/servicio-perfil.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, from, of,throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { updateProfile } from 'firebase/auth';
import { Auth } from '@angular/fire/auth';
import { UserDataService } from '../firebase/user-data.service';
import { ProfileUpdateData } from '../../models/auth-firebase/profile-update-data';
import {
    User,
    updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import {
    doc,
    updateDoc,
    getDoc
} from 'firebase/firestore';

// Importar configuración Firebase
import { FirebaseConfigService } from '../firebase/firebase-config.service';
@Injectable({
    providedIn: 'root'
})
export class ProfileService {
    private auth = inject(Auth);
    private userDataService = inject(UserDataService);
    private firebaseConfig = inject(FirebaseConfigService);

    /**
     * Actualiza el perfil del usuario
     */
    updateProfile(profileData: ProfileUpdateData): Observable<void> {
        const currentUser = this.auth.currentUser;

        if (!currentUser) {
            throw new Error('No hay usuario autenticado');
        }

        // Preparar datos para Firebase Auth (solo displayName y photoURL)
        const authProfileData: any = {};
        if (profileData.displayName !== undefined) {
            authProfileData.displayName = profileData.displayName;
        }
        if (profileData.photoURL !== undefined) {
            authProfileData.photoURL = profileData.photoURL;
        }

        // Actualizar Firebase Auth si hay cambios de displayName o photoURL
        const authUpdate$ = Object.keys(authProfileData).length > 0
            ? from(updateProfile(currentUser, authProfileData))
            : of(void 0);

        // Preparar datos para Firestore (incluyendo customIcon)
        const firestoreData: any = {};
        if (profileData.displayName !== undefined) {
            firestoreData.displayName = profileData.displayName;
        }
        if (profileData.photoURL !== undefined) {
            firestoreData.photoURL = profileData.photoURL;
        }
        if (profileData.customIcon !== undefined) {
            firestoreData.customIcon = profileData.customIcon;
        }

        // Actualizar ambos: Auth y Firestore
        return authUpdate$.pipe(
            switchMap(() => {
                if (Object.keys(firestoreData).length > 0) {
                    return this.userDataService.updateUserData(currentUser.uid, firestoreData);
                }
                return of(void 0);
            }),
            catchError(error => {
                console.error('Error actualizando perfil:', error);
                throw error;
            })
        );
    }

    /**
     * Sube una imagen de perfil
     */
    uploadProfileImage(base64Image: string): Observable<string> {
        const user = this.firebaseConfig.auth.currentUser;
        if (!user) {
            return throwError(() => new Error('Usuario no autenticado'));
        }

        return from(this.performImageUpload(user, base64Image));
    }

    /**
     * Elimina la imagen de perfil del usuario
     */
    removeProfileImage(): Observable<void> {
        const user = this.firebaseConfig.auth.currentUser;
        if (!user) {
            return throwError(() => new Error('Usuario no autenticado'));
        }

        return from(this.performImageRemoval(user));
    }

    /**
     * Obtiene datos extendidos del usuario desde Firestore
     */
    getUserExtendedData(userId: string): Observable<any> {
        return from(this.getFirestoreUserData(userId));
    }

    /**
     * Guarda el icono personalizado en Firestore
     */
    saveCustomIcon(userId: string, iconClass: string): Observable<void> {
        return from(this.performCustomIconSave(userId, iconClass));
    }

    // Métodos privados para las operaciones async

    private async performProfileUpdate(user: User, profileData: ProfileUpdateData): Promise<void> {
        try {
            let photoURL = profileData.photoURL;

            // Si se proporciona una imagen en base64, subirla a Firebase Storage
            if (profileData.photoURL && profileData.photoURL.startsWith('data:image/')) {
                photoURL = await this.performImageUpload(user, profileData.photoURL);
            }

            // Actualizar perfil en Firebase Auth
            await firebaseUpdateProfile(user, {
                displayName: profileData.displayName || user.displayName,
                photoURL: photoURL !== undefined ? photoURL : user.photoURL
            });

            // Si hay un icono personalizado y no hay foto, guardarlo en Firestore
            if (profileData.customIcon && !photoURL) {
                await this.performCustomIconSave(user.uid, profileData.customIcon);
            }

            // Actualizar datos adicionales en Firestore
            await this.updateFirestoreUserDocument(user.uid, {
                displayName: profileData.displayName,
                photoURL: photoURL,
                customIcon: profileData.customIcon,
                updatedAt: new Date()
            });

        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            throw error;
        }
    }

    private async performImageUpload(user: User, base64Image: string): Promise<string> {
        try {
            // Convertir base64 a blob
            const response = await fetch(base64Image);
            const blob = await response.blob();

            // Crear referencia en Storage
            const imageRef = ref(this.firebaseConfig.storage, `profile-images/${user.uid}/avatar.jpg`);

            // Subir imagen
            const snapshot = await uploadBytes(imageRef, blob);

            // Obtener URL de descarga
            const downloadURL = await getDownloadURL(snapshot.ref);

            return downloadURL;
        } catch (error) {
            console.error('Error al subir imagen:', error);
            throw new Error('Error al subir la imagen de perfil');
        }
    }

    private async performImageRemoval(user: User): Promise<void> {
        try {
            // Actualizar perfil para remover la foto
            await firebaseUpdateProfile(user, {
                photoURL: null
            });

            // Intentar eliminar imagen del storage (opcional)
            try {
                const imageRef = ref(this.firebaseConfig.storage, `profile-images/${user.uid}/avatar.jpg`);
                await deleteObject(imageRef);
            } catch (storageError) {
                console.log('No se pudo eliminar la imagen del storage:', storageError);
            }

            // Actualizar documento en Firestore
            await this.updateFirestoreUserDocument(user.uid, {
                photoURL: null,
                updatedAt: new Date()
            });

        } catch (error) {
            console.error('Error al eliminar imagen de perfil:', error);
            throw error;
        }
    }

    private async performCustomIconSave(userId: string, iconClass: string): Promise<void> {
        try {
            const userDocRef = doc(this.firebaseConfig.firestore, 'users', userId);
            await updateDoc(userDocRef, {
                customIcon: iconClass,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error al guardar icono personalizado:', error);
            throw error;
        }
    }

    private async getFirestoreUserData(userId: string): Promise<any> {
        try {
            const userDocRef = doc(this.firebaseConfig.firestore, 'users', userId);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                return userDoc.data();
            }

            return null;
        } catch (error) {
            console.error('Error al obtener datos del usuario:', error);
            return null;
        }
    }

    private async updateFirestoreUserDocument(userId: string, data: any): Promise<void> {
        try {
            const userDocRef = doc(this.firebaseConfig.firestore, 'users', userId);
            await updateDoc(userDocRef, data);
        } catch (error) {
            console.error('Error al actualizar documento del usuario:', error);
        }
    }
}