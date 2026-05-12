namespace TECAir.Application.DTOs.Users;

// DTO que representa el JSON recibido para actualizar un usuario.
// El email no forma parte del body porque es la llave primaria y se toma de la ruta.
public class UpdateUserRequest
{
    public string Password { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Minit { get; set; }
    public string Lname { get; set; } = string.Empty;
    public string PhoneNum { get; set; } = string.Empty;
    public string Role { get; set; } = "CLIENT";

    public bool IsStudent { get; set; }

    public string? UserCarnet { get; set; }
    public string? CollegeName { get; set; }
}
