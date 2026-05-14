using TECAir.Application.DTOs.Passengers;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de aplicacion para pasajeros.
// Aqui viven las validaciones del caso de uso, no en el controller ni en SQL.
public class PassengerService(IPassengerRepository passengerRepository) : IPassengerService
{
    public async Task<CreatePassengerServiceResult> CreateAsync(
        CreatePassengerRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateCreatePassengerRequest(request);
        if (validationError is not null)
        {
            return CreatePassengerServiceResult.ValidationError(validationError);
        }

        var normalizedRequest = NormalizeCreatePassengerRequest(request);
        if (await passengerRepository.ExistsAsync(normalizedRequest.PassportId, cancellationToken))
        {
            return CreatePassengerServiceResult.Conflict(
                $"Passenger '{normalizedRequest.PassportId}' already exists.");
        }

        var passenger = await passengerRepository.CreateAsync(normalizedRequest, cancellationToken);
        return CreatePassengerServiceResult.Success(passenger);
    }

    // Valida los campos requeridos antes de intentar insertar en la base.
    private static string? ValidateCreatePassengerRequest(CreatePassengerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PassportId))
        {
            return "Passport id is required.";
        }

        if (request.Birthday == default)
        {
            return "Birthday is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Gender))
        {
            return "Gender is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Lname))
        {
            return "Last name is required.";
        }

        var gender = NormalizeGender(request.Gender);
        if (gender is null)
        {
            return "Gender must be M, F, O, MALE, FEMALE or OTHER.";
        }

        return null;
    }

    // La base guarda genero con palabras completas; la API acepta tambien abreviaturas.
    private static CreatePassengerRequest NormalizeCreatePassengerRequest(CreatePassengerRequest request)
    {
        return new CreatePassengerRequest
        {
            PassportId = request.PassportId.Trim(),
            Birthday = request.Birthday,
            Gender = NormalizeGender(request.Gender)!,
            Name = request.Name.Trim(),
            Lname = request.Lname.Trim()
        };
    }

    private static string? NormalizeGender(string gender)
    {
        return gender.Trim().ToUpperInvariant() switch
        {
            "M" or "MALE" => "MALE",
            "F" or "FEMALE" => "FEMALE",
            "O" or "OTHER" => "OTHER",
            _ => null
        };
    }
}
