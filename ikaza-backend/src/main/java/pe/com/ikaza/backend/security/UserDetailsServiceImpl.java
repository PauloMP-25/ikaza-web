package pe.com.ikaza.backend.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.com.ikaza.backend.entity.Usuario;
import pe.com.ikaza.backend.repository.jpa.UsuarioRepository;

import java.util.List;

/**
 * Implementación personalizada de UserDetailsService
 * Spring Security usa esta clase para cargar usuarios durante la autenticación
 */
@Service // Indica que esta clase es un servicio de Spring
public class UserDetailsServiceImpl implements UserDetailsService {

        @Autowired // Inyección de dependencias automática
        private UsuarioRepository usuarioRepository;

        /**
         * Método que Spring Security llama para cargar un usuario por su email
         * 
         * @param email - El email del usuario (username en este caso)
         * @return UserDetails - Objeto que Spring Security entiende
         * @throws UsernameNotFoundException si el usuario no existe
         */
        @Override
        @Transactional(readOnly = true)
        // @Transactional: asegura que la operación se haga en una transacción de BD
        // readOnly = true: optimización para operaciones de solo lectura
        public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
                // Busca el usuario en la base de datos
                Usuario usuario = usuarioRepository.findByEmail(email)
                                .orElseThrow(() -> new UsernameNotFoundException(
                                                "Usuario no encontrado con email: " + email));

                // Verifica si el usuario está activo
                if (!usuario.getActivo()) {
                        throw new UsernameNotFoundException("Usuario inactivo: " + email);
                }

                // Convierte el rol del usuario a GrantedAuthority (formato de Spring Security)
                List<GrantedAuthority> authorities = List.of(
                                new SimpleGrantedAuthority(usuario.getRol().getNombreRol()));

                // Retorna un UserDetails con la información del usuario
                return org.springframework.security.core.userdetails.User.builder()
                                .username(usuario.getEmail()) // El "username" es el email
                                .password(usuario.getPassword()) // Contraseña encriptada
                                .authorities(authorities) // Lista de roles/permisos
                                .accountExpired(false)
                                .accountLocked(false)
                                .credentialsExpired(false)
                                .disabled(!usuario.getActivo()) // Si activo=false, disabled=true
                                .build();
        }

        /**
         * Método adicional para cargar usuario por ID (útil para otras operaciones)
         */
        @Transactional(readOnly = true)
        public UserDetails loadUserById(Integer id) {
                Usuario usuario = usuarioRepository.findById(id)
                                .orElseThrow(() -> new UsernameNotFoundException(
                                                "Usuario no encontrado con id: " + id));

                List<GrantedAuthority> authorities = List.of(
                                new SimpleGrantedAuthority(usuario.getRol().getNombreRol()));

                return org.springframework.security.core.userdetails.User.builder()
                                .username(usuario.getEmail())
                                .password(usuario.getPassword())
                                .authorities(authorities)
                                .disabled(!usuario.getActivo())
                                .build();
        }

        /**
         *          * NUEVO MÉTODO: Obtiene el ID del usuario a partir de su email
         * (username).
         *          * @param email - El email del usuario autenticado.
         *          * @return Long - El ID (Long) del usuario en la base de datos.
         *          
         */
        @Transactional(readOnly = true)
        public Integer getUserIdByEmail(String email) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Usuario no encontrado con email: " + email));
                // Asumimos que el ID de Usuario es de tipo Long, ya que así lo espera el controller.
                return usuario.getIdUsuario(); 
        }
}
