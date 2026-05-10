using TECAir.Application.DTOs.Users;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// El servicio contiene reglas de aplicacion.
// Aqui se validan los datos antes de llamar al repositorio, para que el controller
// no tenga logica de negocio y el repositorio solo se encargue de SQL.
public class UserService(IUserRepository userRepository) : IUserService
{
    // En este caso no hay reglas extra para consultar; simplemente se delega
    // al repositorio que sabe como leer desde PostgreSQL.
    public Task<UserResponse?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return userRepository.GetByEmailAsync(email, cancellationToken);
    }

    // Este metodo representa el caso de uso "crear usuario".
    // Primero valida el request; si todo esta bien, pide al repositorio insertar en BD.
    public async Task<CreateUserServiceResult> CreateAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateCreateUserRequest(request);
        if (validationError is not null)
        {
            return CreateUserServiceResult.ValidationError(validationError);
        }

        var user = await userRepository.CreateAsync(request, cancellationToken);
        return CreateUserServiceResult.Success(user);
    }

    // Caso de uso "actualizar usuario".
    // El email viene de la ruta para que la llave primaria no pueda cambiarse desde el JSON.
    public async Task<UpdateUserServiceResult> UpdateAsync(
        string email,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return UpdateUserServiceResult.ValidationError("Email route parameter is required.");
        }

        var validationError = ValidateUpdateUserRequest(request);
        if (validationError is not null)
        {
            return UpdateUserServiceResult.ValidationError(validationError);
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var normalizedRequest = NormalizeUpdateUserRequest(request);

        if (!await userRepository.UserExistsAsync(normalizedEmail, cancellationToken))
        {
            return UpdateUserServiceResult.NotFound($"User '{normalizedEmail}' was not found.");
        }

        if (normalizedRequest.IsStudent &&
            await userRepository.UserCarnetBelongsToAnotherStudentAsync(
                normalizedEmail,
                normalizedRequest.UserCarnet!,
                cancellationToken))
        {
            return UpdateUserServiceResult.Conflict(
                $"Student carnet '{normalizedRequest.UserCarnet}' already belongs to another student.");
        }

        var user = await userRepository.UpdateAsync(normalizedEmail, normalizedRequest, cancellationToken);
        return UpdateUserServiceResult.Success(user);
    }

    // Caso de uso "eliminar usuario".
    // No se borran reservaciones manualmente: si existen, la cuenta se conserva por integridad historica.
    public async Task<DeleteUserServiceResult> DeleteAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return DeleteUserServiceResult.NotFound("User was not found.");
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (!await userRepository.UserExistsAsync(normalizedEmail, cancellationToken))
        {
            return DeleteUserServiceResult.NotFound($"User '{normalizedEmail}' was not found.");
        }

        if (await userRepository.UserHasReservationsAsync(normalizedEmail, cancellationToken))
        {
            return DeleteUserServiceResult.Conflict(
                "The user cannot be deleted because it already has reservations.");
        }

        await userRepository.DeleteAsync(normalizedEmail, cancellationToken);
        return DeleteUserServiceResult.Success();
    }

    // Validaciones propias de la aplicacion.
    // No dependen de HTTP ni de PostgreSQL: son reglas que el sistema quiere cumplir
    // antes de intentar guardar la informacion.
    private static string? ValidateCreateUserRequest(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return "Email is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return "Password is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Lname))
        {
            return "Last name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.PhoneNum))
        {
            return "Phone number is required.";
        }

        var role = request.Role.Trim().ToUpperInvariant();
        // La tabla app_user tambien tiene esta restriccion, pero validarla aqui
        // permite responder con un mensaje mas claro antes de llegar a la base.
        if (role is not "CLIENT" and not "ADMIN")
        {
            return "Role must be CLIENT or ADMIN.";
        }

        // Si el usuario se marca como estudiante, tambien debe traer los datos
        // necesarios para crear la fila relacionada en la tabla student.
        if (request.IsStudent &&
            (string.IsNullOrWhiteSpace(request.UserCarnet) || string.IsNullOrWhiteSpace(request.CollegeName)))
        {
            return "Student users require UserCarnet and CollegeName.";
        }

        return null;
    }

    // Valida los campos editables. La llave primaria se omite a proposito del DTO.
    private static string? ValidateUpdateUserRequest(UpdateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Lname))
        {
            return "Last name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.PhoneNum))
        {
            return "Phone number is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Role))
        {
            return "Role is required.";
        }

        var role = request.Role.Trim().ToUpperInvariant();
        if (role is not "CLIENT" and not "ADMIN")
        {
            return "Role must be CLIENT or ADMIN.";
        }

        if (request.IsStudent &&
            (string.IsNullOrWhiteSpace(request.UserCarnet) || string.IsNullOrWhiteSpace(request.CollegeName)))
        {
            return "Student users require UserCarnet and CollegeName.";
        }

        return null;
    }

    // Normaliza el body antes de pasar al repositorio para evitar reglas repetidas en SQL.
    private static UpdateUserRequest NormalizeUpdateUserRequest(UpdateUserRequest request)
    {
        return new UpdateUserRequest
        {
            Password = request.Password?.Trim() ?? string.Empty,
            Name = request.Name.Trim(),
            Minit = string.IsNullOrWhiteSpace(request.Minit) ? null : request.Minit.Trim(),
            Lname = request.Lname.Trim(),
            PhoneNum = request.PhoneNum.Trim(),
            Role = request.Role.Trim().ToUpperInvariant(),
            IsStudent = request.IsStudent,
            UserCarnet = string.IsNullOrWhiteSpace(request.UserCarnet) ? null : request.UserCarnet.Trim(),
            CollegeName = string.IsNullOrWhiteSpace(request.CollegeName) ? null : request.CollegeName.Trim()
        };
    }
}
