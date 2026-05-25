namespace TECAir.Application.DTOs.Promotions;

// Resultado del caso de uso de actualizacion de promociones.
public class UpdatePromotionServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public PromotionResponse? Promotion { get; private init; }

    public static UpdatePromotionServiceResult Success(PromotionResponse promotion)
    {
        return new UpdatePromotionServiceResult
        {
            IsSuccess = true,
            Promotion = promotion
        };
    }

    public static UpdatePromotionServiceResult ValidationError(string errorMessage)
    {
        return new UpdatePromotionServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static UpdatePromotionServiceResult NotFound(string errorMessage)
    {
        return new UpdatePromotionServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static UpdatePromotionServiceResult Conflict(string errorMessage)
    {
        return new UpdatePromotionServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
