import { AuthState } from "./auth-state";
import { UserData } from "./user-data";

export interface AuthStateInfo {
    state: AuthState;
    user: UserData | null;
    loading: boolean;
    error: string | null;
}