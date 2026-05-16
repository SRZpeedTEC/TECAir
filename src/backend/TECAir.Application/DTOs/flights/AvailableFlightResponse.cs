namespace TECAir.Application.DTOs.Flights;

// DTO de salida para consultar vuelos disponibles sin exponer nombres internos de columnas.
public class AvailableFlightResponse
{
    public int FlightId { get; set; }
    public string PlanePlate { get; set; } = string.Empty;
    public string OriginCode { get; set; } = string.Empty;
    public string DestinationCode { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string? Gate { get; set; }
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
}
