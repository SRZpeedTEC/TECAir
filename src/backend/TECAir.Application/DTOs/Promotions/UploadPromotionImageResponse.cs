namespace TECAir.Application.DTOs.Promotions;

// DTO que representa la imagen subida lista para persistir en una promocion.
// ImageUrl es la ruta publica relativa devuelta por el storage; el controller
// la compone como URL absoluta antes de responder al cliente.
public class UploadPromotionImageResponse
{
    public string ImageUrl { get; set; } = string.Empty;
}
