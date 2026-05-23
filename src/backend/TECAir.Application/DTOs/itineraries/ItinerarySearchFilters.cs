namespace TECAir.Application.DTOs.Itineraries;

// Filtros normalizados para busquedas de itinerarios.
// Todos son opcionales: sin filtros, el endpoint funciona como "get all".
public class ItinerarySearchFilters
{
    public int? ItineraryId { get; set; }
    public string? DepartureCode { get; set; }
    public string? ArrivalCode { get; set; }
    public DateOnly? DepartureDate { get; set; }
    public string? Stops { get; set; }
    public string? SortBy { get; set; }
    public string? State { get; set; }
    public IReadOnlyList<string>? States { get; set; }
}
