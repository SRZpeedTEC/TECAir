namespace TECAir.Application.DTOs.Itineraries;

public class ItineraryDetailsResponse
{
    public int ItineraryId { get; set; }
    public decimal Price { get; set; }
    public List<ItineraryFlightResponse> Flights { get; set; } = [];
}
