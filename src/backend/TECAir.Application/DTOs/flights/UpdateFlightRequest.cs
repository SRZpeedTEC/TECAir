namespace TECAir.Application.DTOs.Flights;

// DTO recibido para actualizar un vuelo.
// FlightId se excluye del body porque la llave primaria se controla desde la ruta.
public class UpdateFlightRequest
{
    public string PlanePlate { get; set; } = string.Empty;
    public string AirportDepartsFromId { get; set; } = string.Empty;
    public string AirportArrivesToId { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string? Gate { get; set; }
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
}
