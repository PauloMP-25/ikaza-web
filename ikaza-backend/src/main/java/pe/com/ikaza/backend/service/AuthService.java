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
import pe.com.ikaza.backend.dto.request.LoginRequest;
import pe.com.ikaza.backend.dto.request.RegistroRequest;
import pe.com.ikaza.backend.dto.response.AuthResponse;
import pe.com.ikaza.backend.entity.Rol;
import pe.com.ikaza.backend.entity.Usuario;
import pe.com.ikaza.backend.repository.jpa.RolRepository;
import pe.com.ikaza.backend.repository.jpa.UsuarioRepository;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Servicio para gestionar autenticación con Firebase
 * Maneja registro, login, verificación de tokens
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

    /**
     * Registrar nuevo usuario en Firebase y PostgreSQL
     */
    public AuthResponse registrarUsuario(RegistroRequest request) throws Exception {
        logger.info("🔐 Iniciando registro para: {}", request.getEmail());

        // 1. Verificar si el email ya existe en PostgreSQL
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("El email ya está registrado");
        }

        // 2. Verificar si el documento ya existe (si se proporciona)
        if (request.getNumeroDocumento() != null &&
                usuarioRepository.existsByNumeroDocumento(request.getNumeroDocumento())) {
            throw new IllegalArgumentException("El número de documento ya está registrado");
        }

        try {
            // 3. Crear usuario en Firebase
            UserRecord.CreateRequest firebaseRequest = new UserRecord.CreateRequest()
                    .setEmail(request.getEmail())
                    .setPassword(request.getPassword())
                    .setDisplayName(request.getNombres() + " " + request.getApellidos())
                    .setEmailVerified(false)
                    .setDisabled(false);

            UserRecord userRecord = firebaseAuth.createUser(firebaseRequest);
            String firebaseUid = userRecord.getUid();

            logger.info("✅ Usuario creado en Firebase con UID: {}", firebaseUid);

            // 4. Asignar rol por defecto en Firebase (Custom Claims)
            Map<String, Object> claims = new HashMap<>();
            claims.put("rol", "CLIENTE");
            firebaseAuth.setCustomUserClaims(firebaseUid, claims);

            // 5. Crear usuario en PostgreSQL
            Usuario usuario = new Usuario();
            usuario.setFirebaseUid(firebaseUid);
            usuario.setEmail(request.getEmail());
            usuario.setNombres(request.getNombres());
            usuario.setApellidos(request.getApellidos());
            usuario.setActivo(true);
            usuario.setPassword(""); // Firebase maneja la contraseña

            // Asignar rol por defecto
            Rol rolCliente = rolRepository.findByNombreRol("CLIENTE")
                    .orElseGet(() -> {
                        Rol nuevoRol = new Rol();
                        nuevoRol.setNombreRol("CLIENTE");
                        nuevoRol.setDescripcionRol("Cliente de la tienda");
                        return rolRepository.save(nuevoRol);
                    });
            usuario.setRol(rolCliente);

            // Datos opcionales
            if (request.getTipoDocumento() != null) {
                usuario.setTipoDocumento(request.getTipoDocumento());
            }
            if (request.getNumeroDocumento() != null) {
                usuario.setNumeroDocumento(request.getNumeroDocumento());
            }
            if (request.getFechaNacimiento() != null) {
                usuario.setFechaNacimiento(request.getFechaNacimiento());
            }
            if (request.getPrefijoTelefono() != null) {
                usuario.setPrefijoTelefono(request.getPrefijoTelefono());
            }
            if (request.getTelefono() != null) {
                usuario.setTelefono(request.getTelefono());
            }

            Usuario usuarioGuardado = usuarioRepository.save(usuario);

            logger.info("✅ Usuario sincronizado con PostgreSQL ID: {}", usuarioGuardado.getIdUsuario());

            // 6. Generar token personalizado para login automático
            String customToken = firebaseAuth.createCustomToken(firebaseUid);

            // 7. Construir respuesta
            return AuthResponse.builder()
                    .token(customToken)
                    .idUsuario(usuarioGuardado.getIdUsuario())
                    .firebaseUid(firebaseUid)
                    .email(usuarioGuardado.getEmail())
                    .nombres(usuarioGuardado.getNombres())
                    .apellidos(usuarioGuardado.getApellidos())
                    .nombreCompleto(usuarioGuardado.getNombreCompleto())
                    .rol("CLIENTE")
                    .isAdmin(false)
                    .activo(true)
                    .datosCompletos(tieneDatosCompletos(usuarioGuardado))
                    .fechaCreacion(usuarioGuardado.getFechaCreacion())
                    .ultimoAcceso(usuarioGuardado.getUltimoAcceso())
                    .mensaje("Usuario registrado exitosamente")
                    .success(true)
                    .build();

        } catch (FirebaseAuthException e) {
            logger.error("❌ Error al crear usuario en Firebase: {}", e.getMessage());
            throw new Exception("Error al registrar usuario en Firebase: " + e.getMessage());
        }
    }

    /**
     * Iniciar sesión con Firebase
     * Nota: Firebase Authentication maneja el login en el cliente.
     * Este método obtiene los datos del usuario desde PostgreSQL después del login.
     */
    public AuthResponse iniciarSesion(LoginRequest request) throws Exception {
        logger.info("🔐 Iniciando sesión para: {}", request.getEmail());

        // Verificar que el usuario existe en PostgreSQL
        Usuario usuario = usuarioRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        // Verificar que el usuario está activo
        if (!usuario.getActivo()) {
            throw new IllegalArgumentException("Usuario inactivo. Contacte al administrador.");
        }

        // Verificar que tiene Firebase UID
        if (usuario.getFirebaseUid() == null || usuario.getFirebaseUid().isEmpty()) {
            throw new IllegalArgumentException("Usuario no sincronizado con Firebase");
        }

        try {
            // Verificar que el usuario existe en Firebase
            UserRecord userRecord = firebaseAuth.getUser(usuario.getFirebaseUid());
            if (userRecord == null) {
                throw new IllegalArgumentException("Usuario no encontrado en Firebase");
            }

            // Generar custom token para el cliente
            //String customToken = firebaseAuth.createCustomToken(usuario.getFirebaseUid());

            // Actualizar último acceso
            usuario.setUltimoAcceso(LocalDateTime.now());
            usuarioRepository.save(usuario);

            logger.info("✅ Login exitoso para: {}", request.getEmail());

            // Construir respuesta
            return AuthResponse.builder()
                    .token(null) //customToken
                    .idUsuario(usuario.getIdUsuario())
                    .firebaseUid(usuario.getFirebaseUid())
                    .email(usuario.getEmail())
                    .nombres(usuario.getNombres())
                    .apellidos(usuario.getApellidos())
                    .nombreCompleto(usuario.getNombreCompleto())
                    .rol(usuario.getRol().getNombreRol())
                    .isAdmin("ADMINISTRADOR".equals(usuario.getRol().getNombreRol()))
                    .activo(usuario.getActivo())
                    .datosCompletos(tieneDatosCompletos(usuario))
                    .fechaCreacion(usuario.getFechaCreacion())
                    .ultimoAcceso(usuario.getUltimoAcceso())
                    .mensaje("Login exitoso")
                    .success(true)
                    .build();

        } catch (FirebaseAuthException e) {
            logger.error("❌ Error al verificar usuario en Firebase: {}", e.getMessage());
            throw new Exception("Error al iniciar sesión: " + e.getMessage());
        }
    }

    /**
     * Verificar token de Firebase
     */
    public AuthResponse verificarToken(String token) throws Exception {
        try {
            logger.info("🔍 Verificando token de Firebase...");

            // Verificar el token con Firebase
            FirebaseToken decodedToken = firebaseAuth.verifyIdToken(token);
            String firebaseUid = decodedToken.getUid();
            String email = decodedToken.getEmail();

            logger.info("✅ Token válido para UID: {}", firebaseUid);

            // Obtener usuario desde PostgreSQL
            Usuario usuario = usuarioRepository.findByFirebaseUid(firebaseUid)
                    .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado en la base de datos"));

            // Verificar que está activo
            if (!usuario.getActivo()) {
                throw new IllegalArgumentException("Usuario inactivo");
            }

            // Actualizar último acceso
            usuario.setUltimoAcceso(LocalDateTime.now());
            usuarioRepository.save(usuario);

            // Construir respuesta
            return AuthResponse.builder()
                    .token(token)
                    .idUsuario(usuario.getIdUsuario())
                    .firebaseUid(firebaseUid)
                    .email(email)
                    .nombres(usuario.getNombres())
                    .apellidos(usuario.getApellidos())
                    .nombreCompleto(usuario.getNombreCompleto())
                    .rol(usuario.getRol().getNombreRol())
                    .isAdmin("ADMINISTRADOR".equals(usuario.getRol().getNombreRol()))
                    .activo(usuario.getActivo())
                    .datosCompletos(tieneDatosCompletos(usuario))
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
     * Refrescar token (genera nuevo custom token)
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
                    .nombres(usuario.getNombres())
                    .apellidos(usuario.getApellidos())
                    .nombreCompleto(usuario.getNombreCompleto())
                    .rol(usuario.getRol().getNombreRol())
                    .isAdmin("ADMINISTRADOR".equals(usuario.getRol().getNombreRol()))
                    .activo(usuario.getActivo())
                    .datosCompletos(tieneDatosCompletos(usuario))
                    .mensaje("Token refrescado exitosamente")
                    .success(true)
                    .build();

        } catch (FirebaseAuthException e) {
            logger.error("❌ Error al refrescar token: {}", e.getMessage());
            throw new Exception("Error al refrescar token");
        }
    }

    /**
     * Actualizar último acceso
     */
    public void actualizarUltimoAcceso(String firebaseUid) {
        usuarioRepository.findByFirebaseUid(firebaseUid).ifPresent(usuario -> {
            usuario.setUltimoAcceso(LocalDateTime.now());
            usuarioRepository.save(usuario);
            logger.info("✅ Último acceso actualizado para UID: {}", firebaseUid);
        });
    }

    /**
     * Verificar si un email está disponible
     */
    @Transactional(readOnly = true)
    public boolean verificarEmailDisponible(String email) {
        return !usuarioRepository.existsByEmail(email);
    }

    /**
     * Verificar si el usuario tiene todos los datos completos
     */
    private boolean tieneDatosCompletos(Usuario usuario) {
        return usuario.getNumeroDocumento() != null &&
                usuario.getFechaNacimiento() != null &&
                usuario.getTelefono() != null &&
                usuario.getTelefonoVerificado() != null &&
                usuario.getTelefonoVerificado();
    }
}

