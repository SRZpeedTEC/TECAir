using TECAir.Application.DTOs.Users;

namespace TECAir.Application.Interfaces;

// Contrato que aisla la persistencia de usuarios de la capa de aplicacion.
public interface IUserRepository
{
    // Consulta un usuario por correo electronico.
    Task<UserResponse?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    // Inserta un usuario y devuelve la representacion usada por la API.
    Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default);
}
