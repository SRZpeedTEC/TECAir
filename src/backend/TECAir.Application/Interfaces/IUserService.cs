using TECAir.Application.DTOs.Users;

namespace TECAir.Application.Interfaces;

public interface IUserService
{
    Task<UserResponse?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    Task<CreateUserServiceResult> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default);
}
