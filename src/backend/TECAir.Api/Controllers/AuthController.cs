using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Auth;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Controller dedicado a autenticacion. Mantiene el login separado de la
// administracion de usuarios y no realiza consultas SQL ni validacion de hashes.
[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    // POST /api/auth/login
    // Recibe credenciales, delega al servicio y traduce el resultado a HTTP.
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(request, cancellationToken);

        if (result.IsSuccess)
        {
            return Ok(result.User);
        }

        if (result.IsValidationError)
        {
            return BadRequest(new { message = result.ErrorMessage });
        }

        return Unauthorized(new { message = result.ErrorMessage });
    }
}
