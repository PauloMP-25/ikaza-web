package pe.com.ikaza.backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.core.GrantedAuthorityDefaults;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.config.Customizer;
import pe.com.ikaza.backend.security.FirebaseAuthTokenFilter;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Configuración de seguridad de Spring Security
 * Prioriza Firebase Auth, con fallback a JWT propio del backend.
 * Resuelve 403 en endpoints protegidos como /api/usuarios/direcciones.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private FirebaseAuthTokenFilter firebaseAuthTokenFilter;
    
    @Value("${cors.allowed-origins:http://localhost:4200}")
    private String allowedOrigins;


    @Bean
    public GrantedAuthorityDefaults grantedAuthorityDefaults() {
        return new GrantedAuthorityDefaults("");
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig)
            throws Exception {
        return authConfig.getAuthenticationManager();
    }

    /**
     * Configuración principal de seguridad MEJORADA
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/google-maps/**").permitAll()

                // Rutas de sincronización que deben ser públicas para el registro
                .requestMatchers("/api/usuarios/sincronizar").permitAll()
                .requestMatchers("/api/usuarios/verificar/**").permitAll()
                .requestMatchers("/api/usuarios/firebase/**").permitAll()
                .requestMatchers("/api/webhooks/**").permitAll()
                    
                // Rutas de catálogo (Productos y Categorías)
                .requestMatchers("/api/productos/**").permitAll()
                .requestMatchers("/api/categorias/**").permitAll()

                // REGLA GENERAL: Todos los endpoints bajo /api/usuarios/ requieren CLIENTE.
                //cubre: /direcciones, /perfil, /pagos, /pedidos, etc.
                .requestMatchers("/api/usuarios/**").hasAuthority("CLIENTE")
                .requestMatchers("/api/clientes/**").hasAuthority("CLIENTE")
                
                // REGLA GENERAL: Todos los endpoints bajo /api/inventario/ requieren ADMINISTRADOR.   
                .requestMatchers("api/inventario/**").hasAuthority("ADMINISTRADOR")
                
                .anyRequest().authenticated())
            .addFilterBefore(firebaseAuthTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Configuración CORS MEJORADA - Fusionada desde CorsConfig
     * Mantiene la lectura de cors.allowed-origins desde application.properties
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // ✅ MANTIENE la lectura desde properties
        List<String> originsList = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .collect(Collectors.toList());
        configuration.setAllowedOrigins(originsList);
        // ✅ MANTIENE todos los métodos y headers específicos
        configuration.setAllowedMethods(
                Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // ✅ MANTIENE los headers permitidos
        configuration.setAllowedHeaders(
                Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));

        // ✅ MANTIENE credenciales y configuración avanzada
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        configuration.setExposedHeaders(
                Arrays.asList("Authorization", "Content-Type"));
        // Aplica esta configuración a todas las rutas
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}