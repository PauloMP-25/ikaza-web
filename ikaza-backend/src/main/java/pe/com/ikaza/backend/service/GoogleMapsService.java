package pe.com.ikaza.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import pe.com.ikaza.backend.dto.response.AutocompleteResponse;
import pe.com.ikaza.backend.dto.response.PlaceDetailsResponse; 
import pe.com.ikaza.backend.dto.response.GeocodeResponse; 

@Service
public class GoogleMapsService {

    @Value("${google.maps.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate;

    public GoogleMapsService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Autocompletado de direcciones
     */
    public AutocompleteResponse getAutocompletePredictions(String input, String countryCode) {
        String url = UriComponentsBuilder.fromUriString("https://maps.googleapis.com/maps/api/place/autocomplete/json")
                .queryParam("input", input)
                .queryParam("key", apiKey)
                .queryParam("components", countryCode != null ? "country:" + countryCode : "")
                .toUriString();

        try {
            return restTemplate.getForObject(url, AutocompleteResponse.class); // Usa el DTO
        } catch (Exception e) {
            throw new RuntimeException("Error calling Google Maps API", e);
        }
    }

    /**
     * Detalles de un lugar por Place ID
     */
    public PlaceDetailsResponse getPlaceDetails(String placeId) {
        String url = UriComponentsBuilder.fromUriString("https://maps.googleapis.com/maps/api/place/details/json")
                .queryParam("place_id", placeId)
                .queryParam("key", apiKey)
                .queryParam("fields", "formatted_address,address_components,geometry,place_id")
                .toUriString();

        try {
            return restTemplate.getForObject(url, PlaceDetailsResponse.class); // Usa el DTO
        } catch (Exception e) {
            throw new RuntimeException("Error calling Google Maps Details API", e);
        }
    }

    /**
     * Geocodificación inversa
     */
    public GeocodeResponse geocodeByCoords(double lat, double lng) {
        String url = UriComponentsBuilder.fromUriString("https://maps.googleapis.com/maps/api/geocode/json")
                .queryParam("latlng", lat + "," + lng)
                .queryParam("key", apiKey)
                .toUriString();

        try {
            return restTemplate.getForObject(url, GeocodeResponse.class); // Usa el DTO
        } catch (Exception e) {
            throw new RuntimeException("Error calling Google Geocoding API", e);
        }
    }
}