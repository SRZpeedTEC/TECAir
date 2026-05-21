namespace TECAir.Application.DTOs.Flights;

// DTO de salida para devolver un vuelo creado o consultado con los campos
// principales que vienen de la tabla flight.
public class FlightResponse
{
    public int FlightId { get; set; }
    public string PlanePlate { get; set; } = string.Empty;
    public string AirportDepartsFromId { get; set; } = string.Empty;
    public string AirportArrivesToId { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string? Gate { get; set; }
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
    public int Miles { get; set; }
}
