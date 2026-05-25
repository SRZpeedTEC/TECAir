namespace TECAir.Application.DTOs.Flights;

// DTO recibido para hacer una transicion de estado controlada sobre un vuelo.
// FlightId se toma de la ruta. El body solo lleva el estado destino.
public class UpdateFlightStateRequest
{
    public string State { get; set; } = string.Empty;
}
