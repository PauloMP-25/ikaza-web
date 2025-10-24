package pe.com.ikaza.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.com.ikaza.backend.dto.response.AutocompleteResponse;
import pe.com.ikaza.backend.dto.response.PlaceDetailsResponse;
import pe.com.ikaza.backend.dto.response.GeocodeResponse;
import pe.com.ikaza.backend.service.GoogleMapsService;

@RestController
@RequestMapping("/api/google-maps")
public class GoogleMapsController {

    @Autowired
    private GoogleMapsService googleMapsService;

    @GetMapping("/autocomplete")
    public ResponseEntity<AutocompleteResponse> autocomplete(
            @RequestParam String input,
            @RequestParam(required = false) String country) {

        try {
            AutocompleteResponse result = googleMapsService.getAutocompletePredictions(input, country);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null); // O usa un DTO de error
        }
    }

    @GetMapping("/place-details")
    public ResponseEntity<PlaceDetailsResponse> getPlaceDetails(@RequestParam String placeId) {
        try {
            PlaceDetailsResponse result = googleMapsService.getPlaceDetails(placeId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null); // O usa un DTO de error
        }
    }

    @GetMapping("/geocode")
    public ResponseEntity<GeocodeResponse> geocode(
            @RequestParam double lat,
            @RequestParam double lng) {

        try {
            GeocodeResponse result = googleMapsService.geocodeByCoords(lat, lng);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null); // O usa un DTO de error
        }
    }
}
