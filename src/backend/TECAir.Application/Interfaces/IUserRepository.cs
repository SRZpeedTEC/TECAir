using TECAir.Application.DTOs.Users;

namespace TECAir.Application.Interfaces;

public interface IUserRepository
{
    Task<UserResponse?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default);
}
