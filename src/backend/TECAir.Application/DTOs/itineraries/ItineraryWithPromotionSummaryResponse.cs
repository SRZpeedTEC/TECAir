using TECAir.Application.DTOs.Promotions;

namespace TECAir.Application.DTOs.Itineraries;

// DTO de salida para la vista cliente, con promocion activa opcional.
public class ItineraryWithPromotionSummaryResponse : ItinerarySummaryResponse
{
    public PromotionResponse? Promotion { get; set; }
}
