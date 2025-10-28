// ====================================================================================================
// DTO enfocado en la actualización de campos básicos de perfil de visualización (ej. displayName, photoURL), 
// usados generalmente en la integración con Firebase.
// Utilizado en: ProfileComponent (datos del formulario de actualización básica).
// ===================================================================================================
export interface ProfileUpdateData {
    displayName?: string;
    photoURL?: string | null;
    customIcon?: string | null;
}
