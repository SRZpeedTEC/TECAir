using TECAir.Application.DTOs.Promotions;

namespace TECAir.Application.Interfaces;

// Contrato que aisla la persistencia de promociones de la capa de aplicacion.
public interface IPromotionRepository
{
    Task<IReadOnlyList<PromotionResponse>> SearchAsync(
        PromotionSearchFilters filters,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PromotionResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PromotionResponse?> GetByCodeAsync(string promotionCode, CancellationToken cancellationToken = default);
    Task<PromotionResponse> CreateAsync(CreatePromotionRequest request, CancellationToken cancellationToken = default);
    Task<PromotionResponse> UpdateAsync(
        string promotionCode,
        UpdatePromotionRequest request,
        CancellationToken cancellationToken = default);
    Task DeleteAsync(string promotionCode, CancellationToken cancellationToken = default);
    Task<bool> PromotionExistsAsync(string promotionCode, CancellationToken cancellationToken = default);
    Task<bool> ItineraryExistsAsync(int itineraryId, CancellationToken cancellationToken = default);
    Task<bool> ItineraryAlreadyHasPromotionAsync(
        int itineraryId,
        string? excludingPromotionCode = null,
        CancellationToken cancellationToken = default);
}
