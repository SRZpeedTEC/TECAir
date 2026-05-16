namespace TECAir.Application.DTOs.Flights;

// DTO recibido para actualizar unicamente el estado de un vuelo.
public class UpdateFlightStateRequest
{
    public string State { get; set; } = string.Empty;
}
