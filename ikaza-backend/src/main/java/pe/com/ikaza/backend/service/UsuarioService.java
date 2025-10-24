package pe.com.ikaza.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.com.ikaza.backend.dto.request.ActualizarUsuarioRequest;
import pe.com.ikaza.backend.dto.response.UsuarioResponse;
import pe.com.ikaza.backend.entity.Rol;
import pe.com.ikaza.backend.entity.Usuario;
import pe.com.ikaza.backend.repository.jpa.RolRepository;
import pe.com.ikaza.backend.repository.jpa.UsuarioRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Servicio para gestión de usuarios (CRUD y administración)
 * NO incluye lógica de autenticación (eso está en AuthService)
 */
@Service
@Transactional
public class UsuarioService {

    private static final Logger logger = LoggerFactory.getLogger(UsuarioService.class);

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    // ===============================================
    // MÉTODOS PÚBLICOS (para perfil de usuario)
    // ===============================================
    /**
     * Obtener usuario por Firebase UID
     */
    @Transactional(readOnly = true)
    public UsuarioResponse obtenerPorFirebaseUid(String firebaseUid) {
        Usuario usuario = usuarioRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con UID: " + firebaseUid));
        return convertirAResponse(usuario);
    }

    /**
     * Obtener usuario por ID
     */
    @Transactional(readOnly = true)
    public UsuarioResponse obtenerPorId(Integer id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));
        return convertirAResponse(usuario);
    }

    /**
     * Obtener usuario por email
     */
    @Transactional(readOnly = true)
    public Integer obtenerIdPorEmail(String email) {
        Usuario usuario = usuarioRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return usuario.getIdUsuario().intValue();
    }

    /**
     * Actualizar usuario (por el propio usuario)
     */
    public UsuarioResponse actualizarUsuario(String firebaseUid, ActualizarUsuarioRequest request) {
        Usuario usuario = usuarioRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        actualizarDatosUsuario(usuario, request);

        Usuario actualizado = usuarioRepository.save(usuario);
        logger.info("✅ Usuario actualizado: {}", usuario.getEmail());

        return convertirAResponse(actualizado);
    }

    /**
     * Verificar teléfono
     */
    public UsuarioResponse verificarTelefono(String firebaseUid) {
        Usuario usuario = usuarioRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        usuario.setTelefonoVerificado(true);
        Usuario actualizado = usuarioRepository.save(usuario);
        return convertirAResponse(actualizado);
    }

    // ===============================================
    // MÉTODOS ADMINISTRATIVOS
    // ===============================================

    /**
     * Listar todos los usuarios con paginación
     */
    @Transactional(readOnly = true)
    public Page<UsuarioResponse> listarUsuariosPaginados(Pageable pageable) {
        Page<Usuario> usuarios = usuarioRepository.findAll(pageable);
        return usuarios.map(this::convertirAResponse);
    }

    /**
     * Obtener todos los usuarios (sin paginación)
     */
    @Transactional(readOnly = true)
    public List<UsuarioResponse> obtenerTodos() {
        return usuarioRepository.findAll()
                .stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    /**
     * Buscar usuarios con filtros
     */
    @Transactional(readOnly = true)
    public List<UsuarioResponse> buscarUsuarios(String email, String nombre, String documento, Boolean activo) {
        List<Usuario> usuarios = usuarioRepository.findAll();

        // Aplicar filtros
        if (email != null && !email.isEmpty()) {
            usuarios = usuarios.stream()
                    .filter(u -> u.getEmail().toLowerCase().contains(email.toLowerCase()))
                    .collect(Collectors.toList());
        }

        if (nombre != null && !nombre.isEmpty()) {
            usuarios = usuarios.stream()
                    .filter(u -> u.getNombreCompleto().toLowerCase().contains(nombre.toLowerCase()))
                    .collect(Collectors.toList());
        }

        if (documento != null && !documento.isEmpty()) {
            usuarios = usuarios.stream()
                    .filter(u -> u.getNumeroDocumento() != null &&
                            u.getNumeroDocumento().contains(documento))
                    .collect(Collectors.toList());
        }

        if (activo != null) {
            usuarios = usuarios.stream()
                    .filter(u -> u.getActivo().equals(activo))
                    .collect(Collectors.toList());
        }

        return usuarios.stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtener usuarios con datos incompletos
     */
    @Transactional(readOnly = true)
    public List<UsuarioResponse> obtenerUsuariosConDatosIncompletos() {
        return usuarioRepository.findUsuariosConDatosIncompletos()
                .stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtener estadísticas de usuarios
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerEstadisticas() {
        List<Usuario> usuarios = usuarioRepository.findAll();

        Map<String, Object> stats = new HashMap<>();

        // Total de usuarios
        stats.put("totalUsuarios", usuarios.size());

        // Usuarios activos
        long activos = usuarios.stream().filter(Usuario::getActivo).count();
        stats.put("usuariosActivos", activos);

        // Usuarios inactivos
        stats.put("usuariosInactivos", usuarios.size() - activos);

        // Usuarios por rol
        Map<String, Long> usuariosPorRol = usuarios.stream()
                .collect(Collectors.groupingBy(
                        u -> u.getRol().getNombreRol(),
                        Collectors.counting()));
        stats.put("usuariosPorRol", usuariosPorRol);

        // Usuarios con datos completos
        long datosCompletos = usuarios.stream()
                .filter(this::tieneDatosCompletos)
                .count();
        stats.put("usuariosConDatosCompletos", datosCompletos);
        stats.put("usuariosConDatosIncompletos", usuarios.size() - datosCompletos);

        // Usuarios registrados hoy
        LocalDateTime hoyInicio = LocalDateTime.now().toLocalDate().atStartOfDay();
        long registradosHoy = usuarios.stream()
                .filter(u -> u.getFechaCreacion().isAfter(hoyInicio))
                .count();
        stats.put("registradosHoy", registradosHoy);

        // Usuarios registrados este mes
        LocalDateTime mesInicio = LocalDateTime.now().withDayOfMonth(1).toLocalDate().atStartOfDay();
        long registradosMes = usuarios.stream()
                .filter(u -> u.getFechaCreacion().isAfter(mesInicio))
                .count();
        stats.put("registradosMes", registradosMes);

        return stats;
    }

    /**
     * Actualizar usuario por ID (admin)
     */
    public UsuarioResponse actualizarUsuarioPorId(Integer id, ActualizarUsuarioRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));

        actualizarDatosUsuario(usuario, request);

        Usuario actualizado = usuarioRepository.save(usuario);
        logger.info("✅ Usuario actualizado por admin ID: {}", id);

        return convertirAResponse(actualizado);
    }

    /**
     * Activar usuario
     */
    public void activarUsuario(Integer id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        usuario.setActivo(true);
        usuarioRepository.save(usuario);

        logger.info("✅ Usuario activado ID: {}", id);
    }

    /**
     * Desactivar usuario
     */
    public void desactivarUsuario(Integer id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        usuario.setActivo(false);
        usuarioRepository.save(usuario);

        logger.info("🚫 Usuario desactivado ID: {}", id);
    }

    /**
     * Cambiar rol de usuario
     */
    public UsuarioResponse cambiarRol(Integer id, String nuevoRol) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Rol rol = rolRepository.findByNombreRol(nuevoRol)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado: " + nuevoRol));

        usuario.setRol(rol);
        Usuario actualizado = usuarioRepository.save(usuario);

        logger.info("🔄 Rol cambiado para usuario ID: {} a {}", id, nuevoRol);

        return convertirAResponse(actualizado);
    }

    /**
     * Eliminar usuario (desactivación lógica)
     */
    public void eliminarUsuario(Integer id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // Desactivación lógica en lugar de eliminación física
        usuario.setActivo(false);
        usuarioRepository.save(usuario);

        logger.info("🗑️ Usuario eliminado (desactivado) ID: {}", id);
    }

    // ===============================================
    // MÉTODOS AUXILIARES
    // ===============================================

    /**
     * Actualizar datos del usuario desde request
     */
    private void actualizarDatosUsuario(Usuario usuario, ActualizarUsuarioRequest request) {
        if (request.getNombres() != null && !request.getNombres().isEmpty()) {
            usuario.setNombres(request.getNombres());
        }

        if (request.getApellidos() != null && !request.getApellidos().isEmpty()) {
            usuario.setApellidos(request.getApellidos());
        }

        if (request.getTipoDocumento() != null) {
            usuario.setTipoDocumento(request.getTipoDocumento());
        }

        if (request.getNumeroDocumento() != null) {
            // Verificar duplicados
            if (!request.getNumeroDocumento().equals(usuario.getNumeroDocumento())) {
                if (usuarioRepository.existsByNumeroDocumento(request.getNumeroDocumento())) {
                    throw new RuntimeException("El número de documento ya está registrado");
                }
            }
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

        if (request.getTelefonoVerificado() != null) {
            usuario.setTelefonoVerificado(request.getTelefonoVerificado());
        }
    }

    /**
     * Convertir entidad Usuario a DTO UsuarioResponse
     */
    private UsuarioResponse convertirAResponse(Usuario usuario) {
        UsuarioResponse response = new UsuarioResponse();

        response.setIdUsuario(usuario.getIdUsuario());
        response.setFirebaseUid(usuario.getFirebaseUid());
        response.setEmail(usuario.getEmail());
        response.setNombres(usuario.getNombres());
        response.setApellidos(usuario.getApellidos());
        response.setNombreCompleto(usuario.getNombreCompleto());

        // Rol
        if (usuario.getRol() != null) {
            response.setNombreRol(usuario.getRol().getNombreRol());
            response.setIsAdmin("ADMINISTRADOR".equals(usuario.getRol().getNombreRol()));
        }

        // Datos extendidos
        response.setTipoDocumento(usuario.getTipoDocumento());
        response.setNumeroDocumento(usuario.getNumeroDocumento());
        response.setFechaNacimiento(usuario.getFechaNacimiento());
        response.setEdad(calcularEdad(usuario.getFechaNacimiento()));
        response.setPrefijoTelefono(usuario.getPrefijoTelefono());
        response.setTelefono(usuario.getTelefono());
        response.setTelefonoVerificado(usuario.getTelefonoVerificado());

        // Metadatos
        response.setActivo(usuario.getActivo());
        response.setFechaCreacion(usuario.getFechaCreacion());
        response.setUltimoAcceso(usuario.getUltimoAcceso());
        response.setFechaActualizacion(usuario.getFechaActualizacion());

        // Datos completos
        response.setDatosCompletos(tieneDatosCompletos(usuario));

        return response;
    }

    /**
     * Calcular edad desde fecha de nacimiento
     */
    private Integer calcularEdad(LocalDate fechaNacimiento) {
        if (fechaNacimiento == null)
            return null;
        return Period.between(fechaNacimiento, LocalDate.now()).getYears();
    }

    /**
     * Verificar si el usuario tiene datos completos
     */
    private boolean tieneDatosCompletos(Usuario usuario) {
        return usuario.getNumeroDocumento() != null &&
                usuario.getFechaNacimiento() != null &&
                usuario.getTelefono() != null &&
                usuario.getTelefonoVerificado() != null &&
                usuario.getTelefonoVerificado();
    }

    /**
     * Obtener usuario entity por Firebase UID (para uso interno)
     */
    @Transactional(readOnly = true)
    public Usuario findByFirebaseUid(String firebaseUid) {
        return usuarioRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con UID: " + firebaseUid));
    }
}