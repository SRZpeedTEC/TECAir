namespace TECAir.Application.DTOs.Itineraries;

// DTO interno usado por ItineraryService para validar secuencias de vuelos.
// No es una respuesta directa de API; contiene solo los datos necesarios para reglas.
public class ItineraryFlightValidationData
{
    public int FlightId { get; set; }
    public string DepartureAirportCode { get; set; } = string.Empty;
    public string ArrivalAirportCode { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
}
