namespace TECAir.Application.DTOs.Promotions;

// Resultado de busqueda de promociones con validacion de filtros.
public class PromotionSearchServiceResult
{
    public bool IsSuccess { get; private init; }
    public string? ErrorMessage { get; private init; }
    public IReadOnlyList<PromotionResponse> Promotions { get; private init; } = [];

    public static PromotionSearchServiceResult Success(IReadOnlyList<PromotionResponse> promotions)
    {
        return new PromotionSearchServiceResult
        {
            IsSuccess = true,
            Promotions = promotions
        };
    }

    public static PromotionSearchServiceResult ValidationError(string errorMessage)
    {
        return new PromotionSearchServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }
}
