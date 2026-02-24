namespace CafeUygulamasi.Models
{
	public class ContactRequest
	{
		public string Id { get; set; } = Guid.NewGuid().ToString();
		public string FullName { get; set; }
		public string PhoneOrEmail { get; set; }
		public string Type { get; set; }
		public string Message { get; set; }
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	}
}
