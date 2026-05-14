namespace TECAir.Application.DTOs.Promotions;

// Resultado del borrado de promociones.
public class DeletePromotionServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }

    public static DeletePromotionServiceResult Success()
    {
        return new DeletePromotionServiceResult
        {
            IsSuccess = true
        };
    }

    public static DeletePromotionServiceResult NotFound(string errorMessage)
    {
        return new DeletePromotionServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static DeletePromotionServiceResult Conflict(string errorMessage)
    {
        return new DeletePromotionServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
