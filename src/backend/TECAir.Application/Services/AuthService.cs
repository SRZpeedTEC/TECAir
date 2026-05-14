using TECAir.Application.DTOs.Auth;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de autenticacion: valida credenciales y arma la respuesta publica.
// No conoce HTTP ni SQL; coordina repositorio y hashing.
public class AuthService(IUserRepository userRepository, IPasswordHasher passwordHasher) : IAuthService
{
    private const string InvalidCredentialsMessage = "Invalid email or password.";

    public async Task<LoginServiceResult> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return LoginServiceResult.ValidationError("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return LoginServiceResult.ValidationError("Password is required.");
        }
        

        var user = await userRepository.GetForLoginAsync(request.Email.Trim(), cancellationToken);
        if (user is null)
        {
            // Se usa un mensaje generico para no revelar si el correo existe.
            return LoginServiceResult.Unauthorized(InvalidCredentialsMessage);
        }

        if (!passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            // La causa exacta del fallo se mantiene privada por seguridad.
            return LoginServiceResult.Unauthorized(InvalidCredentialsMessage);
        }

        return LoginServiceResult.Success(new LoginResponse
        {
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            IsStudent = user.IsStudent,
            CollegeName = user.CollegeName,
            UserCarnet = user.UserCarnet,
            Miles = user.Miles,
            Message = "Login successful."
        });
    }
}
