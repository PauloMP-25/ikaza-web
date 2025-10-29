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

// ====================================================================================================
// Define los cuatro estados posibles del flujo de autenticación de la aplicación 
// (LOADING, AUTHENTICATED, UNAUTHENTICATED, ERROR).
// Utilizado en:
// AuthStateService para actualizar el estado reactivo de la sesion. 
// ===================================================================================================
export enum AuthState {
    LOADING = 'loading',
    AUTHENTICATED = 'authenticated',
    UNAUTHENTICATED = 'unauthenticated',
    ERROR = 'error'
}

// ====================================================================================================
// Objeto contenedor que agrupa toda la información de la sesión: 
// - el estado actual (AuthState)
// - el objeto UserData
// - las banderas de loading y error.
// Utilizado en:
// AuthStateService para exponer el estado completo de la sesión a toda la aplicación.
// ===================================================================================================
export interface AuthStateInfo {
    state: AuthState;
    user: UserData | null;
    loading: boolean;
    error: string | null;
}