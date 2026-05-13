using TECAir.Application.DTOs.Users;

namespace TECAir.Application.Interfaces;

// Contrato de casos de uso de usuarios que consume el controller.
public interface IUserService
{
    // Obtiene un usuario por correo si existe.
    Task<UserResponse?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    // Crea un usuario aplicando validaciones de aplicacion.
    Task<CreateUserServiceResult> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default);

    // Actualiza datos editables del usuario identificado por email.
    Task<UpdateUserServiceResult> UpdateAsync(
        string email,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default);

    // Elimina un usuario cuando las reglas de negocio lo permiten.
    Task<DeleteUserServiceResult> DeleteAsync(string email, CancellationToken cancellationToken = default);
}
