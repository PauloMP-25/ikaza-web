// src/main/java/pe/com/ikaza/backend/service/FirebaseService.java
package pe.com.ikaza.backend.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Service
public class FirebaseService {

    @Autowired
    private FirebaseAuth firebaseAuth;

    /**
     * Asigna un rol a un usuario de Firebase vía UID
     * 
     * @param uid - UID del usuario de Firebase
     * @param rol - ej. "USUARIO" o "ADMINISTRADOR"
     */
    public void asignarRol(String uid, String rol) throws ExecutionException, InterruptedException {
        Map<String, Object> customClaims = new HashMap<>();
        customClaims.put("rol", rol); // Claim: { "rol": "ADMINISTRADOR" }

        // Setea los claims (se propaga al siguiente token en ~1h, o fuerza refresh en
        // cliente)
        firebaseAuth.setCustomUserClaimsAsync(uid, customClaims).get();

        System.out.println("✅ Rol '" + rol + "' asignado a UID: " + uid);
    }

    /**
     * Verifica el rol de un token (para testing)
     */
    public String obtenerRolDeToken(String idToken) throws Exception {
        FirebaseToken decodedToken = firebaseAuth.verifyIdToken(idToken);
        return (String) decodedToken.getClaims().get("rol");
    }
}
