package pe.com.ikaza.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.com.ikaza.backend.dto.request.DireccionRequest;
import pe.com.ikaza.backend.dto.response.DireccionResponse;
import pe.com.ikaza.backend.entity.Direccion;
import pe.com.ikaza.backend.repository.jpa.DireccionRepository;

import java.util.List;
import java.util.stream.Collectors;
import pe.com.ikaza.backend.exception.ResourceNotFoundException;

@Service
public class DireccionService {

    @Autowired
    private DireccionRepository direccionRepository;

    /**
     * Convierte Entity a Response DTO.
     */
    private DireccionResponse toResponse(Direccion entity) {
        DireccionResponse response = new DireccionResponse();
        response.setIdDireccion(entity.getIdDireccion());
        response.setAlias(entity.getAlias());
        response.setPais(entity.getPais());
        response.setDireccion(entity.getDireccion());
        response.setDistrito(entity.getDistrito());
        response.setProvincia(entity.getProvincia());
        response.setRegion(entity.getRegion());
        response.setReferencia(entity.getReferencia());
        response.setCodigoPostal(entity.getCodigoPostal());
        response.setEsPrincipal(entity.getEsPrincipal());
        response.setLatitud(entity.getLatitud());
        response.setLongitud(entity.getLongitud());
        response.setFechaCreacion(entity.getFechaCreacion());
        return response;
    }

    /**
     * Convierte Request DTO a Entity. Agregado setPais y mapeo postal si existe.
     */
    private Direccion toEntity(DireccionRequest request, Integer idUsuario) {
        Direccion entity = new Direccion();
        entity.setIdUsuario(idUsuario);
        entity.setAlias(request.getAlias());
        entity.setDireccion(request.getDireccion());
        entity.setDistrito(request.getDistrito());
        entity.setProvincia(request.getProvincia());
        entity.setRegion(request.getRegion());
        entity.setReferencia(request.getReferencia());
        entity.setPais(request.getPais());
        entity.setCodigoPostal(request.getCodigoPostal());
        entity.setEsPrincipal(request.getEsPrincipal() != null ? request.getEsPrincipal() : false);
        entity.setLatitud(request.getLatitud());
        entity.setLongitud(request.getLongitud());
        return entity;
    }

    /**
     * Carga todas las direcciones de un usuario.
     */
    public List<DireccionResponse> cargarDirecciones(Integer idUsuario) {
        return direccionRepository.findByIdUsuario(idUsuario).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Guarda una nueva dirección. @Transactional y manejo de excepción.
     */
    @Transactional
    public DireccionResponse guardarDireccion(Integer idUsuario, DireccionRequest request) {
        try {
            if (request.getEsPrincipal() != null && request.getEsPrincipal()) {
                direccionRepository.desmarcarTodasPrincipales(idUsuario);
            }
            
            Direccion direccion = toEntity(request, idUsuario);
            Direccion guardada = direccionRepository.save(direccion);
            return toResponse(guardada);
        } catch (DataIntegrityViolationException e) {
            if (e.getMessage().contains("pais") || e.getMessage().contains("codigo_postal")) {  // ← Actualizado: Incluye codigo_postal si viola
                throw new IllegalArgumentException("Campos obligatorios faltantes: " + (e.getMessage().contains("pais") ? "'pais'" : "'codigo_postal'") + " no puede ser nulo.");
            }
            throw new IllegalArgumentException("Error de integridad en la base de datos: " + e.getMessage());
        }
    }

    /**
     * Actualiza una dirección existente.
     */
    @Transactional
    public DireccionResponse actualizarDireccion(Integer idDireccion, Integer idUsuario, DireccionRequest request) {
        Direccion existente = direccionRepository.findByIdDireccionAndIdUsuario(idDireccion, idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Dirección no encontrada para este usuario."));

        // Actualizar campos
        if (request.getAlias() != null) existente.setAlias(request.getAlias());
        if (request.getDireccion() != null) existente.setDireccion(request.getDireccion());
        if (request.getDistrito() != null) existente.setDistrito(request.getDistrito());
        if (request.getProvincia() != null) existente.setProvincia(request.getProvincia());
        if (request.getRegion() != null) existente.setRegion(request.getRegion());
        if (request.getReferencia() != null) existente.setReferencia(request.getReferencia());
        if (request.getPais() != null) existente.setPais(request.getPais());
        if (request.getCodigoPostal() != null) existente.setCodigoPostal(request.getCodigoPostal());
        if (request.getEsPrincipal() != null) existente.setEsPrincipal(request.getEsPrincipal());
        if (request.getLatitud() != null) existente.setLatitud(request.getLatitud());
        if (request.getLongitud() != null) existente.setLongitud(request.getLongitud());

        Direccion actualizada = direccionRepository.save(existente);
        return toResponse(actualizada);
    }

    /**
     * Actualiza una dirección existente marcándola como principal. ← FIX: getDireccion() y setPais
     */
    @Transactional
    public DireccionResponse actualizarDireccionPrincipal(Integer idDireccion, Integer idUsuario, DireccionRequest request) {
        Direccion existente = direccionRepository.findByIdDireccionAndIdUsuario(idDireccion, idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Dirección no encontrada para este usuario."));

        if (request.getEsPrincipal() != null && request.getEsPrincipal()) {
            direccionRepository.desmarcarTodasPrincipales(idUsuario);
            existente.setEsPrincipal(true);
        } else {
            existente.setEsPrincipal(request.getEsPrincipal() != null ? request.getEsPrincipal() : existente.getEsPrincipal());
        }

        // Actualizar otros campos condicionalmente
        if (request.getAlias() != null) existente.setAlias(request.getAlias());
        if (request.getDireccion() != null) existente.setDireccion(request.getDireccion());
        if (request.getDistrito() != null) existente.setDistrito(request.getDistrito());
        if (request.getProvincia() != null) existente.setProvincia(request.getProvincia());
        if (request.getRegion() != null) existente.setRegion(request.getRegion());
        if (request.getReferencia() != null) existente.setReferencia(request.getReferencia());
        if (request.getPais() != null) existente.setPais(request.getPais());
        if (request.getCodigoPostal() != null) existente.setCodigoPostal(request.getCodigoPostal());
        if (request.getLatitud() != null) existente.setLatitud(request.getLatitud());
        if (request.getLongitud() != null) existente.setLongitud(request.getLongitud());

        // Validación de integridad
        int principalesCount = direccionRepository.countDireccionesPrincipales(idUsuario);
        if (principalesCount > 1) {
            throw new IllegalStateException("Error de integridad: se detectaron múltiples direcciones principales");
        }

        Direccion actualizada = direccionRepository.save(existente);
        return toResponse(actualizada);
    }

    /**
     * Elimina una dirección.
     */
    public void eliminarDireccion(Integer idDireccion, Integer idUsuario) {
        Direccion existente = direccionRepository.findByIdDireccionAndIdUsuario(idDireccion, idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Dirección no encontrada para este usuario."));

        direccionRepository.delete(existente);
    }
}
