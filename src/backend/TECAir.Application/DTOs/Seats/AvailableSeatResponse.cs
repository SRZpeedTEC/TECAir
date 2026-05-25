namespace TECAir.Application.DTOs.Seats;

// DTO de salida para asientos disponibles de un vuelo.
// Aunque el endpoint solo devuelve asientos libres, el campo deja explicita la disponibilidad para el cliente.
public class AvailableSeatResponse
{
    public string PlanePlate { get; set; } = string.Empty;
    public string SeatNumber { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
}
