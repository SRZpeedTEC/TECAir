namespace TECAir.Application.DTOs.Promotions;

// Filtros normalizados para busqueda de promociones.
// Todos son opcionales: sin filtros, el endpoint funciona como "get all".
public class PromotionSearchFilters
{
    public string? PromotionCode { get; set; }
    public int? ItineraryId { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool? ActiveOnly { get; set; }
    public bool? ExpiredOnly { get; set; }
    public bool? UpcomingOnly { get; set; }
}
