namespace TECAir.Application.DTOs.Users;

// DTO de salida para devolver datos de usuario a la API.
// Incluye informacion de estudiante cuando existe la fila relacionada.
public class UserResponse
{
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PhoneNum { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsStudent { get; set; }
    public string? CollegeName { get; set; }
    public string? UserCarnet { get; set; }
    public int? Miles { get; set; }
}
