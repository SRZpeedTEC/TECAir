namespace TECAir.Application.DTOs.Flights;

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
