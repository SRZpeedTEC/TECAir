namespace TECAir.Application.DTOs.Itineraries;

public class ItineraryFlightResponse
{
    public int FlightOrder { get; set; }
    public int FlightId { get; set; }
    public string DepartureAirportName { get; set; } = string.Empty;
    public string DepartureCode { get; set; } = string.Empty;
    public string DepartureCity { get; set; } = string.Empty;
    public string ArrivalAirportName { get; set; } = string.Empty;
    public string ArrivalCode { get; set; } = string.Empty;
    public string ArrivalCity { get; set; } = string.Empty;
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
    public string? Gate { get; set; }
    public string State { get; set; } = string.Empty;
}
