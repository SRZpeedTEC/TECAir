namespace TECAir.Application.DTOs.CheckIns;

// DTO que representa un check-in expuesto por la API.
public class CheckInResponse
{
    public int ConfirmationNumber { get; set; }
    public int ReservationId { get; set; }
    public int ItineraryFlightId { get; set; }
    public string PlanePlate { get; set; } = string.Empty;
    public string SeatNumber { get; set; } = string.Empty;
}
