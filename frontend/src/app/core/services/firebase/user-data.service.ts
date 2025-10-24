// src/app/services/servicio-firebase/user-data.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { switchMap } from 'rxjs/operators';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    DocumentSnapshot,
    DocumentData
} from 'firebase/firestore';
import { User } from 'firebase/auth';

import { FirebaseConfigService } from './firebase-config.service';
import { UserData } from '@core/models/auth-firebase/user-data';

@Injectable({
    providedIn: 'root'
})
export class UserDataService {
    private firebaseConfig = inject(FirebaseConfigService);
    private readonly USERS_COLLECTION = 'users';

    /**
     * Obtener datos del usuario desde Firestore
     */
    getUserData(firebaseUser: User): Observable<UserData> {
        const userDocRef = doc(this.firebaseConfig.firestore, this.USERS_COLLECTION, firebaseUser.uid);

        return from(getDoc(userDocRef)).pipe(
            map((userDoc: DocumentSnapshot<DocumentData>) => {
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    return this.mapFirestoreToUserData(firebaseUser, data);
                } else {
                    // Si no existe el documento, crear uno con datos básicos
                    const newUserData = this.createDefaultUserData(firebaseUser);
                    this.createUserDocument(firebaseUser.uid, newUserData).subscribe();
                    return newUserData;
                }
            }),
            catchError(error => {
                console.error('Error obteniendo datos del usuario:', error);
                // En caso de error, devolver datos básicos
                return [this.createDefaultUserData(firebaseUser)];
            })
        );
    }

    /**
     * Crear documento de usuario en Firestore
     */
    createUserDocument(uid: string, userData: Partial<UserData>): Observable<void> {
        const userDocRef = doc(this.firebaseConfig.firestore, this.USERS_COLLECTION, uid);

        const firestoreData = {
            username: userData.username,
            displayName: userData.displayName,
            isAdmin: userData.isAdmin || false,
            email: userData.email,
            createdAt: new Date(),
            photoURL: userData.photoURL || null,
            customIcon: userData.customIcon || null
        };

        return from(setDoc(userDocRef, firestoreData)).pipe(
            catchError(error => {
                console.error('Error creando documento de usuario:', error);
                throw error;
            })
        );
    }

    /**
     * Actualizar datos del usuario
     */
    updateUserData(uid: string, updates: Partial<UserData>): Observable<void> {
        const userDocRef = doc(this.firebaseConfig.firestore, this.USERS_COLLECTION, uid);

        return from(updateDoc(userDocRef, {
            ...updates,
            updatedAt: new Date()
        })).pipe(
            catchError(error => {
                console.error('Error actualizando usuario:', error);
                throw error;
            })
        );
    }

    /**
     * Verificar si un usuario es administrador
     */
    checkIfUserIsAdmin(uid: string): Observable<boolean> {
        const userDocRef = doc(this.firebaseConfig.firestore, this.USERS_COLLECTION, uid);

        return from(getDoc(userDocRef)).pipe(
            map((userDoc: DocumentSnapshot<DocumentData>) => {
                if (userDoc.exists()) {
                    return userDoc.data()?.['isAdmin'] || false;
                }
                return false;
            }),
            catchError(error => {
                console.error('Error verificando rol de admin:', error);
                return [false];
            })
        );
    }

    /**
     * Actualiza directamente un documento de usuario en Firestore
     * Método adicional para operaciones específicas de perfil
     */
    updateUserDataDirect(userId: string, data: any): Observable<void> {
        const userDocRef = doc(this.firebaseConfig.firestore, this.USERS_COLLECTION, userId);

        return from(updateDoc(userDocRef, {
            ...data,
            updatedAt: new Date()
        })).pipe(
            catchError(error => {
                console.error('Error al actualizar documento del usuario:', error);
                throw error;
            })
        );
    }

    /**
     * Obtiene datos de usuario usando async/await
     */
    getUserDataAsync(userId: string): Observable<UserData | null> {
        const userDocRef = doc(this.firebaseConfig.firestore, this.USERS_COLLECTION, userId);

        return from(getDoc(userDocRef)).pipe(
            map((userDoc: DocumentSnapshot<DocumentData>) => {
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    return { uid: userId, ...data } as UserData;
                }
                return null;
            }),
            catchError(error => {
                console.error('Error al obtener datos del usuario:', error);
                throw error;
            })
        );
    }

    /**
     * Crea o actualiza datos extendidos del usuario
     */
    createOrUpdateExtendedUserData(userId: string, data: Partial<UserData>): Observable<void> {
        const userDocRef = doc(this.firebaseConfig.firestore, this.USERS_COLLECTION, userId);
        return from(getDoc(userDocRef)).pipe(
            switchMap((userDoc: DocumentSnapshot<DocumentData>) => {
                if (userDoc.exists()) {
                    // Actualizar documento existente
                    return from(updateDoc(userDocRef, {
                        ...data,
                        updatedAt: new Date()
                    }));
                } else {
                    // Crear nuevo documento
                    return from(setDoc(userDocRef, {
                        uid: userId,
                        ...data,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }));
                }
            }),
            catchError(error => {
                console.error('Error al crear/actualizar datos extendidos del usuario:', error);
                throw error;
            })
        );
    }

    /**
     * Mapear datos de Firestore a UserData
     */
    private mapFirestoreToUserData(firebaseUser: User, firestoreData: DocumentData): UserData {
        return {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            username: firestoreData['username'] || firebaseUser.displayName || firebaseUser.email!.split('@')[0],
            displayName: firestoreData['displayName'] || firebaseUser.displayName || firestoreData['username'] || firebaseUser.email!.split('@')[0],
            isAdmin: firestoreData['isAdmin'] || false,
            emailVerified: firebaseUser.emailVerified,
            photoURL: firebaseUser.photoURL || firestoreData['photoURL'] || undefined,
            customIcon: firestoreData['customIcon'] || undefined,
            createdAt: firestoreData['createdAt']?.toDate() || undefined,
            lastLogin: firestoreData['lastLogin']?.toDate() || undefined,
            updatedAt: firestoreData['updatedAt']?.toDate() || undefined,
            lastPasswordChange: firestoreData['lastPasswordChange']?.toDate() || undefined
        };
    }

    /**
     * Crear datos de usuario por defecto
     */
    private createDefaultUserData(firebaseUser: User): UserData {
        return {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            username: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
            displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
            isAdmin: false,
            emailVerified: firebaseUser.emailVerified,
            photoURL: firebaseUser.photoURL || undefined,
            createdAt: new Date()
        };
    }
}