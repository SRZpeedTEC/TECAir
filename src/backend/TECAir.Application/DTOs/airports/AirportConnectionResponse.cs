namespace TECAir.Application.DTOs.Airports;

// DTO publico para exponer los datos de una conexion entre aeropuertos.
// Lo usan los flujos del frontend que necesitan calcular hora de llegada
// estimada antes de crear o editar un vuelo.
public class AirportConnectionResponse
{
    public string DepartureAirportCode { get; set; } = string.Empty;
    public string ArrivalAirportCode { get; set; } = string.Empty;
    public int DistanceMiles { get; set; }
    public int EstimatedDurationMinutes { get; set; }
}
