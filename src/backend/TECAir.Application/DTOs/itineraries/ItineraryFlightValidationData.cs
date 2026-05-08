namespace TECAir.Application.DTOs.Itineraries;

public class ItineraryFlightValidationData
{
    public int FlightId { get; set; }
    public string DepartureAirportCode { get; set; } = string.Empty;
    public string ArrivalAirportCode { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
}
