using TECAir.Application.DTOs.Auth;

namespace TECAir.Application.Interfaces;

// Contrato del flujo de autenticacion. Se mantiene separado de usuarios para
// que /api/auth/login no mezcle responsabilidades con /api/users.
public interface IAuthService
{
    Task<LoginServiceResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
}
