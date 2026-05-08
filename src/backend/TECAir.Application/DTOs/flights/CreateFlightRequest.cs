namespace TECAir.Application.DTOs.Flights;

// DTO que representa el JSON recibido para crear un vuelo desde la API.
// Solo transporta datos; las reglas de validacion se aplican en FlightService.
public class CreateFlightRequest
{
    public string PlanePlate { get; set; } = string.Empty;
    public string AirportDepartsFromId { get; set; } = string.Empty;
    public string AirportArrivesToId { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string? Gate { get; set; }
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
}
