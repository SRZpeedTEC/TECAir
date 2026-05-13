using System.Text.Json.Serialization;

namespace TECAir.Application.DTOs.Reservations;

// DTO devuelto al crear una reservacion.
// Los campos de asiento representan preferencia del pasajero, no asiento asignado.
public class ReservationResponse
{
    public int ReservationId { get; set; }
    public int ItineraryId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string PassengerId { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PaymentReference { get; set; } = string.Empty;

    public string? PlanePlate { get; set; }

    public string? SeatNumber { get; set; }
}
