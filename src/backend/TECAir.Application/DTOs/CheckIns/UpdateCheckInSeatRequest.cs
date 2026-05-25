namespace TECAir.Application.DTOs.CheckIns;

// DTO que representa el JSON recibido para cambiar el asiento de un check-in.
public class UpdateCheckInSeatRequest
{
    public string PlanePlate { get; set; } = string.Empty;
    public string SeatNumber { get; set; } = string.Empty;
}
