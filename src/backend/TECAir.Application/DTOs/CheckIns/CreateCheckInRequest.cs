namespace TECAir.Application.DTOs.CheckIns;

// DTO que representa el JSON recibido para crear un check-in.
public class CreateCheckInRequest
{
    public int ReservationId { get; set; }
    public int ItineraryFlightId { get; set; }
    public string PlanePlate { get; set; } = string.Empty;
    public string SeatNumber { get; set; } = string.Empty;
}
