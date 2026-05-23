namespace TECAir.Application.DTOs.Itineraries;

// Respuesta resumida para que el frontend valide cupos antes de intentar reservar.
public class ItineraryAvailabilityResponse
{
    public int ItineraryId { get; set; }
    public int RequestedPassengers { get; set; }
    public int AvailableSeats { get; set; }
    public bool CanReserve { get; set; }
}
