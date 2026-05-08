namespace TECAir.Application.DTOs.Itineraries;

public class CreateItineraryResponse
{
    public int ItineraryId { get; set; }
    public decimal Price { get; set; }
    public List<CreatedItineraryFlightResponse> Flights { get; set; } = [];
}
