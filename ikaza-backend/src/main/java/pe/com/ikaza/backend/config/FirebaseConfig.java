package pe.com.ikaza.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;

/**
 * Configuración de Firebase Admin SDK
 * Inicializa FirebaseApp y expone FirebaseAuth como bean para inyección.
 */
@Configuration
public class FirebaseConfig {

    /**
     * Inicializa FirebaseApp con el archivo JSON desde resources/.
     * Usa ClassPathResource para que funcione en runtime (después del build).
     */
    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        // Carga el archivo desde classpath:resources/ (sin "src/main/")
        Resource resource = new ClassPathResource("firebase-service-account.json");

        try (InputStream serviceAccount = resource.getInputStream()) { // Auto-cierra el stream
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();
            // Inicializa si no existe (evita errores en DevTools/hot-reload)
            if (FirebaseApp.getApps().isEmpty()) {
                return FirebaseApp.initializeApp(options);
            } else {
                return FirebaseApp.getApps().get(0); // Retorna la app existente
            }
        } catch (IOException e) {
            // Log para debug (agrega import org.slf4j.Logger si usas SLF4J)
            System.err.println("❌ Error cargando archivo Firebase JSON: " + e.getMessage());
            throw e; // Re-lanza para que Spring falle y muestre el error
        }
    }

    /**
     * Expone FirebaseAuth como bean para inyección.
     */
    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }
}
