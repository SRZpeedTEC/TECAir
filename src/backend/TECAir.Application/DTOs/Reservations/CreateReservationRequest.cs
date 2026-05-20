namespace TECAir.Application.DTOs.Reservations;

// DTO que representa la solicitud de creacion de una reservacion ya pagada.
public class CreateReservationRequest
{
    public int ItineraryId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string PassengerId { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PaymentReference { get; set; } = string.Empty;
}
