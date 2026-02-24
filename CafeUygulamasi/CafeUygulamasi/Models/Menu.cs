namespace CafeUygulamasi.Models
{
	public class Menu
	{
		public string Id { get; set; } = Guid.NewGuid().ToString();
		public string Title { get; set; }
		public string Description { get; set; }
		public string ImageUrl { get; set; }
		public bool Active { get; set; }

		public List<Category> Categories { get; set; } = new();
	}
}
