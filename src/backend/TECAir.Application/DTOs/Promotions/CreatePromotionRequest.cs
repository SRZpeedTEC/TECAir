namespace TECAir.Application.DTOs.Promotions;

// DTO que representa el JSON recibido para crear una promocion.
public class CreatePromotionRequest
{
    public string PromotionCode { get; set; } = string.Empty;
    public int ItineraryId { get; set; }
    public string? ImageUrl { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal DiscountPercent { get; set; }
    public int PromoPrice { get; set; }
}
