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
}
