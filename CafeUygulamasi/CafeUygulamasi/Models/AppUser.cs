namespace CafeUygulamasi.Models
{
	public class AppUser
	{
		public string Id { get; set; } = Guid.NewGuid().ToString();
		public string Username { get; set; }
		public string PasswordHash { get; set; }
		public string Role { get; set; } = "User";
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
	}
}
