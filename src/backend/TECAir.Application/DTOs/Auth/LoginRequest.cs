namespace TECAir.Application.DTOs.Auth;

// DTO publico para recibir las credenciales que envia el cliente al iniciar sesion.
public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
