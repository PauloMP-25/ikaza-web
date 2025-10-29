// ====================================================================================================
// Mdelo central que representa al usuario logueado.
// Combina datos de Firebase (UID, email verificado) 
// con datos del backend de la aplicación (username, roles, metadatos) para el estado de la sesión. 
// Utilizado en:
// AuthStateService para gestionar el estado reactivo del usuario logueado. 
// UserDataService para leer y actualizar los datos del perfil de Firebase/Firestore.
// ===================================================================================================
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