// ========== INTERFACES PARA LOS DTOs DEL BACKEND ==========

export interface PlacePrediction {
    description: string;
    placeId: string;
}

// DTO: AutocompleteResponse del backend
export interface AutocompleteResponse {
    predictions: {
        description: string;
        place_id: string;
    }[];
}

// DTO: PlaceDetailsResponse del backend
export interface PlaceDetailsResponse {
    result: {
        formatted_address: string;
        address_components?: any[];
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
    };
}

// DTO: GeocodeResponse del backend
export interface GeocodeResponse {
    results: {
        formatted_address: string;
        address_components?: any[];
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
    }[];
    status: string;
}