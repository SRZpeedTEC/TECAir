namespace TECAir.Domain.Entities;

public class User
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Lname { get; set; } = string.Empty;
    public string PhoneNum { get; set; } = string.Empty;
    public string Role { get; set; } = "CLIENT";
}
