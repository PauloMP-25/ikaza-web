package pe.com.ikaza.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public class PlaceDetailsResponse {
    @JsonProperty("result")
    private Result result;

    // Getters y setters
    public Result getResult() {
        return result;
    }

    public void setResult(Result result) {
        this.result = result;
    }

    public static class Result {
        @JsonProperty("formatted_address")
        private String formattedAddress;
        @JsonProperty("geometry")
        private Geometry geometry;

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

        public void setLng(double lng) {
            this.lng = lng;
        }

        public double getLng() {
            return lng;
        }

        public void setLat(double lng) {
            this.lng = lng;
        }
    }
}