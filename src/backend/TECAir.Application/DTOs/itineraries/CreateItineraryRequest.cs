namespace TECAir.Application.DTOs.Itineraries;

// DTO que representa el JSON recibido para crear un itinerario.
// La lista de vuelos se valida en ItineraryService antes de guardar.
public class CreateItineraryRequest
{
    public decimal Price { get; set; }
    public List<CreateItineraryFlightRequest> Flights { get; set; } = [];
}
