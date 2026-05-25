namespace TECAir.Application.DTOs.Flights;

// Respuesta usada para mostrar vuelos OPEN con datos del aeropuerto de salida
// y llegada, evitando que el controller arme informacion a mano.
public class OpenFlightResponse
{
    public int FlightId { get; set; }
    public string PlanePlate { get; set; } = string.Empty;
    public string DepartureAirportName { get; set; } = string.Empty;
    public string DepartureCode { get; set; } = string.Empty;
    public string DepartureCity { get; set; } = string.Empty;
    public string ArrivalAirportName { get; set; } = string.Empty;
    public string ArrivalCode { get; set; } = string.Empty;
    public string ArrivalCity { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string? Gate { get; set; }
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
    public int Miles { get; set; }
}
