package pe.com.ikaza.backend.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.com.ikaza.backend.dto.request.RegistroRequest;
import pe.com.ikaza.backend.dto.response.AuthResponse;
import pe.com.ikaza.backend.entity.Rol;
import pe.com.ikaza.backend.entity.Usuario;
import pe.com.ikaza.backend.repository.jpa.RolRepository;
import pe.com.ikaza.backend.repository.jpa.UsuarioRepository;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Servicio para gestionar autenticación con Firebase.
 * Maneja el registro con credenciales y la sincronización/login mediante tokens.
 */
@Service
@Transactional
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private FirebaseAuth firebaseAuth;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;
    // =========================================================================
    // LÓGICA DE REGISTRO
    // =========================================================================

    /**
     * Registrar nuevo usuario con email y contraseña en Firebase y sincronizar con
     * PostgreSQL (Usuario y Cliente).
     */
    public AuthResponse registrarUsuario(RegistroRequest request) throws Exception {
        logger.info("Iniciando registro para: {}", request.getEmail());

        // Verificar si el email ya existe en PostgreSQL
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("El email ya está registrado");
        }

        final String defaultNombres = "Usuario";
        final String defaultApellidos = "";

        try {
            // Crear usuario en Firebase
            UserRecord.CreateRequest firebaseRequest = new UserRecord.CreateRequest()
                    .setEmail(request.getEmail())
                    .setPassword(request.getPassword())
                    .setDisplayName(defaultNombres + " " + defaultApellidos)
                    .setEmailVerified(false)
                    .setDisabled(false);

            UserRecord userRecord = firebaseAuth.createUser(firebaseRequest);
            String firebaseUid = userRecord.getUid();

            logger.info("Usuario creado en Firebase con UID: {}", firebaseUid);

            // Asignar rol por defecto en Firebase (Custom Claims)
            Map<String, Object> claims = new HashMap<>();
            claims.put("rol", "CLIENTE");
            firebaseAuth.setCustomUserClaims(firebaseUid, claims);

            // Obtener rol por defecto (crearlo si no existe)
            Rol rolCliente = rolRepository.findByNombreRol("CLIENTE")
                    .orElseGet(() -> {
                        Rol nuevoRol = new Rol("CLIENTE", "Cliente de la tienda");
                        return rolRepository.save(nuevoRol);
                    });

            // Crear registro en tabla USUARIOS
            Usuario usuario = new Usuario();
            usuario.setFirebaseUid(firebaseUid);
            usuario.setEmail(request.getEmail());
            usuario.setActivo(true);
            usuario.setPassword("");
            usuario.setRol(rolCliente); // Asignar rol por defecto

            Usuario usuarioGuardado = usuarioRepository.save(usuario);

            logger.info("Usuario sincronizado. ID Usuario: {}", usuarioGuardado.getIdUsuario());

            // 6. Generar token personalizado para login automático
            String customToken = firebaseAuth.createCustomToken(firebaseUid);

            // 7. Construir respuesta
            return AuthResponse.builder()
                    .token(customToken)
                    .idUsuario(usuarioGuardado.getIdUsuario())
                    .firebaseUid(firebaseUid)
                    .email(usuarioGuardado.getEmail())
                    .rol(rolCliente.getNombreRol())
                    .isAdmin(false)
                    .activo(true)
                    .fechaCreacion(usuarioGuardado.getFechaCreacion())
                    .ultimoAcceso(usuarioGuardado.getUltimoAcceso())
                    .mensaje("Usuario registrado exitosamente. Complete su perfil para comprar un producto.")
                    .success(true)
                    .build();

        } catch (FirebaseAuthException e) {
            logger.error("❌ Error al crear usuario en Firebase: {}", e.getMessage());
            throw new Exception("Error al registrar usuario en Firebase: " + e.getMessage());
        }
    }

    // =========================================================================
    // LÓGICA DE LOGIN Y SINCRONIZACIÓN
    // =========================================================================

    /**
     * Iniciar sesión o sincronizar con ID Token de Firebase.
     * Centraliza el login por credenciales y proveedores sociales.
     */
    @Transactional
    public AuthResponse iniciarSesionConToken(String idToken) throws Exception {
        logger.info("Verificando ID Token de Firebase para login/sincronización...");

        // Verificar el token con Firebase Admin SDK
        FirebaseToken decodedToken;
        try {
            decodedToken = firebaseAuth.verifyIdToken(idToken);
        } catch (FirebaseAuthException e) {
            logger.error("Token de Firebase inválido: {}", e.getMessage());
            throw new IllegalArgumentException("Token inválido o expirado");
        }

        String firebaseUid = decodedToken.getUid();
        String email = decodedToken.getEmail();

        if (email == null) {
            throw new IllegalArgumentException("Token de Firebase no contiene un email válido.");
        }

        // Buscar usuario en PostgreSQL por Firebase UID
        Optional<Usuario> usuarioOpt = usuarioRepository.findByFirebaseUid(firebaseUid);
        Usuario usuario;

        if (usuarioOpt.isEmpty()) {
            logger.warn("Usuario UID {} no encontrado en BD. Intentando sincronización.", firebaseUid);
            // Sincronizar (Registro automático para Social/Google Sign-In)
            usuario = sincronizarUsuarioDesdeToken(decodedToken);
        } else {
            // Usuario ya existe en BD
            usuario = usuarioOpt.get();
        }

        // Validaciones finales
        if (!usuario.getActivo()) {
            throw new IllegalArgumentException("Usuario inactivo. Contacte al administrador.");
        }

        // Actualizar último acceso
        usuario.setUltimoAcceso(LocalDateTime.now());
        usuarioRepository.save(usuario);

        logger.info("Sincronización/Login exitoso para: {}", email);

        // Construir respuesta (usando Cliente para nombres/apellidos)
        return AuthResponse.builder()
                .token(idToken)
                .idUsuario(usuario.getIdUsuario())
                .firebaseUid(firebaseUid)
                .email(email)
                .rol(usuario.getRol().getNombreRol())
                .isAdmin("ADMINISTRADOR".equals(usuario.getRol().getNombreRol()))
                .activo(usuario.getActivo())
                .fechaCreacion(usuario.getFechaCreacion())
                .ultimoAcceso(usuario.getUltimoAcceso())
                .mensaje("Login y sincronización exitosa")
                .success(true)
                .build();
    }

    /**
     * AUXILIAR: Crea o actualiza un usuario y su registro Cliente en PostgreSQL
     * usando la información del token de Firebase. (Para Social Sign-In).
     */
    private Usuario sincronizarUsuarioDesdeToken(FirebaseToken token) {
        String firebaseUid = token.getUid();
        String email = token.getEmail();
        
        // Obtener rol por defecto (crearlo si no existe)
        Rol rolCliente = rolRepository.findByNombreRol("CLIENTE")
                .orElseGet(() -> {
                    Rol nuevoRol = new Rol("CLIENTE", "Cliente de la tienda");
                    return rolRepository.save(nuevoRol);
                });

        // Manejo de registros antiguos (sin UID de Firebase, actualiza Usuario y
        // Cliente)
        Optional<Usuario> usuarioSinUidOpt = usuarioRepository.findByEmailAndFirebaseUidIsNull(email);
        if (usuarioSinUidOpt.isPresent()) {
            Usuario usuario = usuarioSinUidOpt.get();
            usuario.setFirebaseUid(firebaseUid);
            usuario.setRol(rolCliente);
            usuarioRepository.save(usuario);

            logger.info("🔄 Registro antiguo encontrado, UID de Firebase asignado: {}", firebaseUid);
            return usuario;
        }

        // 2. Crear nuevo registro en tabla USUARIOS
        Usuario usuario = new Usuario();
        usuario.setFirebaseUid(firebaseUid);
        usuario.setEmail(email);
        usuario.setActivo(true);
        usuario.setPassword("");
        usuario.setRol(rolCliente);

        Usuario usuarioGuardado = usuarioRepository.save(usuario);

        logger.info("✅ Nuevo usuario social sincronizado (Usuario/Cliente) ID: {}", usuarioGuardado.getIdUsuario());
        return usuarioGuardado;
    }

    // =========================================================================
    // OTROS MÉTODOS (Necesitan corrección de MAPPING)
    // =========================================================================

    /**
     * Verificar si un token de Firebase es válido y recuperar los datos del
     * usuario.
     */
    public AuthResponse verificarToken(String token) throws Exception {
        try {
            logger.info("🔍 Verificando token de Firebase...");

            FirebaseToken decodedToken = firebaseAuth.verifyIdToken(token);
            String firebaseUid = decodedToken.getUid();
            String email = decodedToken.getEmail();
            Usuario usuario = usuarioRepository.findByFirebaseUid(firebaseUid)
                    .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado en la base de datos"));
            if (!usuario.getActivo())
                throw new IllegalArgumentException("Usuario inactivo");


            // Actualizar último acceso
            usuario.setUltimoAcceso(LocalDateTime.now());
            usuarioRepository.save(usuario);

            // Construir respuesta
            return AuthResponse.builder()
                    .token(token)
                    .idUsuario(usuario.getIdUsuario())
                    .firebaseUid(firebaseUid)
                    .email(email)
                    .rol(usuario.getRol().getNombreRol())
                    .isAdmin("ADMINISTRADOR".equals(usuario.getRol().getNombreRol()))
                    .activo(usuario.getActivo())
                    .fechaCreacion(usuario.getFechaCreacion())
                    .ultimoAcceso(usuario.getUltimoAcceso())
                    .mensaje("Token válido")
                    .success(true)
                    .build();

        } catch (FirebaseAuthException e) {
            logger.error("❌ Error al verificar token: {}", e.getMessage());
            throw new Exception("Token inválido o expirado");
        }
    }

    /**
     * Refrescar token (genera nuevo Custom Token)
     * Este método es útil para renovar la identidad en el backend o para servicios
     * que usan Custom Tokens.
     * * @param oldToken El token de Firebase que se quiere renovar.
     * 
     * @return AuthResponse con el nuevo Custom Token.
     * @throws Exception Si el token es inválido.
     */
    public AuthResponse refrescarToken(String oldToken) throws Exception {
        try {
            logger.info("🔄 Refrescando token...");

            // Verificar el token actual
            FirebaseToken decodedToken = firebaseAuth.verifyIdToken(oldToken);
            String firebaseUid = decodedToken.getUid();

            // Generar nuevo custom token
            String newToken = firebaseAuth.createCustomToken(firebaseUid);

            // Obtener datos del usuario
            Usuario usuario = usuarioRepository.findByFirebaseUid(firebaseUid)
                    .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            logger.info("✅ Token refrescado para UID: {}", firebaseUid);

            return AuthResponse.builder()
                    .token(newToken)
                    .idUsuario(usuario.getIdUsuario())
                    .firebaseUid(firebaseUid)
                    .email(usuario.getEmail())
                    .rol(usuario.getRol().getNombreRol())
                    .isAdmin("ADMINISTRADOR".equals(usuario.getRol().getNombreRol()))
                    .activo(usuario.getActivo())
                    .mensaje("Token refrescado exitosamente")
                    .success(true)
                    .build();

        } catch (FirebaseAuthException e) {
            logger.error("❌ Error al refrescar token: {}", e.getMessage());
            throw new Exception("Error al refrescar token");
        }
    }

    /**
     * Actualiza la marca de tiempo de último acceso del usuario en la BD.
     * * @param firebaseUid El UID de Firebase del usuario.
     */
    public void actualizarUltimoAcceso(String firebaseUid) {
        usuarioRepository.findByFirebaseUid(firebaseUid).ifPresent(usuario -> {
            usuario.setUltimoAcceso(LocalDateTime.now());
            usuarioRepository.save(usuario);
            logger.info("✅ Último acceso actualizado para UID: {}", firebaseUid);
        });
    }

    /**
     * Verifica si un email está disponible en la BD.
     * * @param email El email a verificar.
     * 
     * @return true si el email está disponible, false en caso contrario.
     */
    @Transactional(readOnly = true)
    public boolean verificarEmailDisponible(String email) {
        return !usuarioRepository.existsByEmail(email);
    }
}