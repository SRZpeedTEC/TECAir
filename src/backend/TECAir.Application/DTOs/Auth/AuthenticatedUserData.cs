namespace TECAir.Application.DTOs.Auth;

// Modelo interno del flujo de autenticacion. Trae password_hash solo hasta el
// servicio para verificar credenciales, pero no se devuelve directamente al cliente.
public class AuthenticatedUserData
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsStudent { get; set; }
    public string? CollegeName { get; set; }
    public string? UserCarnet { get; set; }
    public int? Miles { get; set; }
}
