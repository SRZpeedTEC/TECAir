namespace TECAir.Application.DTOs.Itineraries;

public class CreateItineraryRequest
{
    public decimal Price { get; set; }
    public List<CreateItineraryFlightRequest> Flights { get; set; } = [];
}
