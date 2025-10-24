package pe.com.ikaza.backend.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.com.ikaza.backend.entity.Usuario;
import pe.com.ikaza.backend.repository.jpa.UsuarioRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Filtro de autenticación con Firebase
 * Intercepta requests con token Bearer y valida con Firebase Admin SDK
 * 
 * REFACTORIZADO:
 * - Eliminada dependencia directa de UsuarioService (evita creación automática)
 * - Solo valida tokens, no crea usuarios
 * - Manejo de errores mejorado
 * - Rutas públicas excluidas del filtro
 */
@Component
public class FirebaseAuthTokenFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseAuthTokenFilter.class);

    @Autowired
    private FirebaseAuth firebaseAuth;

    @Autowired
    private UsuarioRepository usuarioRepository;

    // Rutas que no requieren autenticación (se excluyen del filtro)
    private static final List<String> PUBLIC_URLS = Arrays.asList(
            "/api/auth/registro",
            "/api/auth/login",
            "/api/auth/verificar-email",
            "/api/public",
            "/api/google-maps/",
            "/api/productos",
            "/api/productos/mas-vendido",
            "/api/productos/mas-baratos",
            "/api/productos/mas-recientes",
            "/api/productos/por-agotarse",
            "/api/usuarios/sincronizar",
            "/api/usuarios/verificar",
            "/api/usuarios/firebase",
            "/api/categorias");
    
    @Override
protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain)
        throws ServletException, IOException {

    String requestURI = request.getRequestURI();
    
    // Si es ruta pública, continuar inmediatamente SIN procesar token
    if (isPublicUrl(requestURI)) {
        filterChain.doFilter(request, response);
        return;
    }

    // Extraer header Authorization
    String authHeader = request.getHeader("Authorization");

    // ✅ CAMBIO IMPORTANTE: Si no hay token, DEJAR que Spring Security maneje la auth
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
        logger.debug("🔐 No hay token Bearer - URI: {}. Spring Security manejará la auth.", requestURI);
        filterChain.doFilter(request, response);
        return;
    }

    try {
        // Extraer token
        String token = authHeader.substring(7);

        // Verificar token con Firebase Admin SDK
        FirebaseToken firebaseToken = verifyFirebaseToken(token);

        if (firebaseToken != null) {
            // Autenticar usuario en contexto de Spring Security
            authenticateUser(firebaseToken, request);
        }

    } catch (FirebaseAuthException e) {
        handleFirebaseAuthException(e, requestURI);
    } catch (Exception e) {
        handleGenericException(e, requestURI);
    }

    // Continuar con la cadena de filtros
    filterChain.doFilter(request, response);
}

    /**
     * Verificar token con Firebase Admin SDK
     */
    private FirebaseToken verifyFirebaseToken(String token) throws FirebaseAuthException {
        try {
            FirebaseToken decodedToken = firebaseAuth.verifyIdToken(token);

            logger.debug("✅ Token válido - UID: {}, Email: {}",
                    decodedToken.getUid(),
                    decodedToken.getEmail());

            return decodedToken;

        } catch (FirebaseAuthException e) {
            // Re-lanzar para manejo específico
            throw e;
        }
    }

    /**
     * Autenticar usuario en el contexto de Spring Security
     */
    private void authenticateUser(FirebaseToken firebaseToken, HttpServletRequest request) {
        String email = firebaseToken.getEmail();
        String uid = firebaseToken.getUid();

        // Verificar que no esté ya autenticado
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            return;
        }

        // Verificar que el email no sea null
        if (email == null) {
            logger.warn("⚠️ Token válido pero sin email - UID: {}", uid);
            return;
        }

        try {
            // Buscar usuario en BD
            Optional<Usuario> usuarioOpt = usuarioRepository.findByFirebaseUid(uid);

            if (usuarioOpt.isEmpty()) {
                logger.warn("⚠️ Usuario no encontrado en BD - UID: {}. Debe registrarse primero.", uid);
                return;
            }

            Usuario usuario = usuarioOpt.get();

            // Verificar que el usuario esté activo
            if (!usuario.getActivo()) {
                logger.warn("⚠️ Usuario inactivo - Email: {}", email);
                SecurityContextHolder.clearContext();
                return;
            }

            // Determinar rol del usuario
            String rol = obtenerRolUsuario(usuario, firebaseToken);

            // Crear lista de autoridades (roles)
            List<GrantedAuthority> authorities = new ArrayList<>();
            authorities.add(new SimpleGrantedAuthority(rol));

            // Crear UserDetails para Spring Security
            UserDetails userDetails = User.builder()
                    .username(email)
                    .password("") // No se usa password (Firebase lo maneja)
                    .authorities(authorities)
                    .accountExpired(false)
                    .accountLocked(!usuario.getActivo())
                    .credentialsExpired(false)
                    .disabled(!usuario.getActivo())
                    .build();

            // Crear token de autenticación
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    authorities);

            // Agregar detalles del request
            authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request));

            // Establecer autenticación en el contexto de seguridad
            SecurityContextHolder.getContext().setAuthentication(authentication);

            logger.info("✅ Usuario autenticado: {} (rol: {})", email, rol);

        } catch (Exception e) {
            logger.error("❌ Error al autenticar usuario: {}", e.getMessage());
            SecurityContextHolder.clearContext();
        }
    }

    /**
     * Obtener rol del usuario (prioriza claims de Firebase sobre BD)
     */
    private String obtenerRolUsuario(Usuario usuario, FirebaseToken firebaseToken) {
        // 1. Intentar obtener rol desde custom claims de Firebase
        Map<String, Object> claims = firebaseToken.getClaims();
        if (claims.containsKey("rol") && claims.get("rol") != null) {
            String rolFromClaims = claims.get("rol").toString();
            logger.debug("🔑 Rol obtenido de Firebase claims: {}", rolFromClaims);
            return rolFromClaims;
        }

        // 2. Obtener rol desde BD
        if (usuario.getRol() != null) {
            String rolFromBD = usuario.getRol().getNombreRol();
            logger.debug("🔑 Rol obtenido de BD: {}", rolFromBD);
            return rolFromBD;
        }

        // 3. Rol por defecto
        logger.warn("⚠️ Usuario sin rol definido, asignando CLIENTE por defecto");
        return "CLIENTE";
    }

    /**
     * Verificar si la URL es pública (no requiere autenticación)
     */
    private boolean isPublicUrl(String requestURI) {
        return PUBLIC_URLS.stream().anyMatch(requestURI::startsWith);
    }

    /**
     * Manejo de excepciones de Firebase
     */
    private void handleFirebaseAuthException(FirebaseAuthException e, String requestURI) {
        String errorCode = e.getAuthErrorCode().name();

        switch (errorCode) {
            case "EXPIRED_ID_TOKEN":
                logger.warn("⏰ Token expirado - URI: {}", requestURI);
                break;
            case "REVOKED_ID_TOKEN":
                logger.warn("🚫 Token revocado - URI: {}", requestURI);
                break;
            case "INVALID_ID_TOKEN":
                logger.warn("❌ Token inválido - URI: {}", requestURI);
                break;
            default:
                logger.error("❌ Error de Firebase Auth [{}]: {} - URI: {}",
                        errorCode, e.getMessage(), requestURI);
        }

        // Limpiar contexto de seguridad
        SecurityContextHolder.clearContext();
    }

    /**
     * Manejo de excepciones genéricas
     */
    private void handleGenericException(Exception e, String requestURI) {
        logger.error("❌ Error inesperado al validar token - URI: {}, Error: {}",
                requestURI, e.getMessage());

        // Limpiar contexto de seguridad
        SecurityContextHolder.clearContext();
    }

    /**
     * Determinar si el filtro debe ejecutarse para este request
     * (Opcional: permite excluir rutas específicas del filtro completamente)
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        boolean shouldNotFilter = PUBLIC_URLS.stream().anyMatch(path::startsWith);
        // Excluir completamente rutas públicas del filtro
        // Esto mejora el performance al no ejecutar el filtro innecesariamente
        if (shouldNotFilter) {
            logger.debug("🚫 Excluyendo del filtro: {}", path);
        } else {
            logger.debug("✅ Aplicando filtro a: {}", path);
        }
        
        return shouldNotFilter;
    }
}

/**
 * ============================================================
 * CAMBIOS PRINCIPALES DE LA REFACTORIZACIÓN
 * ============================================================
 * 
 * ✅ ELIMINADO:
 * - Dependencia directa de UsuarioService
 * - Creación automática de usuarios (obtenerOCrearPorFirebase)
 * - Logs excesivos en rutas públicas
 * 
 * ✅ MEJORADO:
 * - Uso directo de UsuarioRepository (más ligero)
 * - Separación de responsabilidades (solo autenticación)
 * - Manejo de errores más específico
 * - Logs más informativos y organizados
 * - Exclusión de rutas públicas con shouldNotFilter()
 * - Validación de usuario activo
 * - Priorización de roles (Claims > BD > Default)
 * 
 * ✅ NUEVO:
 * - Método shouldNotFilter() para excluir rutas públicas
 * - Manejo específico de errores de Firebase
 * - Validación de usuario activo antes de autenticar
 * - Mejor organización del código en métodos separados
 * 
 * ============================================================
 * FLUJO DEL FILTRO
 * ============================================================
 * 
 * 1. Request llega al filtro
 * ↓
 * 2. ¿Es ruta pública? → Sí → Skip filtro
 * ↓ No
 * 3. ¿Tiene header Authorization? → No → Continuar sin auth
 * ↓ Sí
 * 4. Extraer token Bearer
 * ↓
 * 5. Verificar token con Firebase Admin
 * ↓
 * 6. ¿Token válido? → No → Limpiar contexto y continuar
 * ↓ Sí
 * 7. ¿Usuario existe en BD? → No → Log warning y continuar
 * ↓ Sí
 * 8. ¿Usuario activo? → No → Limpiar contexto y continuar
 * ↓ Sí
 * 9. Obtener rol (Claims > BD > Default)
 * ↓
 * 10. Crear Authentication y establecer en SecurityContext
 * ↓
 * 11. Continuar con la cadena de filtros
 * 
 * ============================================================
 * DIFERENCIAS CLAVE CON LA VERSIÓN ANTERIOR
 * ============================================================
 * 
 * ANTES:
 * - Creaba usuarios automáticamente si no existían
 * - Dependía de UsuarioService (acoplamiento)
 * - Logs en TODAS las rutas
 * - Manejo de errores genérico
 * 
 * DESPUÉS:
 * - NO crea usuarios (responsabilidad de AuthService)
 * - Usa UsuarioRepository directamente (desacoplado)
 * - Logs solo en rutas protegidas
 * - Manejo de errores específico por tipo
 * - Excluye rutas públicas con shouldNotFilter()
 * - Valida usuario activo
 * 
 * ============================================================
 * NOTAS IMPORTANTES
 * ============================================================
 * 
 * 1. Este filtro NO crea usuarios nuevos
 * - Los usuarios deben registrarse vía /api/auth/registro
 * - Si el token es válido pero el usuario no existe en BD,
 * se registra un warning y NO se autentica
 * 
 * 2. Rutas públicas están excluidas
 * - No se ejecuta el filtro para /api/auth/**, /api/public/**, etc.
 * - Mejora el performance
 * 
 * 3. Prioridad de roles
 * - Firebase Custom Claims (más prioritario)
 * - Rol en BD
 * - "CLIENTE" por defecto
 * 
 * 4. Usuario inactivo
 * - Si el usuario está desactivado (activo=false),
 * NO se permite la autenticación
 * 
 * 5. Tokens expirados
 * - Firebase valida automáticamente la expiración
 * - Si el token expiró, se loguea y se limpia el contexto
 * - El usuario debe refrescar su token
 */