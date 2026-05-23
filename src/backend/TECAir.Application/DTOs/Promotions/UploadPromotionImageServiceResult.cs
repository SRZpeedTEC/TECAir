namespace TECAir.Application.DTOs.Promotions;

// Resultado del caso de uso de subida de imagen de promociones.
public class UploadPromotionImageServiceResult
{
    public bool IsSuccess { get; private init; }
    public string? ErrorMessage { get; private init; }
    public UploadPromotionImageResponse? Image { get; private init; }

    public static UploadPromotionImageServiceResult Success(UploadPromotionImageResponse image)
    {
        return new UploadPromotionImageServiceResult
        {
            IsSuccess = true,
            Image = image
        };
    }

    public static UploadPromotionImageServiceResult ValidationError(string errorMessage)
    {
        return new UploadPromotionImageServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }
}
