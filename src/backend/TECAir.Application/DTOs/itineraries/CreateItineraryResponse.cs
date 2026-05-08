namespace TECAir.Application.DTOs.Itineraries;

// DTO de salida despues de crear un itinerario.
// Devuelve el encabezado y los vuelos ya asociados en la base.
public class CreateItineraryResponse
{
    public int ItineraryId { get; set; }
    public decimal Price { get; set; }
    public List<CreatedItineraryFlightResponse> Flights { get; set; } = [];
}
