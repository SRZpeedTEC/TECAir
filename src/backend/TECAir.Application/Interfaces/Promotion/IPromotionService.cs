using TECAir.Application.DTOs.Promotions;

namespace TECAir.Application.Interfaces;

// Contrato de casos de uso de promociones que consume el controller.
public interface IPromotionService
{
    Task<IReadOnlyList<PromotionResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PromotionResponse?> GetByCodeAsync(string promotionCode, CancellationToken cancellationToken = default);
    Task<CreatePromotionServiceResult> CreateAsync(
        CreatePromotionRequest request,
        CancellationToken cancellationToken = default);
    Task<UpdatePromotionServiceResult> UpdateAsync(
        string promotionCode,
        UpdatePromotionRequest request,
        CancellationToken cancellationToken = default);
    Task<DeletePromotionServiceResult> DeleteAsync(
        string promotionCode,
        CancellationToken cancellationToken = default);
    Task<UploadPromotionImageServiceResult> UploadImageAsync(
        UploadPromotionImageRequest request,
        CancellationToken cancellationToken = default);
}
