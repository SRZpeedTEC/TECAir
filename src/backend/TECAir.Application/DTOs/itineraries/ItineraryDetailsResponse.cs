namespace TECAir.Application.DTOs.Itineraries;

// DTO de salida para el detalle completo de un itinerario.
// Agrupa el encabezado del itinerario y la lista de vuelos ordenados.
public class ItineraryDetailsResponse
{
    public int ItineraryId { get; set; }
    public decimal Price { get; set; }
    public List<ItineraryFlightResponse> Flights { get; set; } = [];
}
