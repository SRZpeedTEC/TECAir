namespace TECAir.Application.DTOs.Users;

// DTO que representa el JSON recibido para crear un usuario.
// Los campos de estudiante son opcionales y se validan solo cuando IsStudent es true.
public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Lname { get; set; } = string.Empty;
    public string PhoneNum { get; set; } = string.Empty;
    public string Role { get; set; } = "CLIENT";

    public bool IsStudent { get; set; }

    public string? UserCarnet { get; set; }
    public string? CollegeName { get; set; }
}
