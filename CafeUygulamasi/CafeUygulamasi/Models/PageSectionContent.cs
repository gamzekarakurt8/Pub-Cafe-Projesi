namespace CafeUygulamasi.Models
{
	public class PageSectionContent
	{
		public string Id { get; set; } = Guid.NewGuid().ToString();
		public string PageKey { get; set; } = string.Empty;
		public string Title { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public string ImageUrl { get; set; } = string.Empty;
		public List<string> Tags { get; set; } = [];
	}

	public static class PageSectionKeys
	{
		public const string LandingPage = "landing-page";
		public const string Menu = "menu";
		public const string Branches = "branches";
		public const string Contact = "contact";
	}
}
