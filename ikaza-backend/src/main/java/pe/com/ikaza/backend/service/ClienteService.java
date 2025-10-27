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
import pe.com.ikaza.backend.entity.Cliente;
import pe.com.ikaza.backend.entity.Usuario;
import pe.com.ikaza.backend.repository.jpa.ClienteRepository;
import pe.com.ikaza.backend.repository.jpa.UsuarioRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Servicio para la gestión del perfil Cliente (Datos personales) y
 * Administración de Clientes.
 * Trabaja con la entidad Cliente, separada del núcleo de autenticación
 * (Usuario).
 */
@Service
@Transactional
public class ClienteService {

    private static final Logger logger = LoggerFactory.getLogger(ClienteService.class);
    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    // ===============================================
    // LÓGICA DE SINCRONIZACIÓN (Post-Registro/Login)
    // ===============================================

    /**
     * POST /api/clientes/crear-perfil-inicial
     * Crea el registro inicial en la tabla Cliente después del registro en
     * AuthService.
     * Solo debe ser llamado una vez por el frontend.
     * 
     * @param firebaseUid El UID de Firebase (obtenido del AuthResponse).
     * @return UsuarioResponse con los datos iniciales.
     */
    public UsuarioResponse crearPerfilInicial(String firebaseUid) {
        logger.info("📝 Creando perfil inicial Cliente para UID: {}", firebaseUid);

        // 1. Verificar si el Usuario existe en la tabla principal
        Usuario usuario = usuarioRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con UID: " + firebaseUid));

        // 2. Verificar si el perfil Cliente ya fue creado
        Optional<Cliente> clienteOpt = clienteRepository.findByUsuarioIdUsuario(usuario.getIdUsuario());
        if (clienteOpt.isPresent()) {
            logger.warn("⚠️ Perfil Cliente ya existe para UID: {}", firebaseUid);
            return convertirAResponse(usuario, clienteOpt.get());
        }

        // 3. Crear el registro Cliente
        Cliente nuevoCliente = new Cliente();
        nuevoCliente.setUsuario(usuario);
        nuevoCliente.setNombresCliente("Pendiente"); // Valores por defecto
        nuevoCliente.setApellidosCliente("");
        nuevoCliente.setTelefonoVerificado(false);

        Cliente clienteGuardado = clienteRepository.save(nuevoCliente);
        logger.info("✅ Perfil Cliente inicial creado para Usuario ID: {}", usuario.getIdUsuario());

        return convertirAResponse(usuario, clienteGuardado);
    }

    // ===============================================
    // MÉTODOS PÚBLICOS (para perfil de usuario)
    // ===============================================

    /**
     * GET /api/clientes/perfil/{firebaseUid}
     * Obtener perfil del usuario autenticado (combinando Usuario y Cliente).
     */
    @Transactional(readOnly = true)
    public UsuarioResponse obtenerPorFirebaseUid(String firebaseUid) {
        Usuario usuario = usuarioRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con UID: " + firebaseUid));

        Cliente cliente = clienteRepository.findByUsuarioIdUsuario(usuario.getIdUsuario())
                .orElseThrow(() -> new RuntimeException("Datos de perfil Cliente no encontrados."));

        return convertirAResponse(usuario, cliente);
    }

    /**
     * PUT /api/clientes/perfil/{firebaseUid}
     * Actualizar perfil del usuario (solo campos de Cliente).
     */
    public UsuarioResponse actualizarCliente(String firebaseUid, ActualizarUsuarioRequest request) {
        Usuario usuario = usuarioRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Cliente cliente = clienteRepository.findByUsuarioIdUsuario(usuario.getIdUsuario())
                .orElseThrow(() -> new RuntimeException("Datos de perfil Cliente no encontrados."));

        // Lógica de actualización solo aplica a la entidad Cliente
        actualizarDatosCliente(cliente, request);

        Cliente actualizado = clienteRepository.save(cliente);
        logger.info("✅ Perfil Cliente actualizado: {}", usuario.getEmail());

        return convertirAResponse(usuario, actualizado);
    }

    /**
     * PUT /api/clientes/perfil/{firebaseUid}/verificar-telefono
     * Marcar el campo 'telefonoVerificado' en la tabla Cliente como TRUE.
     */
    public UsuarioResponse verificarTelefono(String firebaseUid) {
        Usuario usuario = usuarioRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Cliente cliente = clienteRepository.findByUsuarioIdUsuario(usuario.getIdUsuario())
                .orElseThrow(() -> new RuntimeException("Datos de perfil Cliente no encontrados."));

        cliente.setTelefonoVerificado(true);
        Cliente actualizado = clienteRepository.save(cliente);
        logger.info("✅ Teléfono verificado para UID: {}", firebaseUid);
        return convertirAResponse(usuario, actualizado);
    }

    // ===============================================
    // MÉTODOS ADMINISTRATIVOS (Funcionalidad Limitada)
    // ===============================================

    /**
     * GET /api/clientes (Listar)
     * Listar todos los clientes/usuarios con paginación (Solo datos esenciales).
     */
    @Transactional(readOnly = true)
    public Page<UsuarioResponse> listarClientesPaginados(Pageable pageable) {
        // Obtenemos los registros de Usuario (base para la paginación)
        Page<Usuario> usuarios = usuarioRepository.findAll(pageable);

        // Convertimos a DTO combinando con Cliente
        return usuarios.map(usuario -> {
            Cliente cliente = clienteRepository.findByUsuarioIdUsuario(usuario.getIdUsuario())
                    .orElse(new Cliente()); // Crear un cliente vacío si no se encuentra (caso borde)
            return convertirAResponse(usuario, cliente);
        });
    }

    /**
     * PUT /api/clientes/{id}/activar (Admin)
     * Activar el usuario (campo 'activo' en la tabla Usuario).
     */
    public void activarUsuario(Integer id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));

        usuario.setActivo(true);
        usuarioRepository.save(usuario);
        // NOTA: Firebase Auth debe ser actualizado por un servicio dedicado si se
        // requiere.
        logger.info("✅ Usuario activado ID: {}", id);
    }

    /**
     * PUT /api/clientes/{id}/desactivar (Admin)
     * Desactivar el usuario (campo 'activo' en la tabla Usuario).
     */
    public void desactivarUsuario(Integer id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));

        usuario.setActivo(false);
        usuarioRepository.save(usuario);
        // NOTA: Firebase Auth debe ser actualizado por un servicio dedicado si se
        // requiere.
        logger.info("🚫 Usuario desactivado ID: {}", id);
    }

    /**
     * GET /api/clientes/buscar (Admin)
     * Buscar clientes por email, documento o teléfono (combina datos de ambas
     * tablas).
     */
    @Transactional(readOnly = true)
    public List<UsuarioResponse> buscarClientes(String email, String documento, String telefono) {

        List<Usuario> usuarios = usuarioRepository.findAll(); // Obtener todos para el filtro in-memory/stream

        List<UsuarioResponse> resultados = usuarios.stream()
                .map(usuario -> {
                    Cliente cliente = clienteRepository.findByUsuarioIdUsuario(usuario.getIdUsuario())
                            .orElse(new Cliente());
                    return new Object[] { usuario, cliente }; // Retorna un par
                })
                .filter(par -> {
                    Usuario u = (Usuario) par[0];
                    Cliente c = (Cliente) par[1];

                    boolean matchEmail = email != null && u.getEmail().toLowerCase().contains(email.toLowerCase());
                    boolean matchDocumento = documento != null && c.getNumeroDocumento() != null
                            && c.getNumeroDocumento().contains(documento);
                    boolean matchTelefono = telefono != null && c.getTelefono() != null
                            && c.getTelefono().contains(telefono);

                    // Se busca por CUALQUIERA de los campos (OR)
                    return matchEmail || matchDocumento || matchTelefono;
                })
                .map(par -> convertirAResponse((Usuario) par[0], (Cliente) par[1]))
                .collect(Collectors.toList());

        return resultados;
    }

    /**
     * GET /api/clientes/estadisticas (Admin)
     * Obtener estadísticas administrativas detalladas (demográficas, actividad,
     * etc.).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerEstadisticas() {
        // 1. Obtener datos combinados (Usuarios y Clientes)
        List<Usuario> todosUsuarios = usuarioRepository.findAll();
        long totalClientes = todosUsuarios.size();

        // 2. Contadores básicos y de actividad (desde Usuario)
        long activos = todosUsuarios.stream().filter(Usuario::getActivo).count();
        long inactivos = totalClientes - activos;

        // 3. Contadores de Perfil (desde ClienteRepository)
        Long datosIncompletos = clienteRepository.countClientesConDatosIncompletos();
        Long telefonoVerificado = clienteRepository.countClientesConTelefonoVerificado();

        // 4. Contadores demográficos (Género)
        Long varones = clienteRepository.countByGenero("HOMBRE");
        Long mujeres = clienteRepository.countByGenero("MUJER");

        // Contar otros/no especificado (opcional)
        // long otros = totalClientes - (varones + mujeres);

        // 5. Contadores por fecha (Actividad de registro)
        LocalDateTime hoyInicio = LocalDateTime.now().toLocalDate().atStartOfDay();
        long registradosHoy = todosUsuarios.stream()
                .filter(u -> u.getFechaCreacion().isAfter(hoyInicio))
                .count();

        LocalDateTime mesInicio = LocalDateTime.now().withDayOfMonth(1).toLocalDate().atStartOfDay();
        long registradosMes = todosUsuarios.stream()
                .filter(u -> u.getFechaCreacion().isAfter(mesInicio))
                .count();

        // 6. Usuarios por rol
        Map<String, Long> usuariosPorRol = todosUsuarios.stream()
                .collect(Collectors.groupingBy(
                        u -> u.getRol().getNombreRol(),
                        Collectors.counting()));

        // 7. Construir el mapa de respuesta
        Map<String, Object> stats = new HashMap<>();

        // Core y Actividad
        stats.put("usuariosTotales", totalClientes);
        stats.put("usuariosActivos", activos);
        stats.put("usuariosInactivos", inactivos);
        stats.put("usuariosRegistradosMes", registradosMes);
        stats.put("usuariosRegistradosHoy", registradosHoy);
        stats.put("usuariosPorRol", usuariosPorRol);

        // Perfil y Demografía
        stats.put("clientesConDatosIncompletos", datosIncompletos);
        stats.put("clientesConTelefonoVerificado", telefonoVerificado);
        stats.put("clientesVarones", varones);
        stats.put("clientesMujeres", mujeres);
        // stats.put("clientesOtros", otros);

        logger.info("📊 Estadísticas administrativas generadas exitosamente.");
        return stats;
    }

    // ===============================================
    // MÉTODOS AUXILIARES
    // ===============================================

    /**
     * Obtener el ID de usuario por email (necesario para DireccionController).
     */
    @Transactional(readOnly = true)
    public Integer obtenerIdPorEmail(String email) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return usuario.getIdUsuario();
    }

    /**
     * Actualizar datos del Cliente desde request (solo campos permitidos).
     */
    private void actualizarDatosCliente(Cliente cliente, ActualizarUsuarioRequest request) {
        if (request.getNombres() != null && !request.getNombres().isEmpty()) {
            cliente.setNombresCliente(request.getNombres());
        }

        if (request.getApellidos() != null && !request.getApellidos().isEmpty()) {
            cliente.setApellidosCliente(request.getApellidos());
        }

        if (request.getTipoDocumento() != null) {
            cliente.setTipoDocumento(request.getTipoDocumento());
        }

        if (request.getNumeroDocumento() != null) {
            // Verificar duplicados (solo entre Clientes)
            if (!request.getNumeroDocumento().equals(cliente.getNumeroDocumento())) {
                if (clienteRepository.existsByNumeroDocumento(request.getNumeroDocumento())) {
                    throw new RuntimeException("El número de documento ya está registrado");
                }
            }
            cliente.setNumeroDocumento(request.getNumeroDocumento());
        }

        if (request.getFechaNacimiento() != null) {
            cliente.setFechaNacimiento(request.getFechaNacimiento());
        }

        if (request.getPrefijoTelefono() != null) {
            cliente.setPrefijoTelefono(request.getPrefijoTelefono());
        }

        if (request.getTelefono() != null) {
            cliente.setTelefono(request.getTelefono());
        }

        if (request.getTelefonoVerificado() != null) {
            cliente.setTelefonoVerificado(request.getTelefonoVerificado());
        }
    }

    /**
     * Convertir entidad Usuario + Cliente a DTO UsuarioResponse.
     */
    private UsuarioResponse convertirAResponse(Usuario usuario, Cliente cliente) {
        UsuarioResponse response = new UsuarioResponse();

        // Datos de Usuario (Auth Core)
        response.setIdUsuario(usuario.getIdUsuario());
        response.setFirebaseUid(usuario.getFirebaseUid());
        response.setEmail(usuario.getEmail());

        // Rol
        if (usuario.getRol() != null) {
            response.setNombreRol(usuario.getRol().getNombreRol());
            response.setIsAdmin("ADMINISTRADOR".equals(usuario.getRol().getNombreRol()));
        }

        // Metadatos de Usuario
        response.setActivo(usuario.getActivo());
        response.setFechaCreacion(usuario.getFechaCreacion());
        response.setUltimoAcceso(usuario.getUltimoAcceso());
        // La fecha de actualización del Cliente se usará como fecha de actualización
        // del Perfil
        response.setFechaActualizacion(cliente.getFechaActualizacion());

        // Datos de Cliente (Perfil)
        response.setNombres(cliente.getNombresCliente());
        response.setApellidos(cliente.getApellidosCliente());
        response.setNombreCompleto(cliente.getNombreCompleto());
        response.setTipoDocumento(cliente.getTipoDocumento());
        response.setNumeroDocumento(cliente.getNumeroDocumento());
        response.setFechaNacimiento(cliente.getFechaNacimiento());
        response.setEdad(calcularEdad(cliente.getFechaNacimiento()));
        response.setPrefijoTelefono(cliente.getPrefijoTelefono());
        response.setTelefono(cliente.getTelefono());
        response.setTelefonoVerificado(cliente.getTelefonoVerificado());
        response.setGenero(cliente.getGenero());
        // Datos completos
        response.setDatosCompletos(tieneDatosCompletos(cliente));

        return response;
    }

    /**
     * Calcular edad desde fecha de nacimiento (copiado del auxiliar anterior)
     */
    private Integer calcularEdad(LocalDate fechaNacimiento) {
        if (fechaNacimiento == null)
            return null;
        return Period.between(fechaNacimiento, LocalDate.now()).getYears();
    }

    /**
     * Verifica si el Cliente tiene todos los datos de perfil requeridos
     */
    private boolean tieneDatosCompletos(Cliente cliente) {
        return cliente.getNumeroDocumento() != null &&
                cliente.getFechaNacimiento() != null &&
                cliente.getTelefono() != null &&
                cliente.getTelefonoVerificado() != null &&
                cliente.getTelefonoVerificado();
    }
}