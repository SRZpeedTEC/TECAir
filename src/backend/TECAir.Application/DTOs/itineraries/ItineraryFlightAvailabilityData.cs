namespace TECAir.Application.DTOs.Itineraries;

// Datos internos para calcular disponibilidad por cada vuelo del itinerario.
public class ItineraryFlightAvailabilityData
{
    public int FlightId { get; set; }
    public string FlightState { get; set; } = string.Empty;
    public string PlanePlate { get; set; } = string.Empty;
    public int PlaneCapacity { get; set; }
    public int ReservedSeats { get; set; }
    public int AvailableSeats { get; set; }
}
