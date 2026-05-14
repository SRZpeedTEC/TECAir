using System.Drawing;
using TECAir.Application.DTOs.Baggages;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de aplicacion para maletas.
// Valida datos y existencia de check-in antes de persistir.
public class BaggageService(IBaggageRepository baggageRepository) : IBaggageService
{
    public Task<BaggageResponse?> GetByBagNumberAsync(
        int bagNumber,
        CancellationToken cancellationToken = default)
    {
        if (bagNumber <= 0)
        {
            return Task.FromResult<BaggageResponse?>(null);
        }

        return baggageRepository.GetByBagNumberAsync(bagNumber, cancellationToken);
    }

    public async Task<GetBaggagesByCheckInServiceResult> GetByConfirmationNumberAsync(
        int confirmationNumber,
        CancellationToken cancellationToken = default)
    {
        if (confirmationNumber <= 0)
        {
            return GetBaggagesByCheckInServiceResult.NotFound("Check-in was not found.");
        }

        if (!await baggageRepository.CheckInExistsAsync(confirmationNumber, cancellationToken))
        {
            return GetBaggagesByCheckInServiceResult.NotFound(
                $"Check-in '{confirmationNumber}' was not found.");
        }

        var baggages = await baggageRepository.GetByConfirmationNumberAsync(confirmationNumber, 
        cancellationToken);
        return GetBaggagesByCheckInServiceResult.Success(baggages);
    }

    public async Task<CreateBaggageServiceResult> CreateAsync(
        CreateBaggageRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateCreateBaggageRequest(request);
        if (validationError is not null)
        {
            return CreateBaggageServiceResult.ValidationError(validationError);
        }

        var normalizedRequest = NormalizeCreateBaggageRequest(request);

        if (!await baggageRepository.CheckInExistsAsync(normalizedRequest.ConfirmationNumber, cancellationToken))
        {
            return CreateBaggageServiceResult.NotFound(
                $"Check-in '{normalizedRequest.ConfirmationNumber}' was not found.");
        }

        var baggage = await baggageRepository.CreateAsync(normalizedRequest, cancellationToken);
        return CreateBaggageServiceResult.Success(baggage);
    }

    public async Task<UpdateBaggageServiceResult> UpdateAsync(
        int bagNumber,
        UpdateBaggageRequest request,
        CancellationToken cancellationToken = default)
    {
        if (bagNumber <= 0)
        {
            return UpdateBaggageServiceResult.NotFound("Baggage was not found.");
        }

        var validationError = ValidateUpdateBaggageRequest(request);
        if (validationError is not null)
        {
            return UpdateBaggageServiceResult.ValidationError(validationError);
        }

        if (!await baggageRepository.BaggageExistsAsync(bagNumber, cancellationToken))
        {
            return UpdateBaggageServiceResult.NotFound($"Baggage '{bagNumber}' was not found.");
        }

        var baggage = await baggageRepository.UpdateAsync(
            bagNumber,
            NormalizeUpdateBaggageRequest(request),
            cancellationToken);
        return UpdateBaggageServiceResult.Success(baggage);
    }

    public async Task<DeleteBaggageServiceResult> DeleteAsync(
        int bagNumber,
        CancellationToken cancellationToken = default)
    {
        if (bagNumber <= 0)
        {
            return DeleteBaggageServiceResult.NotFound("Baggage was not found.");
        }

        if (!await baggageRepository.BaggageExistsAsync(bagNumber, cancellationToken))
        {
            return DeleteBaggageServiceResult.NotFound($"Baggage '{bagNumber}' was not found.");
        }

        await baggageRepository.DeleteAsync(bagNumber, cancellationToken);
        return DeleteBaggageServiceResult.Success();
    }

    private static string? ValidateCreateBaggageRequest(CreateBaggageRequest request)
    {
        if (request.ConfirmationNumber <= 0)
        {
            return "Confirmation number is required and must be greater than 0.";
        }

        return ValidateBaggageData(request.Weight, request.Color);
    }

    private static string? ValidateUpdateBaggageRequest(UpdateBaggageRequest request)
    {
        return ValidateBaggageData(request.Weight, request.Color);
    }

    private static string? ValidateBaggageData(decimal weight, string color)
    {
        if (weight <= 0 || weight > 32)
        {
            return "Weight must be greater than 0 and less than or equal to 32.";
        }

        if (string.IsNullOrWhiteSpace(color))
        {
            return "Color is required.";
        }

        return null;
    }

    private static CreateBaggageRequest NormalizeCreateBaggageRequest(CreateBaggageRequest request)
    {
        return new CreateBaggageRequest
        {
            ConfirmationNumber = request.ConfirmationNumber,
            Weight = request.Weight,
            Color = NormalizeColor(request.Color)
        };
    }

    private static UpdateBaggageRequest NormalizeUpdateBaggageRequest(UpdateBaggageRequest request)
    {
        return new UpdateBaggageRequest
        {
            Weight = request.Weight,
            Color = NormalizeColor(request.Color)
        };
    }


    private static string NormalizeColor(string color)
    {
        return color.Trim();
    }
}
