using TECAir.Application.DTOs.Users;

namespace TECAir.Application.Interfaces;

// Contrato que aisla la persistencia de usuarios de la capa de aplicacion.
public interface IUserRepository
{
    // Consulta un usuario por correo electronico.
    Task<UserResponse?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    // Inserta un usuario y devuelve la representacion usada por la API.
    Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default);

    // Verifica existencia sin traer toda la informacion del usuario.
    Task<bool> UserExistsAsync(string email, CancellationToken cancellationToken = default);

    // Evita asignar a un estudiante un carnet que pertenece a otro usuario.
    Task<bool> UserCarnetBelongsToAnotherStudentAsync(
        string email,
        string userCarnet,
        CancellationToken cancellationToken = default);

    // Verifica si existen reservaciones que impiden borrar el usuario.
    Task<bool> UserHasReservationsAsync(string email, CancellationToken cancellationToken = default);

    // Actualiza datos de app_user y sincroniza la fila opcional en student.
    Task<UserResponse> UpdateAsync(
        string email,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default);

    // Borra el usuario identificado por email.
    Task DeleteAsync(string email, CancellationToken cancellationToken = default);
}
