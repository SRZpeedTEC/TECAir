namespace TECAir.Application.DTOs.Promotions;

// Resultado del caso de uso de creacion de promociones.
public class CreatePromotionServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public PromotionResponse? Promotion { get; private init; }

    public static CreatePromotionServiceResult Success(PromotionResponse promotion)
    {
        return new CreatePromotionServiceResult
        {
            IsSuccess = true,
            Promotion = promotion
        };
    }

    public static CreatePromotionServiceResult ValidationError(string errorMessage)
    {
        return new CreatePromotionServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static CreatePromotionServiceResult NotFound(string errorMessage)
    {
        return new CreatePromotionServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static CreatePromotionServiceResult Conflict(string errorMessage)
    {
        return new CreatePromotionServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
