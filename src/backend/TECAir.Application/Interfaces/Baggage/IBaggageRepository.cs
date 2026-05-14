using TECAir.Application.DTOs.Baggages;

namespace TECAir.Application.Interfaces;

// Contrato que aisla la persistencia de maletas de la capa de aplicacion.
public interface IBaggageRepository
{
    Task<BaggageResponse?> GetByBagNumberAsync(int bagNumber, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BaggageResponse>> GetByConfirmationNumberAsync(
        int confirmationNumber,
        CancellationToken cancellationToken = default);
    Task<BaggageResponse> CreateAsync(CreateBaggageRequest request, CancellationToken cancellationToken = default);
    Task<BaggageResponse> UpdateAsync(
        int bagNumber,
        UpdateBaggageRequest request,
        CancellationToken cancellationToken = default);
    Task DeleteAsync(int bagNumber, CancellationToken cancellationToken = default);
    Task<bool> BaggageExistsAsync(int bagNumber, CancellationToken cancellationToken = default);
    Task<bool> CheckInExistsAsync(int confirmationNumber, CancellationToken cancellationToken = default);
}
