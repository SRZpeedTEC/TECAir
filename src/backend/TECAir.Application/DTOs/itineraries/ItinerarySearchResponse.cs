namespace TECAir.Application.DTOs.Itineraries;

public class ItinerarySearchResponse
{
    public int ItineraryId { get; set; }
    public decimal Price { get; set; }
    public string OriginCode { get; set; } = string.Empty;
    public string DestinationCode { get; set; } = string.Empty;
    public int TotalFlights { get; set; }
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
}
