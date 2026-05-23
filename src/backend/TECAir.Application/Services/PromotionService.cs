using TECAir.Application.DTOs.Promotions;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de aplicacion para promociones.
// Aqui se validan reglas de negocio antes de llamar al repositorio.
public class PromotionService(
    IPromotionRepository promotionRepository,
    IPromotionImageStorage promotionImageStorage) : IPromotionService
{
    private const long MaxImageBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".webp", ".gif"
    };

    public Task<IReadOnlyList<PromotionResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return promotionRepository.GetAllAsync(cancellationToken);
    }

    public Task<PromotionResponse?> GetByCodeAsync(
        string promotionCode,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(promotionCode))
        {
            return Task.FromResult<PromotionResponse?>(null);
        }

        return promotionRepository.GetByCodeAsync(promotionCode.Trim(), cancellationToken);
    }

    public async Task<CreatePromotionServiceResult> CreateAsync(
        CreatePromotionRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateCreatePromotionRequest(request);
        if (validationError is not null)
        {
            return CreatePromotionServiceResult.ValidationError(validationError);
        }

        var normalizedRequest = NormalizeCreatePromotionRequest(request);

        if (!await promotionRepository.ItineraryExistsAsync(normalizedRequest.ItineraryId, cancellationToken))
        {
            return CreatePromotionServiceResult.NotFound(
                $"Itinerary '{normalizedRequest.ItineraryId}' was not found.");
        }

        if (await promotionRepository.PromotionExistsAsync(normalizedRequest.PromotionCode, cancellationToken))
        {
            return CreatePromotionServiceResult.Conflict(
                $"Promotion '{normalizedRequest.PromotionCode}' already exists.");
        }

        if (await promotionRepository.ItineraryAlreadyHasPromotionAsync(
            normalizedRequest.ItineraryId,
            cancellationToken: cancellationToken))
        {
            return CreatePromotionServiceResult.Conflict(
                $"Itinerary '{normalizedRequest.ItineraryId}' already has a promotion.");
        }

        var promotion = await promotionRepository.CreateAsync(normalizedRequest, cancellationToken);
        return CreatePromotionServiceResult.Success(promotion);
    }

    public async Task<UpdatePromotionServiceResult> UpdateAsync(
        string promotionCode,
        UpdatePromotionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(promotionCode))
        {
            return UpdatePromotionServiceResult.ValidationError("Promotion code route parameter is required.");
        }

        var validationError = ValidateUpdatePromotionRequest(request);
        if (validationError is not null)
        {
            return UpdatePromotionServiceResult.ValidationError(validationError);
        }

        var normalizedCode = promotionCode.Trim();
        var normalizedRequest = NormalizeUpdatePromotionRequest(request);

        if (!await promotionRepository.PromotionExistsAsync(normalizedCode, cancellationToken))
        {
            return UpdatePromotionServiceResult.NotFound($"Promotion '{normalizedCode}' was not found.");
        }

        if (!await promotionRepository.ItineraryExistsAsync(normalizedRequest.ItineraryId, cancellationToken))
        {
            return UpdatePromotionServiceResult.NotFound(
                $"Itinerary '{normalizedRequest.ItineraryId}' was not found.");
        }

        if (await promotionRepository.ItineraryAlreadyHasPromotionAsync(
            normalizedRequest.ItineraryId,
            normalizedCode,
            cancellationToken))
        {
            return UpdatePromotionServiceResult.Conflict(
                $"Itinerary '{normalizedRequest.ItineraryId}' already has another promotion.");
        }

        var promotion = await promotionRepository.UpdateAsync(normalizedCode, normalizedRequest, cancellationToken);
        return UpdatePromotionServiceResult.Success(promotion);
    }

    public async Task<DeletePromotionServiceResult> DeleteAsync(
        string promotionCode,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(promotionCode))
        {
            return DeletePromotionServiceResult.NotFound("Promotion was not found.");
        }

        var normalizedCode = promotionCode.Trim();
        if (!await promotionRepository.PromotionExistsAsync(normalizedCode, cancellationToken))
        {
            return DeletePromotionServiceResult.NotFound($"Promotion '{normalizedCode}' was not found.");
        }

        await promotionRepository.DeleteAsync(normalizedCode, cancellationToken);
        return DeletePromotionServiceResult.Success();
    }

    public async Task<UploadPromotionImageServiceResult> UploadImageAsync(
        UploadPromotionImageRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateUploadImageRequest(request);
        if (validationError is not null)
        {
            return UploadPromotionImageServiceResult.ValidationError(validationError);
        }

        var relativeUrl = await promotionImageStorage.SaveAsync(
            request.Content,
            request.FileName,
            request.ContentType,
            cancellationToken);

        return UploadPromotionImageServiceResult.Success(new UploadPromotionImageResponse
        {
            ImageUrl = relativeUrl
        });
    }

    private static string? ValidateUploadImageRequest(UploadPromotionImageRequest request)
    {
        if (request.Length <= 0)
        {
            return "Image file is required.";
        }

        if (request.Length > MaxImageBytes)
        {
            return "Image file must not exceed 5 MB.";
        }

        var extension = Path.GetExtension(request.FileName);
        if (string.IsNullOrEmpty(extension) || !AllowedImageExtensions.Contains(extension))
        {
            return "Image format is not allowed. Use PNG, JPG, WEBP or GIF.";
        }

        if (string.IsNullOrEmpty(request.ContentType) ||
            !request.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return "Uploaded file is not a valid image.";
        }

        return null;
    }

    private static string? ValidateCreatePromotionRequest(CreatePromotionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PromotionCode))
        {
            return "Promotion code is required.";
        }

        return ValidatePromotionData(
            request.ItineraryId,
            request.ImageUrl,
            request.StartDate,
            request.EndDate,
            request.DiscountPercent,
            request.PromoPrice);
    }

    private static string? ValidateUpdatePromotionRequest(UpdatePromotionRequest request)
    {
        return ValidatePromotionData(
            request.ItineraryId,
            request.ImageUrl,
            request.StartDate,
            request.EndDate,
            request.DiscountPercent,
            request.PromoPrice);
    }

    private static string? ValidatePromotionData(
        int itineraryId,
        string? imageUrl,
        DateOnly startDate,
        DateOnly endDate,
        decimal discountPercent,
        int promoPrice)
    {
        if (itineraryId <= 0)
        {
            return "Itinerary id is required and must be greater than 0.";
        }

        if (startDate == default)
        {
            return "Start date is required.";
        }

        if (endDate == default)
        {
            return "End date is required.";
        }

        if (endDate < startDate)
        {
            return "End date cannot be earlier than start date.";
        }

        if (discountPercent <= 0 || discountPercent > 100)
        {
            return "Discount percent must be greater than 0 and less than or equal to 100.";
        }

        if (promoPrice < 0)
        {
            return "Promo price must be greater than or equal to 0.";
        }

        if (imageUrl is not null && string.IsNullOrWhiteSpace(imageUrl))
        {
            return "Image URL cannot be empty when provided.";
        }

        return null;
    }

    private static CreatePromotionRequest NormalizeCreatePromotionRequest(CreatePromotionRequest request)
    {
        return new CreatePromotionRequest
        {
            PromotionCode = request.PromotionCode.Trim(),
            ItineraryId = request.ItineraryId,
            ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            DiscountPercent = request.DiscountPercent,
            PromoPrice = request.PromoPrice
        };
    }

    private static UpdatePromotionRequest NormalizeUpdatePromotionRequest(UpdatePromotionRequest request)
    {
        return new UpdatePromotionRequest
        {
            ItineraryId = request.ItineraryId,
            ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            DiscountPercent = request.DiscountPercent,
            PromoPrice = request.PromoPrice
        };
    }
}
