namespace TECAir.Application.DTOs.Auth;

// Respuesta publica del login. No incluye password_hash porque ese dato solo
// existe para validacion interna y nunca debe salir por la API.
public class LoginResponse
{
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsStudent { get; set; }
    public string? CollegeName { get; set; }
    public string? UserCarnet { get; set; }
    public int? Miles { get; set; }
    public string Message { get; set; } = string.Empty;
}
