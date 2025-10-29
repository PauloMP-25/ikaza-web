// src/app/services/servicio-firebase/user-data.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, from, of, fromEventPattern } from 'rxjs';
import { map, catchError, switchMap, take } from 'rxjs/operators';
import { doc, getDoc, setDoc, updateDoc, DocumentSnapshot, DocumentData, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { User } from 'firebase/auth';

import { FirebaseConfigService } from './firebase-config.service';
import { UserData } from '@core/models/auth-firebase/auth.state.models';
/**
 * ============================================================================
 * SERVICIO DE DATOS DE USUARIO (FIRESTORE)
 * ============================================================================
 * - Gestiona la lectura (en tiempo real), creación y actualización del documento
 * extendido del usuario (UserData).
 * - Utiliza 'onSnapshot' para mantener la aplicación reactiva al estado de Firestore.
 * ============================================================================
 */
@Injectable({
    providedIn: 'root'
})
export class UserDataService {
    // ============================================================================
    // INYECCIÓN DE DEPENDENCIAS
    // ============================================================================
    private firebaseConfig = inject(FirebaseConfigService);

    // ============================================================================
    // NOMBRE DE LA COLECCION EN FIRESTORE
    // ============================================================================
    private readonly USERS_COLLECTION = 'users';

    // ============================================================================
    // LECTURA DE DATOS
    // ============================================================================

    /**
     * Obtener datos del usuario desde Firestore en tiempo real (onSnapshot).
     * @param firebaseUser El objeto User de Firebase Auth.
     * @returns Observable<UserData> que emite datos cada vez que cambian en Firestore.
     */
    getUserData(firebaseUser: User): Observable<UserData> {
        const userDocRef = doc(this.firebaseConfig.firestore, this.USERS_COLLECTION, firebaseUser.uid);

        // Usamos fromEventPattern para crear un Observable a partir de onSnapshot
        return new Observable<UserData>(observer => {
            const unsubscribe = onSnapshot(
                userDocRef,
                (userDoc: DocumentSnapshot<DocumentData>) => {
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        observer.next(this.mapFirestoreToUserData(firebaseUser, data));
                    } else {
                        // Si el documento no existe, crearlo y emitir los datos por defecto
                        const newUserData = this.createDefaultUserData(firebaseUser);
                        this.createUserDocument(firebaseUser.uid, newUserData)
                            .subscribe({
                                next: () => console.log('Documento de perfil creado por defecto.'),
                                error: (err) => console.error('Error al crear documento por defecto:', err)
                            });
                        observer.next(newUserData);
                    }
                },
                (error) => {
                    // Manejar errores fatales (como permisos insuficientes)
                    console.error('Error obteniendo datos del usuario (onSnapshot):', error);
                    // Emitir datos por defecto para no romper el flujo principal
                    observer.next(this.createDefaultUserData(firebaseUser));
                    observer.complete(); // Finalizar el stream en caso de error fatal
                }
            );
            // Devolver la función de desuscripción para limpieza
            return () => unsubscribe();
        });
    }

    // ==========================================
    // OPERACIONES CRUD (UN SOLO EVENTO)
    // ==========================================

    /**
    * Crear documento de usuario en Firestore (usado internamente o en registro).
    */
    createUserDocument(uid: string, userData: Partial<UserData>): Observable<void> {
        const userDocRef = doc(this.firebaseConfig.firestore, this.USERS_COLLECTION, uid);

        const firestoreData: Partial<DocumentData> = {
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
     * Actualizar datos del usuario (usado para lastLogin o updates del perfil).
     */
    updateUserData(uid: string, updates: Partial<UserData>): Observable<void> {
        const userDocRef = doc(this.firebaseConfig.firestore, this.USERS_COLLECTION, uid);

        return from(updateDoc(userDocRef, {
            ...updates as DocumentData,
            updatedAt: new Date()
        })).pipe(
            catchError(error => {
                // Este es el log que muestra el error crítico de permisos.
                console.error('Error actualizando usuario:', error);
                throw error;
            })
        );
    }

    // ==========================================
    // MÉTODOS AUXILIARES
    // ==========================================

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
            isAdmin: false, // Por defecto es false.
            emailVerified: firebaseUser.emailVerified,
            photoURL: firebaseUser.photoURL || undefined,
            createdAt: new Date()
        };
    }
}