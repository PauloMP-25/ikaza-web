package pe.com.ikaza.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class GeocodeResponse {
    @JsonProperty("results")
    private List<GeocodeResult> results;

    @JsonProperty("status")
    private String status;

    // Getters y setters
    public List<GeocodeResult> getResults() {
        return results;
    }

    public void setResults(List<GeocodeResult> results) {
        this.results = results;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public static class GeocodeResult {
        @JsonProperty("formatted_address")
        private String formattedAddress;

        @JsonProperty("geometry")
        private Geometry geometry;

        // Puedes agregar más campos según necesites, como place_id, etc.

        // Getters y setters
        public String getFormattedAddress() {
            return formattedAddress;
        }

        public void setFormattedAddress(String formattedAddress) {
            this.formattedAddress = formattedAddress;
        }

        public Geometry getGeometry() {
            return geometry;
        }

        public void setGeometry(Geometry geometry) {
            this.geometry = geometry;
        }
    }

    public static class Geometry {
        @JsonProperty("location")
        private Location location;

        // Getters y setters
        public Location getLocation() {
            return location;
        }

        public void setLocation(Location location) {
            this.location = location;
        }
    }

    public static class Location {
        @JsonProperty("lat")
        private double lat;

        @JsonProperty("lng")
        private double lng;

        // Getters y setters
        public double getLat() {
            return lat;
        }

        public void setLat(double lat) {
            this.lat = lat;
        }

        public double getLng() {
            return lng;
        }

        public void setLng(double lng) {
            this.lng = lng;
        }
    }
}
