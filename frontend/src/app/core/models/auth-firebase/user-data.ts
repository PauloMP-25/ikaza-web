export interface UserData {
    // ========================================
    // DATOS DE FIREBASE AUTH (Obligatorios)
    // ========================================
    uid: string;
    email: string;
    emailVerified: boolean;

    // ========================================
    // DATOS DE FIRESTORE (Configurables)
    // ========================================
    username: string;
    displayName?: string;
    photoURL?: string;
    customIcon?: string;
    isAdmin: boolean;

    
    // ========================================
    // METADATOS DE TRACKING
    // ========================================
    createdAt?: Date;
    lastLogin?: Date;
    updatedAt?: Date;
    lastPasswordChange?: Date;
}