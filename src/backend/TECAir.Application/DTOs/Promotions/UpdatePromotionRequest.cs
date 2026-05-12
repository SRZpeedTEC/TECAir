namespace TECAir.Application.DTOs.Promotions;

// DTO que representa el JSON recibido para actualizar una promocion.
// El codigo no se incluye porque es la llave primaria y viene de la ruta.
public class UpdatePromotionRequest
{
    public int ItineraryId { get; set; }
    public string? ImageUrl { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal DiscountPercent { get; set; }
    public int PromoPrice { get; set; }
}
