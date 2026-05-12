using TECAir.Application.DTOs.Baggages;

namespace TECAir.Application.Interfaces;

// Contrato de casos de uso de maletas que consume el controller.
public interface IBaggageService
{
    Task<BaggageResponse?> GetByBagNumberAsync(int bagNumber, CancellationToken cancellationToken = default);
    Task<GetBaggagesByCheckInServiceResult> GetByConfirmationNumberAsync(
        int confirmationNumber,
        CancellationToken cancellationToken = default);
    Task<CreateBaggageServiceResult> CreateAsync(
        CreateBaggageRequest request,
        CancellationToken cancellationToken = default);
    Task<UpdateBaggageServiceResult> UpdateAsync(
        int bagNumber,
        UpdateBaggageRequest request,
        CancellationToken cancellationToken = default);
    Task<DeleteBaggageServiceResult> DeleteAsync(int bagNumber, CancellationToken cancellationToken = default);
}
