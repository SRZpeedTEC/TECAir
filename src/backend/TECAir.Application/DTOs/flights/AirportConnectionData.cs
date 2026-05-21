namespace TECAir.Application.DTOs.Flights;

// DTO interno usado por FlightService para consultar airport_connection.
// No se expone ningun endpoint publico para esta tabla de referencia.
public class AirportConnectionData
{
    public string DepartureAirportCode { get; set; } = string.Empty;
    public string ArrivalAirportCode { get; set; } = string.Empty;
    public int DistanceMiles { get; set; }
    public int EstimatedDurationMinutes { get; set; }
}
