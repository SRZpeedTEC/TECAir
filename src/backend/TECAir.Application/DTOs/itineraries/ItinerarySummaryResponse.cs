namespace TECAir.Application.DTOs.Itineraries;

// DTO de salida para un itinerario resumido.
// Calcula la ruta a partir del primer y ultimo vuelo asociado.
public class ItinerarySummaryResponse
{
    public int ItineraryId { get; set; }
    public decimal Price { get; set; }
    public string State { get; set; } = string.Empty;
    public string OriginCode { get; set; } = string.Empty;
    public string DestinationCode { get; set; } = string.Empty;
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
    public int TotalFlights { get; set; }
}
