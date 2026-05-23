namespace TECAir.Application.DTOs.Flights;

// Filtros normalizados para GET /api/flights.
// Si todos vienen vacios, se devuelven todos los vuelos.
public class FlightSearchFilters
{
    public int? FlightId { get; set; }
    public string? DepartureCode { get; set; }
    public string? ArrivalCode { get; set; }
    public string? State { get; set; }
    public DateOnly? DepartureDate { get; set; }
}
