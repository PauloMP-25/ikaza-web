package pe.com.ikaza.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class AutocompleteResponse {
    @JsonProperty("predictions")
    private List<Prediction> predictions;
    
    // Getters y setters
    public List<Prediction> getPredictions() { return predictions; }
    public void setPredictions(List<Prediction> predictions) { this.predictions = predictions; }
    
    public static class Prediction {
        @JsonProperty("description")
        private String description;
        @JsonProperty("place_id")
        private String placeId;
        
        // Getters y setters
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getPlaceId() { return placeId; }
        public void setPlaceId(String placeId) { this.placeId = placeId; }
    }
}