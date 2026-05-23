using System.Text.RegularExpressions;
using TECAir.Application.DTOs.Passengers;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de aplicacion para pasajeros.
// Aqui viven las validaciones del caso de uso, no en el controller ni en SQL.
public class PassengerService(IPassengerRepository passengerRepository) : IPassengerService
{
    private static readonly DateOnly MinimumBirthday = new(1900, 1, 1);
    private static readonly Regex PassportIdRegex = new(
        "^[A-Za-z0-9-]+$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex NameRegex = new(
        @"^[\p{L}\p{M}][\p{L}\p{M} '-]*$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

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

        var passportId = request.PassportId.Trim();
        if (passportId.Length is < 5 or > 30)
        {
            return "Passport id must be between 5 and 30 characters.";
        }

        if (!PassportIdRegex.IsMatch(passportId))
        {
            return "Passport id can only contain letters, numbers and hyphens.";
        }

        if (request.Birthday == default)
        {
            return "Birthday is required.";
        }

        if (request.Birthday < MinimumBirthday)
        {
            return "Birthday cannot be before 1900-01-01.";
        }

        if (request.Birthday > DateOnly.FromDateTime(DateTime.Today))
        {
            return "Birthday cannot be after the current date.";
        }

        if (string.IsNullOrWhiteSpace(request.Gender))
        {
            return "Gender is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Name is required.";
        }

        var name = request.Name.Trim();
        if (!NameRegex.IsMatch(name))
        {
            return "Name can only contain letters, spaces, accents, hyphens and apostrophes.";
        }

        if (string.IsNullOrWhiteSpace(request.Lname))
        {
            return "Last name is required.";
        }

        var lastName = request.Lname.Trim();
        if (!NameRegex.IsMatch(lastName))
        {
            return "Last name can only contain letters, spaces, accents, hyphens and apostrophes.";
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
            PassportId = NormalizePassportId(request.PassportId),
            Birthday = request.Birthday,
            Gender = NormalizeGender(request.Gender)!,
            Name = request.Name.Trim(),
            Lname = request.Lname.Trim()
        };
    }

    private static string NormalizePassportId(string passportId)
    {
        return passportId.Trim().ToUpperInvariant();
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
