namespace CafeUygulamasi.Models
{
	public class ContactInfo
	{
		public string Id { get; set; } = Guid.NewGuid().ToString();
		public string Phone { get; set; }
		public string Email { get; set; }
		public ContactSocial Social { get; set; } = new();
		public ContactOrderLinks OrderLinks { get; set; } = new();
	}

	public class ContactSocial
	{
		public bool HasValue { get; set; } = true;
		public string? Instagram { get; set; }
		public string? X { get; set; }
		public string? Tiktok { get; set; }
		public string? Facebook { get; set; }
		public string? Whatsapp { get; set; }
	}

	public class ContactOrderLinks
	{
		public bool HasValue { get; set; } = true;
		public string? Yemeksepeti { get; set; }
		public string? Getir { get; set; }
		public string? TrendyolYemek { get; set; }
	}
}
